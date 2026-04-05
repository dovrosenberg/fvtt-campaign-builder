<!--
TimelineTab: Timeline display component

Purpose
- Displays a vis-timeline visualization of Calendaria notes with filtering capabilities

Responsibilities
- Render the timeline visualization using vis-timeline
- Manage timeline state and filters
- Handle filter changes and timeline refresh

Props
- None

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
      @reset-filters="onResetFilters"
      @reset-range="onResetRange"
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
  import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
  import type { Timeline } from 'vis-timeline';

  // local imports
  import { localize } from '@/utils/game';
  import { useContentState } from '@/composables/useContentState';
  import { CalendariaNote, TimelineConfig, TimelineFilters, TimelineItem, WindowTabType, TIMELINE_DEFAULT, DeepPartial } from '@/types';
  import CalendarAdapter from '@/utils/calendar/calendarAdapter';
  import calendariaMomentFactory from '@/utils/calendar/calendariaMoment';

  // local components
  import TimelineFilterPanel from './TimelineFilterPanel.vue';

  // types
  import { CalendariaDate } from '@/types';
  import { Arc, Campaign, FCBSetting } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  // (none)

  ////////////////////////////////
  // store
  const { currentCampaign, currentArc, currentSession, currentEntry, currentSetting, currentContentId, currentContentType } = useContentState();

  ////////////////////////////////
  // data
  const timelineRef = ref<HTMLElement | null>(null);

  // Timeline state
  const isTimelineLoading = ref<boolean>(false);
  const isFilterPanelExpanded = ref<boolean>(false);
  const timelineInstance = ref<Timeline | null>(null);
  const isSavingConfig = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const availableCategories = computed(() => CalendarAdapter.getCategories().map(cat=>cat.id));

  /**
   * Get default filters based on content type.
   * Settings default to unchecked, all others default to checked.
   */
  const defaultFilters = computed((): TimelineFilters => {
    const shouldDefaultChecked = currentContentType.value !== WindowTabType.Setting;
    return {
      categories: [],
      textSearch: '',
      excludeGMOnly: false,
      referenceEntity: shouldDefaultChecked,
      includeNestedUuids: false,  
      visibleRange: null,
    };
  });

  const filters = computed(() => currentTimelineConfig.value?.filters ?? defaultFilters.value);

  const currentTimelineConfig = computed((): TimelineConfig | null => {
    const doc = currentDocument()?.value;
    if (!doc) {
      return null;
    }

    // Return null if no stored config exists, so filters falls back to defaultFilters
    return doc.timelines[0] ?? null;
  });

  // Get the document based on content type
  // returns refs
  const currentDocument = () => {
    switch (currentContentType.value) {
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
   * Get nested content UUIDs for the current document based on content type.
   * @returns Array of nested UUIDs (empty for sessions or if no current document)
   */
  const getNestedUuids = async (): Promise<string[]> => {
    const uuids: string[] = [];
    const doc = currentDocument()?.value;
    
    if (!doc || !currentContentId.value) {
      return uuids;
    }

    switch (currentContentType.value) {
      case WindowTabType.Entry: {
        // Get descendants from hierarchy
        const setting = currentSetting.value;
        if (setting && currentContentId.value) {
          const hierarchy = setting.hierarchies[currentContentId.value];
          if (hierarchy?.children) {
            // Recursively collect all descendant UUIDs
            const collectDescendants = (entryId: string): string[] => {
              const childUuids: string[] = [];
              const childHierarchy = setting.hierarchies[entryId];
              if (childHierarchy?.children) {
                for (const childId of childHierarchy.children) {
                  childUuids.push(childId);
                  childUuids.push(...collectDescendants(childId));
                }
              }
              return childUuids;
            };
            uuids.push(...collectDescendants(currentContentId.value));
          }
        }
        break;
      }

      case WindowTabType.Campaign: {
        // Get arc UUIDs
        for (const arcIndex of (doc as Campaign).arcIndex) {
          uuids.push(arcIndex.uuid);
        }
        // Get session UUIDs
        for (const sessionIndex of (doc as Campaign).sessionIndex) {
          uuids.push(sessionIndex.uuid);
        }
        break;
      }

      case WindowTabType.Arc: {
        // Get session UUIDs from the campaign's session index within the arc's session range
        const campaign = await (doc as Arc).loadCampaign();
        if (campaign) {
          for (const sessionIndex of campaign.sessionIndex) {
            if (sessionIndex.number >= (doc as Arc).startSessionNumber && 
                sessionIndex.number <= (doc as Arc).endSessionNumber) {
              uuids.push(sessionIndex.uuid);
            }
          }
        }
        break;
      }

      case WindowTabType.Setting: {
        // Get all entry UUIDs from topics
        for (const topic of Object.values((doc as FCBSetting).topics)) {
          for (const entry of Object.values(topic.entries)) {
            uuids.push(entry.uuid);
          }
        }
        // Get campaign, arc, and session UUIDs
        for (const campaignIndex of (doc as FCBSetting).campaignIndex) {
          uuids.push(campaignIndex.uuid);
          for (const arcIndex of campaignIndex.arcs) {
            uuids.push(arcIndex.uuid);
          }
          // Load campaign to get sessions
          const campaign = (doc as FCBSetting).campaigns[campaignIndex.uuid];
          if (campaign) {
            for (const sessionIndex of campaign.sessionIndex) {
              uuids.push(sessionIndex.uuid);
            }
          }
        }
        break;
      }

      case WindowTabType.Session:
        // No nested content for sessions
        break;
    }

    return uuids;
  };

  /**
   * Filter notes based on the current filter criteria (other than date range).
   * @param notes - Array of Calendaria notes
   * @param filterCriteria - Filter criteria
   * @returns Filtered notes
   */
  const filterNotes = async (notes: CalendariaNote[], filterCriteria: TimelineFilters): Promise<CalendariaNote[]> => {
    // Build list of UUIDs to match
    let matchUuids: string[] = [];
    
    // Get reference UUID from current content if referenceEntity is enabled
    if (filterCriteria.referenceEntity && currentContentId.value) {
      matchUuids.push(currentContentId.value);
      
      // Include nested UUIDs if enabled
      if (filterCriteria.includeNestedUuids) {
        const nestedUuids = await getNestedUuids();
        matchUuids.push(...nestedUuids);
      }
    }

    return notes.filter(note => {
      // Category filter - check if any note category matches any filter category
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        const hasMatchingCategory = note.categories.some(cat => 
          filterCriteria.categories!.includes(cat)
        );
        if (!hasMatchingCategory) {
          return false;
        }
      }

      // Text search filter
      const search = filterCriteria.textSearch?.trim().toLowerCase();
      if (search) {
        const nameMatch = note.name.toLowerCase().includes(search);
        // const contentMatch = note.content.toLowerCase().includes(searchLower);
        if (!nameMatch /*&& !contentMatch*/) {
          return false;
        }
      }

      // GM-only filter
      if (filterCriteria.excludeGMOnly && note.gmOnly) {
        return false;
      }

      // Referenced UUID filter - check against all UUIDs (including nested if enabled)
      if (matchUuids.length > 0) {
        // Escape regex metacharacters in UUIDs (e.g., '.' in 'Compendium.world.abc')
        const escapedUuids = matchUuids.map(uuid => uuid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Build a single regex pattern matching any of the UUIDs
        const pattern = new RegExp(`@UUID\\[(${escapedUuids.join('|')})\\]`, 'i');
        if (!pattern.test(note.content)) {
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
    const categories = CalendarAdapter.getCategories();
    
    return notes.map(note => {
      // Build tooltip content
      const categoryLabels = note.categories
        .map(catId => categories.find(c => c.id === catId)?.label || catId)
        .join(', ');
      
      const startDateStr = CalendarAdapter.formatDate(note.startDate, 'DD MMMM YYYY');
      const endDateStr = note.endDate && CalendarAdapter.calendariaToAbsolute(note.startDate) !== CalendarAdapter.calendariaToAbsolute(note.endDate) ? CalendarAdapter.formatDate(note.endDate, 'DD MMMM YYYY') : null;
      const dateStr = endDateStr ? `${startDateStr} - ${endDateStr}` : startDateStr;
      
      // Build tooltip HTML
      const tooltipHtml = [
        `<div class="timeline-tooltip">`,
        `<div class="timeline-tooltip-name"><b>Name: </b>${note.name}</div>`,
        categoryLabels ? `<div class="timeline-tooltip-category"><b>Category: </b>${categoryLabels}</div>` : '',
        `<div class="timeline-tooltip-date">${dateStr}</div>`,
        note.content ? `<div class="timeline-tooltip-content">${note.content}</div>` : '',
        `</div>`,
      ].filter(Boolean).join('');

      return {
        id: note.id,
        content: `<i class="${note.icon}" style="margin-right: 4px;"></i>${note.name}`,
        start: CalendarAdapter.calendariaToJS(note.startDate),
        // set end to nothing if it's just one day
        end: note.endDate && CalendarAdapter.calendariaToAbsolute(note.startDate) !== CalendarAdapter.calendariaToAbsolute(note.endDate) ? CalendarAdapter.calendariaToJS(note.endDate) : undefined,
        // type: note.endDate ? 'range' : 'box',
        className: `timeline-note-item-${note.id}`,
        style: `background-color: ${note.color}; border-color: ${note.color};`,
        title: tooltipHtml,
      };
    });
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

    rangeDebounceTimer = setTimeout(async () => {
      const startAbsolute = CalendarAdapter.calendariaToAbsolute(start);
      const endAbsolute = CalendarAdapter.calendariaToAbsolute(end);
    
      // Update items dynamically if we need more notes
      await updateTimelineItems(startAbsolute, endAbsolute);
      
      await saveTimelineRange({
        start,
        end,
      });
    }, 50);    
  };

  /**
   * Update timeline items dynamically when range changes.
   * Only fetches new notes if the visible range extends beyond currently loaded data.
   */
  const updateTimelineItems = async (startAbsolute: number, endAbsolute: number): Promise<void> => {
    if (!timelineInstance.value) {
      return;
    }

    const newNotes = pullNotesForRange(startAbsolute, endAbsolute);

    // Apply filters and convert to items
    const filteredNotes = await filterNotes(newNotes, filters.value);
    const newItems = notesToTimelineItems(filteredNotes);

    // Update the timeline items using setItems()
    timelineInstance.value.setItems(newItems);

    // Apply line colors after items are updated
    applyLineColors();
  };

  const pullNotesForRange = (startAbsolute: number, endAbsolute: number): CalendariaNote[] => {
    // get notes from Calendaria
    // get 30% more on either side of the range
    const range = Math.max(endAbsolute - startAbsolute, 7);
    const rangeStart = CalendarAdapter.absoluteToCalendaria(Math.floor(startAbsolute - .3 * range));
    const rangeEnd = CalendarAdapter.absoluteToCalendaria(Math.ceil(endAbsolute + .3 * range));

    return (CalendarAdapter.getNotesInRange(rangeStart, rangeEnd));
  };

  /**
   * Calculate the visible range needed to show all filtered notes with a buffer.
   * @param notes - Array of filtered notes
   * @returns Visible range with buffer, or null if no notes
   */
  const calculateVisibleRangeFromNotes = (notes: CalendariaNote[]): { start: CalendariaDate; end: CalendariaDate } | null => {
    if (notes.length === 0) {
      return null;
    }

    // Find min start date and max end date
    let minDate = notes[0].startDate;
    let maxDate = notes[0].endDate ?? notes[0].startDate;

    for (const note of notes) {
      // Compare start dates
      if (CalendarAdapter.calendariaToAbsolute(note.startDate) < CalendarAdapter.calendariaToAbsolute(minDate)) {
        minDate = note.startDate;
      }
      // Compare end dates (or start if no end)
      const noteEnd = note.endDate ?? note.startDate;
      if (CalendarAdapter.calendariaToAbsolute(noteEnd) > CalendarAdapter.calendariaToAbsolute(maxDate)) {
        maxDate = noteEnd;
      }
    }

    // Calculate buffer as 10% of the range
    const rangeDays = CalendarAdapter.daysBetween(minDate, maxDate);
    const bufferDays = Math.ceil(rangeDays * 0.1);

    return {
      start: CalendarAdapter.addDays(minDate, -bufferDays),
      end: CalendarAdapter.addDays(maxDate, bufferDays),
    };
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

      // Determine initial visible range and fetch notes accordingly
      const currentDate = CalendarAdapter.getCurrentDate();
      const currentYear = currentDate.year;
      let initialRange: { start: CalendariaDate; end: CalendariaDate };
      let filteredNotes: CalendariaNote[];
      
      if (filters.value.visibleRange) {
        // Use persisted range - only fetch notes in that range
        initialRange = filters.value.visibleRange;
        const startAbsolute = CalendarAdapter.calendariaToAbsolute(initialRange.start);
        const endAbsolute = CalendarAdapter.calendariaToAbsolute(initialRange.end);
        const allNotes = pullNotesForRange(startAbsolute, endAbsolute);
        filteredNotes = await filterNotes(allNotes, filters.value);
      } else {
        // No persisted range - get all notes and calculate range from filtered results
        const allNotes = CalendarAdapter.getAllNotes();
        filteredNotes = await filterNotes(allNotes, filters.value);
        
        const calculatedRange = calculateVisibleRangeFromNotes(filteredNotes);
        if (calculatedRange) {
          initialRange = calculatedRange;
        } else {
          // No notes - fall back to ±50 years around current date
          initialRange = {
            start: { year: currentYear - 50, month: 0, day: 1 },
            end: { year: currentYear + 50, month: 0, day: 1 },
          };
        }
      }

      const initialStart = CalendarAdapter.calendariaToJS(initialRange.start);
      const initialEnd = CalendarAdapter.calendariaToJS(initialRange.end);

      // Convert to timeline items
      const items = notesToTimelineItems(filteredNotes);
      
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

        // Tooltip options - cap overflow to stay within container
        tooltip: {
          overflowMethod: 'flip',
        },

        // zoomMin = 5 days... if much smaller than you can get to a weird 
        //   spot where the days are huge but it still doesn't show hours
        zoomMin: 1000*60*60*24*5,

        // zoomMax = ~15k years (vis timeline has issues much above this)
        //   
        zoomMax: 1000*60*60*24*365*15000,
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

      // Apply line colors and redraw after initial render
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        applyLineColors();
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
   * Handle filter reset - resets all filters including visible range.
   */
  const onResetFilters = async (): Promise<void> => {
    await saveTimelineConfig({filters: defaultFilters.value});
    await generateTimeline();
  };

  /**
   * Handle range reset - recalculates visible range from filtered notes.
   * Preserves all other filter settings.
   */
  const onResetRange = async (): Promise<void> => {
    // Clear visibleRange to trigger recalculation in generateTimeline
    await saveTimelineConfig({filters: { ...filters.value, visibleRange: null }});
    await generateTimeline();
  };

  /**
   * Handle filter panel toggle.
   */
  const onTogglePanel = (): void => {
    isFilterPanelExpanded.value = !isFilterPanelExpanded.value;
  };

  /**
   * Apply dynamic line colors to match box colors.
   * Each box and its corresponding line share a unique className (timeline-note-item-{id}),
   * so we find matching lines by class rather than by DOM relationship.
   */
  const applyLineColors = (): void => {
    if (!timelineRef.value) {
      return;
    }

    // Find all box items and their corresponding lines by matching className
    const boxes = timelineRef.value.querySelectorAll('.vis-item.vis-box');
    boxes.forEach((box) => {
      const boxEl = box as HTMLElement;
      const bgColor = boxEl.style.backgroundColor;
      if (bgColor) {
        // Find the className that starts with 'timeline-note-item-'
        const noteClass = Array.from(boxEl.classList).find(c => c.startsWith('timeline-note-item-'));
        if (noteClass) {
          // Find the line and dot with the same class
          const line = timelineRef.value?.querySelector(`.vis-item.vis-line.${noteClass}`) as HTMLElement;
          if (line) {
            line.style.borderColor = bgColor;
          }

          const dot = timelineRef.value?.querySelector(`.vis-item.vis-dot.${noteClass}`) as HTMLElement;
          if (dot) {
            dot.style.borderColor = bgColor;
          }
        }
      }
    });
  };

  /**
   * Save just a change to the range
   */
  const saveTimelineRange = async (range: { start: CalendariaDate, end: CalendariaDate }): Promise<void> => {
    const doc = currentDocument()?.value;
    if (!doc) {
      return;
    }

    // Set flag to prevent watcher from triggering during save
    isSavingConfig.value = true;

    try {
      const filters = doc.timelines[0]?.filters ?? defaultFilters.value;
      filters.visibleRange = range;
      
      doc.timelines = [{ filters }];

      await doc.save();
    } finally {
      // Clear flag after save completes or fails
      isSavingConfig.value = false;
    }
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

    // Set flag to prevent watcher from triggering during save
    isSavingConfig.value = true;

    try {
      // Update or add the config in the timelines array
      // For now, just store one timeline per document (first one)
      const existingFilters = doc.timelines[0]?.filters ?? defaultFilters.value;
      const newFilters = config.filters;
      
      // Filter out undefined values from categories array if present
      const inputCategories = newFilters?.categories?.filter((c): c is string => c != null);
      
      // Handle visibleRange: null means clear it, undefined means keep existing
      const inputVisibleRange = newFilters?.visibleRange;
      let validVisibleRange: { start: CalendariaDate; end: CalendariaDate } | null;
      
      if (inputVisibleRange === null) {
        // Explicitly null - clear the range (will be recalculated from notes)
        validVisibleRange = null;
      } else if (inputVisibleRange?.start && inputVisibleRange?.end &&
        inputVisibleRange.start.year != null && inputVisibleRange.start.month != null && inputVisibleRange.start.day != null &&
        inputVisibleRange.end.year != null && inputVisibleRange.end.month != null && inputVisibleRange.end.day != null) {
        // Valid range provided - use it
        validVisibleRange = {
          start: { year: inputVisibleRange.start.year, month: inputVisibleRange.start.month, day: inputVisibleRange.start.day },
          end: { year: inputVisibleRange.end.year, month: inputVisibleRange.end.month, day: inputVisibleRange.end.day },
        };
      } else {
        // No value provided - keep existing
        validVisibleRange = existingFilters.visibleRange;
      }
      
      const newConfig: TimelineConfig = {
        ...TIMELINE_DEFAULT,
        ...(doc.timelines[0] ?? TIMELINE_DEFAULT),
        ...config,
        filters: {
          categories: inputCategories ?? existingFilters.categories,
          textSearch: newFilters?.textSearch ?? existingFilters.textSearch,
          excludeGMOnly: newFilters?.excludeGMOnly ?? existingFilters.excludeGMOnly,
          referenceEntity: newFilters?.referenceEntity ?? existingFilters.referenceEntity,
          includeNestedUuids: newFilters?.includeNestedUuids ?? existingFilters.includeNestedUuids,
          visibleRange: validVisibleRange,
        },
      };

      doc.timelines = [newConfig];

      await doc.save();
    } finally {
      // Clear flag after save completes or fails
      isSavingConfig.value = false;
    }
  };


  ////////////////////////////////
  // watchers
  // regenerate when filters change (excluding visibleRange, which is just view state)
  watch(() => filters.value, (newVal: TimelineFilters, oldVal: TimelineFilters) => {
    // Skip if we're in the middle of saving - the save triggered this watcher
    if (isSavingConfig.value) {
      return;
    }
    const { visibleRange: newRange, ...newRest } = newVal;
    const { visibleRange: oldRange, ...oldRest } = oldVal;
    if (JSON.stringify(newRest) !== JSON.stringify(oldRest)) {
      generateTimeline();
    }
  }, { deep: true });

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
    // Clear the debounce timer to prevent saves after unmount
    if (rangeDebounceTimer) {
      clearTimeout(rangeDebounceTimer);
      rangeDebounceTimer = undefined;
    }

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
    justify-content: flex-start;
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

<style lang="scss">
  /* Global styles for vis-timeline tooltip - not scoped */
  .vis-tooltip {
    max-width: 300px;
    padding: 8px;
    background-color: hsl(164, 48%, 95%);
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: var(--font-size-12);
  }
</style>