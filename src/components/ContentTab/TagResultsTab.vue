<!--
TagResultsTab: Component for displaying all entries with a specific tag

Purpose
- Shows a list of all entries that contain a specific tag

Responsibilities
- Fetches entries with the given tag using SearchService
- Displays results in a table format similar to search results
- Handles row clicks to open entries (with Ctrl/Cmd+Click support for new tabs)
- Shows empty state when no entries have the tag

Props
- None

Emits
- None

Slots
- None

Dependencies
- Stores: useNavigationStore
- Composables: None
- Services/API: searchService

-->

<template>
  <div class="fcb-sheet-container flexcol">
    <header class="fcb-name-header flexrow">
      <h3 class="tag-results-title">
        <i class="fas fa-tag"></i>
        {{ localize('tags.resultsFor') }} "{{ currentTag.value }}"
      </h3>
      <div class="tag-results-count" style="text-align: right; padding-right: 8px;">
        {{ results.length }} {{ results.length === 1 ? localize('tags.entryFound') : localize('tags.entriesFound') }}
      </div>
    </header>
    <div class="fcb-sheet-subtab-container flexrow">
      <div class="fcb-subtab-wrapper">
        <div class="fcb-tab-body">
          <BaseTable
            :rows="tableRows"
            :columns="columns"
            :show-filter="true"
            :show-add-button="false"
            :can-reorder="false"
          />
        </div>
      </div>
    </div> 
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, computed } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { searchService } from '@/utils/search';
  import { useNavigationStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { BaseTableColumn } from '@/types';
  import { FCBSearchResult } from '@/utils/search';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const { currentSetting, currentTag } = useContentState();

  ////////////////////////////////
  // computed data
  const columns = computed((): BaseTableColumn[] => {
    const nameColumn = { field: 'name', style: 'text-align: left; width: 50%;', header: localize('labels.tableHeaders.name'), sortable: true, onClick: onNameClick }; 
    const typeColumn = { field: 'type', style: 'text-align: left; width: 50%;', header: localize('labels.tableHeaders.type'), sortable: true }; 
    return [nameColumn, typeColumn];
  });

  const tableRows = computed(() => 
    results.value.map(result => {
      let type = mapTypeToText[result.resultType];
      if (result.resultType === 'entry') {
        type += ` (${result.topic})`;
      }
      
      return {
        uuid: result.uuid,
        name: result.name,
        type: type
      };
    })
  );

  ////////////////////////////////
  // data
  const results = ref<FCBSearchResult[]>([]);
  const loading = ref<boolean>(true);
  const mapTypeToText = {
    entry: localize('labels.entry.entry'),
    session: localize('labels.session.session'),
    front: localize('labels.front.front'),
    arc: localize('labels.arc.arc')
  }

  ////////////////////////////////
  // methods
  /**
   * Load results for the current tag
   */
  const loadResults = async (): Promise<void> => {
    if (!currentSetting.value || !currentTag.value.value) {
      results.value = [];
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const searchResults = await searchService.searchByTag(currentTag.value.value);
      results.value = searchResults;
    } catch (error) {
      console.error('Error searching by tag:', error);
      results.value = [];
    } finally {
      loading.value = false;
    }
  };

  ////////////////////////////////
  // event handlers

  async function onNameClick(event: MouseEvent, uuid: string) {
    const result = results.value.find(r => r.uuid === uuid);
    if (!result)
      return;

    switch (result.resultType) {
      case 'entry':
        navigationStore.openEntry(uuid, { newTab: event.ctrlKey || event.metaKey, activate: true });
        break;
      case 'session':
        navigationStore.openSession(uuid, { newTab: event.ctrlKey || event.metaKey, activate: true });
        break;
      case 'front':
        navigationStore.openFront(uuid, { newTab: event.ctrlKey || event.metaKey, activate: true });
        break;
      case 'arc':
        navigationStore.openArc(uuid, { newTab: event.ctrlKey || event.metaKey, activate: true });
        break;
      default:
        throw new Error(`Unknown result type in TagResultsTab.onRowClick(): ${result.resultType}`);
    }
  };

  ////////////////////////////////
  // watchers
  watch([currentSetting, currentTag], () => {
    loadResults();
  }, { immediate: true });

  ////////////////////////////////
  // lifecycle hooks
</script>

<style lang="scss" scoped>
  .tag-results-title {
    margin: 0;
    font-size: var(--font-size-18);
    font-weight: 600;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;

    i {
      color: var(--color-text-secondary);
    }
  }

  .tag-results-count {
    font-size: var(--font-size-12);
    color: var(--color-text-secondary);
  }
</style>
