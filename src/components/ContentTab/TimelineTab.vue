<!--
TimelineTab: Timeline display component

Purpose
- Displays a vis-timeline visualization of Calendaria notes with filtering capabilities

Responsibilities
- Render the timeline visualization using vis-timeline
- Manage timeline state and filters
- Handle filter changes and timeline refresh

Props
- windowTabType: WindowTabType, type of document (Campaign, Arc, Session, Entry, Setting)

Emits
- None

Slots
- None

Dependencies
- Stores: None
- Composables: useContentState
- Services/API: MockCalendariaService

-->

<template>
  <div class="timeline-tab flexcol">

    <TimelineFilterPanel
      :filters="filters"
      :is-filter-panel-expanded="isFilterPanelExpanded"
      :available-categories="availableCategories"
      @update-filters="onUpdateFilters"
      @toggle-panel="onTogglePanel"
    />

    <!-- Timeline Container -->
    <div class="timeline-container flexcol">
      <div v-if="isTimelineLoading" class="timeline-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>{{ localize('labels.timeline.loading') }}</span>
      </div>
      <div ref="timelineRef" class="timeline-visualization"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, computed, onUnmounted, watch, PropType } from 'vue';
  import type { Timeline } from 'vis-timeline';

  // local imports
  import { localize } from '@/utils/game';
  import { useContentState } from '@/composables/useContentState';
  import { CalendariaNote, TimelineConfig, TimelineFilters, TimelineItem, WindowTabType, TIMELINE_DEFAULT, TIMELINE_DEFAULT_FILTERS, DeepPartial } from '@/types';
  import MockCalendariaService from '@/utils/mockCalendaria';

  // local components
  import TimelineFilterPanel from './TimelineFilterPanel.vue';

  ////////////////////////////////
  // props
  const props = defineProps({
    windowTabType: {
      type: Number as PropType<WindowTabType>,
      required: true,
    },
  });

  ////////////////////////////////
  // emits
  // (none)

  ////////////////////////////////
  // store
  const { currentCampaign, currentArc, currentSession, currentEntry, currentSetting } = useContentState();

  ////////////////////////////////
  // data
  const timelineRef = ref<HTMLElement | null>(null);

  // Timeline state
  const isTimelineLoading = ref<boolean>(false);
  const isFilterPanelExpanded = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const availableCategories = computed(() => MockCalendariaService.getCategories());

  const filters = computed(() => currentTimeline.value?.filters ?? TIMELINE_DEFAULT_FILTERS);

  const currentTimeline = computed((): Timeline | null => {
    const doc = document()?.value;
    if (!doc) {
      return null;
    }

    return doc.timeline;
  });

  // Get the document based on content type
  // returns refs
  const document = () => {
    switch (props.windowTabType) {
      case WindowTabType.Campaign:
        return currentCampaign;
      case WindowTabType.Arc:
        return currentArc;
      case WindowTabType.Session:
        return currentSession;
      case WindowTabType.Entry:
        return currentEntry;
      case WindowTabType.Setting:
        return currentSetting;
      default:
        return null;
    }
  };

  ////////////////////////////////
  // methods

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
   * @param filterCriteria - Filter criteria
   * @returns Filtered notes
   */
  const filterNotes = (notes: CalendariaNote[], filterCriteria: TimelineFilters): CalendariaNote[] => {
    return notes.filter(note => {
      // Category filter
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        if (!filterCriteria.categories.some(cat => note.categories.includes(cat))) {
          return false;
        }
      }

      // Text search filter
      if (filterCriteria.textSearch) {
        const searchLower = filterCriteria.textSearch.toLowerCase();
        const nameMatch = note.name.toLowerCase().includes(searchLower);
        const contentMatch = note.content.toLowerCase().includes(searchLower);
        if (!nameMatch && !contentMatch) {
          return false;
        }
      }

      // GM-only filter
      if (filterCriteria.gmOnly && !note.gmOnly) {
        return false;
      }

      // Referenced UUID filter - regex match on content
      if (filterCriteria.referencedUuid) {
        const uuidPattern = new RegExp(`@UUID\\[${filterCriteria.referencedUuid}\\]`, 'i');
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
   * Update the visible range in filters when the timeline view changes.
   * @param start - Start date of visible range
   * @param end - End date of visible range
   */
  let rangeDebounceTimer: NodeJS.Timeout | undefined;

  const updateVisibleRange = (start: Date, end: Date): Promise<void> => {
    // this needs to be debounced to prevent excessive updates
    clearTimeout(rangeDebounceTimer);

    rangeDebounceTimer = setTimeout(() => {
      void saveTimelineConfig({filters: {
        visibleRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }});
    }, 500);    
  };

  /**
   * Generate the timeline from current notes and filters.
   */
  const generateTimeline = async (): Promise<void> => {
    if (!timelineRef.value) {
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
        timelineRef.value,
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

  ////////////////////////////////
  // event handlers

  /**
   * Handle filter updates from the filter panel.
   * @param newFilters - The updated filters
   */
  const onUpdateFilters = async (newFilters: TimelineFilters): Promise<void> => {
    await saveTimelineConfig({filters: newFilters});
    await generateTimeline();
  };

  /**
   * Handle filter panel toggle.
   */
  const onTogglePanel = (): void => {
    isFilterPanelExpanded.value = !isFilterPanelExpanded.value;
  };

  /**
   * Save the current timeline config to the document.
   * For anything not provided, uses the current value in the document, 
   *    or the default if there's nothing in the document either.
   */
  const saveTimelineConfig = async (config: DeepPartial<TimelineConfig>): Promise<void> => {
    const doc = document()?.value;
    if (!doc) {
      return;
    }

    // Update or add the config in the timelines array
    // For now, just store one timeline per document (first one)
    const newConfig = {
      ...TIMELINE_DEFAULT,
      ...(doc.timelines[0] ?? {}),
      ...config,
      filters: {
        ...TIMELINE_DEFAULT_FILTERS,
        ...(doc.timelines[0]?.filters ?? {}),
        ...(config.filters ?? {}),
      } 
    };

    doc.timelines = [newConfig];

    await doc.save();
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks

  onMounted(async () => {
    if (timelineRef.value) {
      // Ensure the container has dimensions before initializing
      requestAnimationFrame(() => {
        if (timelineRef.value) {
          generateTimeline();
        }
      });
    }
  });

  onUnmounted(() => {
    // Destroy timeline to prevent memory leaks
    if (currentTimeline.value) {
      currentTimeline.value.destroy();
      currentTimeline.value = null;
    }
  });
</script>

<style lang="scss" scoped>
.timeline-tab {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.timeline-header {
  background-color: var(--fcb-background);
  border-bottom: 1px solid var(--fcb-border);
  flex-shrink: 0;
}

.filter-header {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
  user-select: none;

  &:hover {
    background-color: var(--fcb-hover);
  }
}

.filter-summary {
  align-items: center;
  gap: 0.5rem;

  i {
    color: var(--fcb-primary);
  }

  .filter-text {
    font-size: 0.875rem;
    color: var(--fcb-text-secondary);
  }
}

.toggle-icon {
  color: var(--fcb-text-secondary);
  font-size: 0.75rem;
}

.filter-panel {
  padding: 0.75rem;
  border-top: 1px solid var(--fcb-border);
}

.timeline-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

.timeline-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--fcb-text-secondary);

  i {
    font-size: 1.5rem;
    color: var(--fcb-primary);
  }
}

.timeline-visualization {
  flex: 1;
  min-height: 300px;
  height: 100%;
  background-color: var(--fcb-background);
}
</style>

