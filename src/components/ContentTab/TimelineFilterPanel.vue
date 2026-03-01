<!--
TimelineFilterPanel: Timeline filter controls

Purpose
- Provides filter controls for the timeline visualization

Responsibilities
- Display category multi-select dropdown
- Provide text search input
- GM-only toggle
- Provide reset button
- Apply filters immediately on change

Props
- None

Emits
- updateFilters: TimelineFilters, emitted when any filter changes

Slots
- None

Dependencies
- Stores: None
- Composables: useTimelineState
- Services/API: None

-->

<template>
  <div class="timeline-header">
    <div class="filter-header flexrow" @click="onTogglePanel">
      <div class="filter-summary flexrow">
        <i class="fas fa-filter"></i>
        <span class="filter-text">{{ filterSummary }}</span>
      </div>
      <i :class="['fas', isFilterPanelExpanded ? 'fa-chevron-up' : 'fa-chevron-down', 'toggle-icon']"></i>
    </div>

    <!-- Expandable Filter Panel -->
    <div v-if="isFilterPanelExpanded" class="filter-panel">
      <div class="filter-panel-content">
        <!-- Text Search -->
        <div class="filter-group">
          <label class="filter-label">{{ localize('labels.timeline.textSearch') }}</label>
          <InputText
            v-model="filters.textSearch"
            :placeholder="localize('labels.timeline.textSearchPlaceholder')"
            class="filter-input"
            @input="onTextSearchInput"
          />
        </div>

        <!-- Categories -->
        <div class="filter-group">
          <label class="filter-label">{{ localize('labels.timeline.categories') }}</label>
          <MultiSelect
            v-model="filters.categories"
            :options="availableCategories"
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
              v-model="filters.gmOnly"
              :binary="true"
              inputId="gm-only"
              @change="onGmOnlyChange"
            />
            <span>{{ localize('labels.timeline.gmOnly') }}</span>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed } from 'vue';
  import { debounce } from 'lodash';

  // local imports
  import { localize } from '@/utils/game';
  import { TimelineFilters, } from '@/types';
  import { useTimelineState } from '@/composables/useTimelineState';

  // library components
  import InputText from 'primevue/inputtext';
  import MultiSelect from 'primevue/multiselect';
  import Button from 'primevue/button';

  // local components

  // types

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'updateFilters', filters: TimelineFilters): void;
  }>();

  ////////////////////////////////
  // store
  // (none)

  ////////////////////////////////
  // data
  const timelineState = useTimelineState();
  const {
    filters,
    isFilterPanelExpanded,
    availableCategories,
  } = timelineState;


  ////////////////////////////////
  // computed data

  // computed filter summary

  /**
   * Generate a summary of active filters.
   * @returns Human-readable filter summary
   */
  const filterSummary = computed(() => {
    const parts: string[] = [];

    if (filters.value.categories && filters.value.categories.length > 0) {
      parts.push(`Categories: ${filters.value.categories.join(', ')}`);
    }

    if (filters.value.textSearch) {
      parts.push(`Search: "${filters.value.textSearch}"`);
    }

    if (filters.value.gmOnly) {
      parts.push('GM Only');
    }

    if (filters.value.referencedUuid) {
      parts.push('Has Reference');
    }

    return parts.length > 0 ? parts.join(' | ') : 'No filters';
  });


  ////////////////////////////////
  // methods

  /**
   * Emit filter changes to parent.
   */
  const emitFilterChange = (): void => {
    emit('updateFilters', { ...filters.value });
  };

  ////////////////////////////////
  // event handlers

  /**
   * Handle filter panel toggle.
   */
  const onTogglePanel = (): void => {
    isFilterPanelExpanded.value = !isFilterPanelExpanded.value;
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
   * Handle reset button click.
   */
  const onResetClick = (): void => {
    filters.value = {
      categories: [],
      textSearch: '',
      gmOnly: false,
      referencedUuid: '',
    };
    emit('updateFilters', filters.value);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks
</script>

<style lang="scss" scoped>
.filter-panel-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
