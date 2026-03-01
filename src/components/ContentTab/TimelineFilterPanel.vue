<!--
TimelineFilterPanel: Timeline filter controls

Purpose
- Provides filter controls for the timeline visualization

Responsibilities
- Display category multi-select dropdown
- Provide text search input
- GM-only toggle
- Provide reset button
- Emit filter changes to parent

Props
- filters: TimelineFilters, current filter values
- isFilterPanelExpanded: boolean, whether the panel is expanded
- availableCategories: string[], list of available categories for the dropdown

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
      <div class="filter-summary flexrow">
        <i class="fas fa-filter"></i>
        <span class="filter-text">{{ filterSummary }}</span>
      </div>
      <i :class="['fas', props.isFilterPanelExpanded ? 'fa-chevron-up' : 'fa-chevron-down', 'toggle-icon']"></i>
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
  import { ref, computed, watch, type PropType } from 'vue';
  import { debounce } from 'lodash';

  // local imports
  import { localize } from '@/utils/game';
  import { TimelineFilters } from '@/types';

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
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'updateFilters', filters: TimelineFilters): void;
    (e: 'togglePanel'): void;
  }>();

  ////////////////////////////////
  // store
  // (none)

  ////////////////////////////////
  // data
  // Local copy of filters for v-model binding
  const localFilters = ref<TimelineFilters>({ ...props.filters });

  ////////////////////////////////
  // computed data

  /**
   * Generate a summary of active filters.
   * @returns Human-readable filter summary
   */
  const filterSummary = computed(() => {
    const parts: string[] = [];

    if (localFilters.value.categories && localFilters.value.categories.length > 0) {
      parts.push(`Categories: ${localFilters.value.categories.join(', ')}`);
    }

    if (localFilters.value.textSearch) {
      parts.push(`Search: "${localFilters.value.textSearch}"`);
    }

    if (localFilters.value.gmOnly) {
      parts.push('GM Only');
    }

    if (localFilters.value.referencedUuid) {
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
   * Handle reset button click.
   */
  const onResetClick = (): void => {
    localFilters.value = {
      categories: [],
      textSearch: '',
      gmOnly: false,
      referencedUuid: '',
    };
    emitFilterChange();
  };

  ////////////////////////////////
  // watchers

  // Sync local filters when props change
  watch(
    () => props.filters,
    (newFilters) => {
      localFilters.value = { ...newFilters };
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
