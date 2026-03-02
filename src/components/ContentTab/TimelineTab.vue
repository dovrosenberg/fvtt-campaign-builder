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
- Services/API: CalendarAdapter

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
  import { ref, onMounted, computed, onUnmounted, PropType } from 'vue';
  import type { Timeline } from 'vis-timeline';

  // local imports
  import { localize } from '@/utils/game';
  import { useContentState } from '@/composables/useContentState';
  import { CalendariaNote, TimelineConfig, TimelineFilters, TimelineItem, WindowTabType, TIMELINE_DEFAULT, TIMELINE_DEFAULT_FILTERS, DeepPartial } from '@/types';
  import CalendarAdapter from '@/utils/calendar/calendarAdapter';
  import calendariaMomentFactory from '@/utils/calendar/calendariaMoment';

  // local components
  import TimelineFilterPanel from './TimelineFilterPanel.vue';

  // types
  import { CalendariaDate } from '@/types';

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
  const timelineInstance = ref<Timeline | null>(null);

  ////////////////////////////////
  // computed data
  const availableCategories = computed(() => CalendarAdapter.getCategories().map(cat=>cat.id));

  const filters = computed(() => currentTimelineConfig.value?.filters ?? TIMELINE_DEFAULT_FILTERS);

  const currentTimelineConfig = computed((): TimelineConfig | null => {
    const doc = currentDocument()?.value;
    if (!doc) {
      return null;
    }

    return doc.timelines[0] || TIMELINE_DEFAULT;
  });

  // Get the document based on content type
  // returns refs
  const currentDocument = () => {
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
   * Filter notes based on the current filter criteria.
   * @param notes - Array of Calendaria notes
   * @param filterCriteria - Filter criteria
   * @returns Filtered notes
   */
  const filterNotes = (notes: CalendariaNote[], filterCriteria: TimelineFilters): CalendariaNote[] => {
    return notes.filter(note => {
      // Category filter
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        if (!filterCriteria.categories.includes(note.category)) {
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
      start: CalendarAdapter.calendariaToJS(note.startDate),
      end: note.endDate ? CalendarAdapter.calendariaToJS(note.endDate) : undefined,
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

  const updateVisibleRange = (start: CalendariaDate, end: CalendariaDate): void => {
    // this needs to be debounced to prevent excessive updates
    clearTimeout(rangeDebounceTimer);

    rangeDebounceTimer = setTimeout(() => {
      void saveTimelineConfig({filters: {
        visibleRange: {
          start: start,
          end: end,
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
    if (timelineInstance.value) {
      timelineInstance.value.destroy();
      timelineInstance.value = null;
    }

    isTimelineLoading.value = true;

    try {
      // dynamically import vis-timeline (CSS is bundled via vite config)
      const { Timeline } = await import('vis-timeline');

      // Determine initial visible range - use persisted range or default
      // Uses CalendarAdapter for calendar-aware date conversion
      // Default to ±50 years around current game date to match mock data range
      const currentDate = CalendarAdapter.getCurrentDate();
      const currentYear = currentDate.year;
      
      const initialStart = filters.value.visibleRange
        ? CalendarAdapter.calendariaToJS(filters.value.visibleRange.start)
        : CalendarAdapter.calendariaToJS({ year: currentYear - 50, month: 0, dayOfMonth: 0 });
      const initialEnd = filters.value.visibleRange
        ? CalendarAdapter.calendariaToJS(filters.value.visibleRange.end)
        : CalendarAdapter.calendariaToJS({ year: currentYear + 50, month: 0, dayOfMonth: 0 });

      // get notes from Calendaria
      // Use a wide date range centered on current date to get all relevant notes
      const allNotes = CalendarAdapter.getNotesInRange(
        { year: currentYear - 100, month: 0, dayOfMonth: 0 }, 
        { year: currentYear + 100, month: 0, dayOfMonth: 0 }
      );

      // Apply filters
      const filteredNotes = filterNotes(allNotes, filters.value);

      // Convert to timeline items
      const items = notesToTimelineItems(filteredNotes);
      
      // Debug: log item date range
      if (items.length > 0) {
        const itemDates = items.map(i => i.start.getTime());
        const minItem = Math.min(...itemDates);
        const maxItem = Math.max(...itemDates);
        console.log('Timeline items:', items.length, 'date range:', new Date(minItem), '-', new Date(maxItem));
        console.log('Visible range:', initialStart, '-', initialEnd);
        console.log('Sample item:', items[0]);
      }
            
      // Get snap function for the current zoom level
      const zoomLevels = CalendarAdapter.getZoomLevels();
      const defaultZoomLevel = zoomLevels.length > 0 ? zoomLevels[zoomLevels.length - 1] : null;
      const snapUnit = defaultZoomLevel?.snapUnit ?? 'day';
      
      // Get the JS date for the "current date" line marker
      const currentDateJs = CalendarAdapter.calendariaToJS(currentDate);

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
        // Inject calendar-aware moment factory for tick placement and formatting
        // Type assertion needed: vis-timeline expects Moment but CalendariaMoment is runtime-compatible
        moment: calendariaMomentFactory as never,
        margin: {
          item: {
            horizontal: 10,
            vertical: 5,
          },
        },
        // Enable snapping to calendar units for drag/resize
        snap: CalendarAdapter.createSnapFunction(snapUnit),

        // Disable default current time line (uses real-world time, not game time)
        showCurrentTime: false,

        // zoomMin = 1 day
        zoomMin: 1000*60*60*24,

        // zoomMax = ~1 million years (should probably tie to eras)
        zoomMax: 1000*60*60*24*365*1000000,
      };

      timelineInstance.value = new Timeline(
        timelineRef.value,
        items,
        options
      );

      // Add custom time marker at the Calendaria current date (game world time)
      timelineInstance.value.addCustomTime(currentDateJs, 'currentDate');
      timelineInstance.value.setCustomTimeTitle('Current Date', 'currentDate');

      // Listen to range change events to persist view state
      timelineInstance.value.on('rangechanged', (properties: { start: Date; end: Date }) => {
        // Convert JS Dates back to Calendaria dates using the active calendar
        const start = CalendarAdapter.jsToCalendaria(properties.start);
        const end = CalendarAdapter.jsToCalendaria(properties.end);
        updateVisibleRange(start, end);
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
    const doc = currentDocument()?.value;
    if (!doc) {
      return;
    }

    // Update or add the config in the timelines array
    // For now, just store one timeline per document (first one)
    const existingFilters = doc.timelines[0]?.filters ?? TIMELINE_DEFAULT_FILTERS;
    const newFilters = config.filters;
    
    // Filter out undefined values from categories array if present
    const inputCategories = newFilters?.categories?.filter((c): c is string => c != null);
    
    // Only use visibleRange if it has both start and end fully defined
    const inputVisibleRange = newFilters?.visibleRange;
    const validVisibleRange = inputVisibleRange?.start && inputVisibleRange?.end &&
      inputVisibleRange.start.year != null && inputVisibleRange.start.month != null && inputVisibleRange.start.dayOfMonth != null &&
      inputVisibleRange.end.year != null && inputVisibleRange.end.month != null && inputVisibleRange.end.dayOfMonth != null
      ? {
          start: { year: inputVisibleRange.start.year, month: inputVisibleRange.start.month, dayOfMonth: inputVisibleRange.start.dayOfMonth },
          end: { year: inputVisibleRange.end.year, month: inputVisibleRange.end.month, dayOfMonth: inputVisibleRange.end.dayOfMonth },
        }
      : existingFilters.visibleRange;
    
    const newConfig: TimelineConfig = {
      ...TIMELINE_DEFAULT,
      ...(doc.timelines[0] ?? TIMELINE_DEFAULT),
      ...config,
      filters: {
        categories: inputCategories ?? existingFilters.categories,
        textSearch: newFilters?.textSearch ?? existingFilters.textSearch,
        gmOnly: newFilters?.gmOnly ?? existingFilters.gmOnly,
        referencedUuid: newFilters?.referencedUuid ?? existingFilters.referencedUuid,
        visibleRange: validVisibleRange,
      },
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
    if (timelineInstance.value) {
      timelineInstance.value.destroy();
      timelineInstance.value = null;
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