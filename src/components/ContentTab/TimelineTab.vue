<!--
TimelineTab: Timeline display component

Purpose
- Displays a vis-timeline visualization of Calendaria notes with filtering capabilities

Responsibilities
- Render the timeline visualization using vis-timeline
- Provide collapsible filter panel in the header
- Display filter summary when panel is collapsed
- Handle filter changes and timeline refresh

Props
- documentUuid: string, UUID of the document this timeline belongs to
- windowTabType: WindowTabType, type of document (Campaign, Arc, Session, Entry, Setting)

Emits
- None

Slots
- None

Dependencies
- Stores: None
- Composables: useTimelineState
- Services/API: MockCalendariaService (via useTimelineState)

-->

<template>
  <div class="timeline-tab flexcol">

    <TimelineFilterPanel
      :filters="filters"
      :available-categories="availableCategories"
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
  import { ref, computed, onMounted, onUnmounted, watch, PropType } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { useTimelineState } from '@/composables/useTimelineState';
  import { useContentState } from '@/composables/useContentState';
  import { TimelineFilters, TimelineConfig, WindowTabType } from '@/types';

  // local components
  import TimelineFilterPanel from './TimelineFilterPanel.vue';

  // types
  import { TIMELINE_DEFAULT_FILTERS } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    documentUuid: {
      type: String,
      required: true,
    },
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

  // Get the document based on content type
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

  // Get initial config from document's timelines array (find by documentUuid or use first)
  const initialConfig = computed((): TimelineConfig | undefined => {
    const doc = document()?.value;
    if (!doc?.timelines?.length) {
      return undefined;
    }
    // Find config for this document, or use first one
    return doc.timelines.find((t: TimelineConfig) => t.filters.visibleRange) || doc.timelines[0];
  });

  const timelineState = useTimelineState();

  // Destructure reactive state from timelineState
  const {
    isTimelineLoading,
    filters,
    availableCategories,
  } = timelineState;

  ////////////////////////////////
  // computed data
  // (none)

  ////////////////////////////////
  // methods
  // (none)

  ////////////////////////////////
  // event handlers

  /**
   * Save the current timeline config to the document.
   */
  const saveTimelineConfig = async (): Promise<void> => {
    const doc = document()?.value;
    if (!doc) {
      return;
    }

    // Update or add the config in the timelines array
    // For now, just store one timeline per document (first one)
    const timeline: TimelineConfig = { 
      filters: {
        ...TIMELINE_DEFAULT_FILTERS, 
        ...filters.value,
      },
    };
    doc.timelines = [timeline];

    await doc.save();
    await refreshTimeline();
  };


  ////////////////////////////////
  // watchers

  // Save filters when visible range changes (from zoom/pan)
  let saveDebounceTimer: NodeJS.Timeout | undefined;
  watch(
    () => filters.value.visibleRange,
    () => {
      // Debounce saves to avoid excessive writes
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => {
        saveTimelineConfig();
      }, 500);
    },
    { deep: true }
  );

  ////////////////////////////////
  // lifecycle hooks

  onMounted(() => {
    if (timelineRef.value) {
      // Ensure the container has dimensions before initializing
      requestAnimationFrame(() => {
        if (timelineRef.value) {
          timelineState.setContainer(timelineRef.value);
        }
      });
    }
  });

  onUnmounted(() => {
    timelineState.setContainer(null);
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
