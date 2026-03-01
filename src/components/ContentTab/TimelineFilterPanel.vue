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
- filters: TimelineFilters, current filter values
- availableCategories: string[], list of available categories

Emits
- updateFilters: TimelineFilters, emitted when any filter changes

Slots
- None

Dependencies
- Stores: None
- Composables: None
- Services/API: None

-->

<template>
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
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch } from 'vue';
  import { debounce } from 'lodash';

  // local imports
  import { localize } from '@/utils/game';
  import { TimelineFilters, } from '@/types';

  // library components
  import InputText from 'primevue/inputtext';
  import MultiSelect from 'primevue/multiselect';
  import Button from 'primevue/button';

  // local components

  // types

  ////////////////////////////////
  // props
  const props = defineProps({
    filters: {
      type: Object as () => TimelineFilters,
      required: true,
    },
    availableCategories: {
      type: Array as () => string[],
      required: true,
    },
  });

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
  const localFilters = ref<TimelineFilters>({
    categories: [],
    textSearch: '',
    gmOnly: false,
    referencedUuid: '',
  });

  ////////////////////////////////
  // computed data
  // (none)

  ////////////////////////////////
  // methods
  // (none)

  ////////////////////////////////
  // event handlers

  /**
   * Emit filter changes to parent.
   */
  const emitFilterChange = (): void => {
    emit('updateFilters', { ...localFilters.value });
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
    emit('updateFilters', localFilters.value);
  };

  ////////////////////////////////
  // watchers

  // Sync localFilters with props.filters when they change from outside
  watch(
    () => props.filters,
    (newFilters) => {
      localFilters.value = { ...newFilters };
    },
    { immediate: true, deep: true }
  );

  ////////////////////////////////
  // lifecycle hooks
  // (none)
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
