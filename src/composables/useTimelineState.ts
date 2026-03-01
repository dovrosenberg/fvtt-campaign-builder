/**
 * Composable for managing timeline state and vis-timeline integration.
 * Handles dynamic loading of vis-timeline, note filtering, and timeline rendering.
 * Each panel that renders a timeline creates its own instance via useTimelineState(),
 * so multiple timelines can be displayed side-by-side with independent state.
 */

import { ref, computed, inject, type Ref } from 'vue';
import type { Timeline } from 'vis-timeline';

import { TAB_PANEL_STATE_KEY } from '@/composables/useTabPanelState';
import { CalendariaNote, TimelineConfig, TimelineFilters, TimelineItem, TIMELINE_DEFAULT_FILTERS } from '@/types';
import MockCalendariaService from '@/utils/mockCalendaria';

export interface TimelineState {
  // reactive state
  currentContainer: Ref<HTMLElement | null>;
  currentTimeline: Ref<Timeline | null>;
  isTimelineLoading: Ref<boolean>;
  isFilterPanelExpanded: Ref<boolean>;
  filters: Ref<TimelineFilters>;
  availableCategories: Ref<string[]>;
  filterSummary: Ref<string>;

  // action methods
  refreshTimeline(): Promise<void>;
  setContainer(container: HTMLElement | null): void;
}

/**
 * Convert Calendaria date components to a JavaScript Date.
 * @param date - Calendaria date components
 * @returns JavaScript Date object
 */
const calendariaDateToDate = (date: { year: number; month: number; dayOfMonth: number; hour?: number; minute?: number }): Date => {
  return new Date(
    date.year,
    date.month,
    date.dayOfMonth,
    date.hour ?? 0,
    date.minute ?? 0
  );
};

/**
 * Filter notes based on the current filter criteria.
 * @param notes - Array of Calendaria notes
 * @param filters - Filter criteria
 * @returns Filtered notes
 */
const filterNotes = (notes: CalendariaNote[], filters: TimelineFilters): CalendariaNote[] => {
  return notes.filter(note => {
    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.some(cat => note.categories.includes(cat))) {
        return false;
      }
    }

    // Text search filter
    if (filters.textSearch) {
      const searchLower = filters.textSearch.toLowerCase();
      const nameMatch = note.name.toLowerCase().includes(searchLower);
      const contentMatch = note.content.toLowerCase().includes(searchLower);
      if (!nameMatch && !contentMatch) {
        return false;
      }
    }

    // GM-only filter
    if (filters.gmOnly && !note.gmOnly) {
      return false;
    }

    // Referenced UUID filter - regex match on content
    if (filters.referencedUuid) {
      const uuidPattern = new RegExp(`@UUID\\[${filters.referencedUuid}\\]`, 'i');
      if (!uuidPattern.test(note.content)) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Convert Calendaria notes to vis-timeline items.
 * @param notes - Array of Calendaria notes
 * @returns Array of timeline items
 */
const notesToTimelineItems = (notes: CalendariaNote[]): TimelineItem[] => {
  return notes.map(note => ({
    id: note.id,
    content: `<i class="${note.icon}" style="margin-right: 4px;"></i>${note.name}`,
    start: calendariaDateToDate(note.startDate),
    end: note.endDate ? calendariaDateToDate(note.endDate) : undefined,
    type: note.endDate ? 'range' : 'point',
    className: `timeline-event`,
    style: `background-color: ${note.color}; border-color: ${note.color};`,
  }));
};


/**
 * Creates panel-scoped timeline state and methods.
 * Must be called inside a component that is a descendant of a TabPanel.
 * Registers itself with the Pinia store so external callers can delegate to the focused panel's instance.
 *
 * @param timelineConfig - Optional initial timeline configuration
 * @returns A TimelineState with per-panel vis-timeline state and all timeline methods.
 */
export function useTimelineState(): TimelineState {
  // per-timeline state
  const currentContainer = ref<HTMLElement | null>(null);
  const currentTimeline = ref<Timeline | null>(null);
  const isTimelineLoading = ref<boolean>(false);
  const isFilterPanelExpanded = ref<boolean>(false);

  // filters - initialize from config or defaults
  const filters = ref<TimelineFilters>(timelineConfig?.filters ?? {} as TimelineFilters);

  // available categories from Calendaria
  const availableCategories = ref<string[]>([]);

  /** Load categories from Calendaria */
  const loadCategories = async (): Promise<void> => {
    availableCategories.value = MockCalendariaService.getCategories();
  };

  /**
   * Update the visible range in filters when the timeline view changes.
   * @param start - Start date of visible range
   * @param end - End date of visible range
   */
  const updateVisibleRange = (start: Date, end: Date): void => {
    filters.value = {
      ...filters.value,
      visibleRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  };

  /** Generate the timeline from current notes and filters */
  const generateTimeline = async (): Promise<void> => {
    if (!currentContainer.value) {
      return;
    }

    if (isTimelineLoading.value) {
      return;
    }

    // destroy the old timeline to prevent memory leaks
    if (currentTimeline.value) {
      currentTimeline.value.destroy();
      currentTimeline.value = null;
    }

    isTimelineLoading.value = true;

    try {
      // dynamically import vis-timeline (CSS is bundled via vite config)
      const { Timeline } = await import('vis-timeline');

      // get notes from Calendaria (mock for POC)
      // Use a wide date range to get all notes
      const allNotes = MockCalendariaService.getRecurrentNotesInRange(
        { year: 1490, month: 0, dayOfMonth: 1 },
        { year: 1500, month: 11, dayOfMonth: 31 }
      );

      // Apply filters
      const filteredNotes = filterNotes(allNotes, filters.value);

      // Convert to timeline items
      const items = notesToTimelineItems(filteredNotes);

      // Determine initial visible range - use persisted range or default
      const initialStart = filters.value.visibleRange?.start
        ? new Date(filters.value.visibleRange.start)
        : new Date(1492, 0, 1);
      const initialEnd = filters.value.visibleRange?.end
        ? new Date(filters.value.visibleRange.end)
        : new Date(1493, 0, 1);

      // Timeline options - vis-timeline can accept a plain array instead of DataSet
      const options = {
        verticalScroll: true,
        horizontalScroll: true,
        zoomable: true,
        moveable: true,
        orientation: { axis: 'bottom' },
        height: '100%',
        // Use persisted visible range or default
        start: initialStart,
        end: initialEnd,
        margin: {
          item: {
            horizontal: 10,
            vertical: 5,
          },
        },
        format: {
          minorLabels: {
            weekday: 'ddd D',
            day: 'D',
            week: 'w',
            month: 'MMM',
            year: 'YYYY',
          },
          majorLabels: {
            weekday: 'MMMM YYYY',
            day: 'MMMM YYYY',
            week: 'MMMM YYYY',
            month: 'YYYY',
            year: '',
          },
        },
      };

      currentTimeline.value = new Timeline(
        currentContainer.value,
        items,
        options
      );

      // Listen to range change events to persist view state
      currentTimeline.value.on('rangechanged', (properties: { start: Date; end: Date }) => {
        updateVisibleRange(properties.start, properties.end);
      });
    } catch (error) {
      isTimelineLoading.value = false;
      throw error;
    }

    isTimelineLoading.value = false;
  };

  /** Refresh the timeline with current data */
  const refreshTimeline = async (): Promise<void> => {
    await generateTimeline();
  };

  /** Set the container element for the timeline */
  const setContainer = (container: HTMLElement | null): void => {
    currentContainer.value = container;
    if (container) {
      generateTimeline();
    }
  };

  // Load categories on initialization
  loadCategories();

  ///////////////////////////////
  // registration with store facade
  const timelineState: TimelineState = {
    // reactive state
    currentContainer,
    currentTimeline,
    isTimelineLoading,
    isFilterPanelExpanded,
    filters,
    availableCategories,
    filterSummary,

    // action methods
    refreshTimeline,
    setContainer,
  };

  return timelineState;
}
