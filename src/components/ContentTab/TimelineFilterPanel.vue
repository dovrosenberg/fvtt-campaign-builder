<!--
TimelineFilterPanel: Timeline filter controls

Purpose
- Provides filter controls for the timeline visualization

Responsibilities
- Display category multi-select dropdown
- Provide text search input
- GM-only toggle
- Reference entity toggle
- Provide reset button
- Emit filter changes to parent

Props
- filters: TimelineFilters, current filter values
- isFilterPanelExpanded: boolean, whether the panel is expanded
- availableCategories: string[], list of available categories for the dropdown
- windowTabType: WindowTabType, type of entity for the reference checkbox
- currentUuid: string, the UUID of the current entity for reference filtering

Emits
- updateFilters: TimelineFilters, emitted when any filter changes
- togglePanel: void, emitted when panel expand/collapse is toggled

Slots
- None

Dependencies
- Stores: None
- Composables: None
- Services/API: None

-->

<template>
  <div class="timeline-header">
    <div class="filter-header flexrow" @click="onTogglePanel">
      <i :class="['fas', props.isFilterPanelExpanded ? 'fa-chevron-up' : 'fa-chevron-down', 'toggle-icon']"></i>
      <span class="filter-text">{{ filterSummary }}</span>
    </div>

    <!-- Expandable Filter Panel -->
    <div v-if="props.isFilterPanelExpanded" class="filter-panel">
      <div class="filter-panel-content">
        <!-- Text Search -->
        <div class="filter-group">
          <label class="filter-label">{{ localize('labels.timeline.textSearch') }}</label>
          <InputText
            v-model="localFilters.textSearch"
            :placeholder="localize('labels.timeline.textSearchPlaceholder')"
            class="filter-input"
            @input="onTextSearchInput"
          />
        </div>

        <!-- Categories -->
        <div class="filter-group">
          <label class="filter-label">{{ localize('labels.timeline.categories') }}</label>
          <MultiSelect
            v-model="localFilters.categories"
            :options="props.availableCategories"
            :placeholder="localize('labels.timeline.selectCategories')"
            :show-toggle-all="false"
            class="filter-input"
            display="chip"
            @change="onCategoryChange"
          />
        </div>

        <!-- GM Only -->
        <div class="filter-group">
          <label class="checkbox-label">
            <Checkbox
              v-model="localFilters.gmOnly"
              :binary="true"
              inputId="gm-only"
              @change="onGmOnlyChange"
            />
            <span>{{ localize('labels.timeline.gmOnly') }}</span>
          </label>
        </div>

        <!-- Reference Entity -->
        <div v-if="props.currentUuid" class="filter-group">
          <label class="checkbox-label">
            <Checkbox
              v-model="isReferenceEntity"
              :binary="true"
              inputId="reference-entity"
              @change="onReferenceEntityChange"
            />
            <span>{{ localize('labels.timeline.referenceEntity', { entity: entityTypeLabel }) }}</span>
          </label>
        </div>

        <!-- Include Nested Content -->
        <div v-if="props.currentUuid && isReferenceEntity && showNestedContentCheckbox" class="filter-group nested-checkbox">
          <label class="checkbox-label">
            <Checkbox
              v-model="localFilters.includeNestedUuids"
              :binary="true"
              inputId="include-nested"
              @change="onIncludeNestedChange"
            />
            <span>{{ nestedContentLabel }}</span>
          </label>
        </div>

        <!-- Action Buttons -->
        <div class="filter-actions">
          <Button
            :label="localize('labels.timeline.resetFilters')"
            icon="fas fa-undo"
            severity="secondary"
            @click="onResetClick"
            size="small"
            outlined
          />
          <Button
            :label="localize('labels.timeline.resetRange')"
            icon="fas fa-arrows-left-right"
            severity="secondary"
            @click="onResetRangeClick"
            size="small"
            outlined
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, watch, type PropType } from 'vue';
  import { debounce } from 'lodash';

  // local imports
  import { localize } from '@/utils/game';
  import { TimelineFilters, WindowTabType } from '@/types';

  // library components
  import InputText from 'primevue/inputtext';
  import MultiSelect from 'primevue/multiselect';
  import Button from 'primevue/button';
  import Checkbox from 'primevue/checkbox';

  // local components

  // types
  // (none)

  ////////////////////////////////
  // props
  const props = defineProps({
    filters: {
      type: Object as PropType<TimelineFilters>,
      required: true,
    },
    isFilterPanelExpanded: {
      type: Boolean,
      required: true,
    },
    availableCategories: {
      type: Array as PropType<string[]>,
      required: true,
    },
    windowTabType: {
      type: Number as PropType<WindowTabType>,
      required: true,
    },
    currentUuid: {
      type: String,
      required: true
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'updateFilters', filters: TimelineFilters): void;
    (e: 'resetFilters'): void;
    (e: 'resetRange'): void;
    (e: 'togglePanel'): void;
  }>();

  ////////////////////////////////
  // store
  // (none)

  ////////////////////////////////
  // data
  // Local copy of filters for v-model binding
  const localFilters = ref<TimelineFilters>({ ...props.filters });

  // Reference entity checkbox state (needs to be a ref for v-model)
  const isReferenceEntity = ref(!!props.filters.referencedUuid);

  ////////////////////////////////
  // computed data

  /**
   * Get the localized entity type name for the reference checkbox label.
   */
  const entityTypeLabel = computed(() => {
    switch (props.windowTabType) {
      case WindowTabType.Campaign:
        return localize('labels.campaign.campaign');
      case WindowTabType.Arc:
        return localize('labels.arc.arc');
      case WindowTabType.Session:
        return localize('labels.session.session');
      case WindowTabType.Entry:
        return localize('labels.entry.entry');
      case WindowTabType.Setting:
        return localize('labels.setting.setting');
      default:
        return '';
    }
  });

  /**
   * Determine if the nested content checkbox should be shown.
   * Not shown for sessions.
   */
  const showNestedContentCheckbox = computed(() => {
    return props.windowTabType !== WindowTabType.Session;
  });

  /**
   * Get the localized label for the nested content checkbox based on entity type.
   */
  const nestedContentLabel = computed(() => {
    switch (props.windowTabType) {
      case WindowTabType.Campaign:
        return localize('labels.timeline.includeArcAndSessionReferences');
      case WindowTabType.Arc:
        return localize('labels.timeline.includeSessionReferences');
      case WindowTabType.Entry:
        return localize('labels.timeline.includeChildren');
      case WindowTabType.Setting:
        return localize('labels.timeline.includeAllReferences');
      default:
        return '';
    }
  });

  
  /**
   * Generate a summary of active filters.
   * @returns Human-readable filter summary
   */
  const filterSummary = computed(() => {
    const parts: string[] = [];

    if (localFilters.value.categories && localFilters.value.categories.length > 0) {
      parts.push(localize('labels.timeline.filterSummaryCategories', { categories: localFilters.value.categories.join(', ') }));
    }

    if (localFilters.value.textSearch) {
      parts.push(localize('labels.timeline.filterSummarySearch', { search: localFilters.value.textSearch }));
    }

    if (localFilters.value.gmOnly) {
      parts.push(localize('labels.timeline.gmOnly'));
    }

    if (localFilters.value.referencedUuid) {
      parts.push(localize('labels.timeline.referenceEntity', { entity: entityTypeLabel.value }));
    }

    return parts.length > 0 ? parts.join(' | ') : localize('labels.timeline.noFilters');
  });


  ////////////////////////////////
  // methods

  /**
   * Emit filter changes to parent.
   */
  const emitFilterChange = (): void => {
    emit('updateFilters', { ...localFilters.value });
  };

  ////////////////////////////////
  // event handlers

  /**
   * Handle filter panel toggle.
   */
  const onTogglePanel = (): void => {
    emit('togglePanel');
  };


  /**
   * Debounced emit for text search to avoid excessive updates.
   */
  const debouncedEmitFilterChange = debounce(emitFilterChange, 300);

  /**
   * Handle text search input.
   */
  const onTextSearchInput = (): void => {
    debouncedEmitFilterChange();
  };

  /**
   * Handle category selection change.
   */
  const onCategoryChange = (): void => {
    emitFilterChange();
  };

  /**
   * Handle GM-only checkbox change.
   */
  const onGmOnlyChange = (): void => {
    emitFilterChange();
  };

  /**
   * Handle reference entity checkbox change.
   */
  const onReferenceEntityChange = (): void => {
    localFilters.value.referencedUuid = isReferenceEntity.value ? props.currentUuid : '';
    // Reset nested checkbox when reference is unchecked
    if (!isReferenceEntity.value) {
      localFilters.value.includeNestedUuids = false;
    }
    emitFilterChange();
  };

  /**
   * Handle include nested content checkbox change.
   */
  const onIncludeNestedChange = (): void => {
    emitFilterChange();
  };

  /**
   * Handle reset filters button click.
   */
  const onResetClick = (): void => {
    emit('resetFilters');
  };

  /**
   * Handle reset range button click.
   */
  const onResetRangeClick = (): void => {
    emit('resetRange');
  };

  ////////////////////////////////
  // watchers

  // Sync local filters when props change (but only if different from current local state)
  watch(
    () => props.filters,
    (newFilters) => {
      // Only update if the new filters differ from what we already have locally
      // This prevents overwriting local changes that are still being processed
      const localSnapshot = JSON.stringify(localFilters.value);
      const newSnapshot = JSON.stringify(newFilters);
      if (localSnapshot !== newSnapshot) {
        localFilters.value = { ...newFilters };
        isReferenceEntity.value = !!newFilters.referencedUuid;
      }
    },
    { deep: true }
  );

  ////////////////////////////////
  // lifecycle hooks
</script>

<style lang="scss" scoped>
.filter-panel-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-left: 2px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.filter-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--fcb-text);
}

.filter-input {
  width: 100%;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
