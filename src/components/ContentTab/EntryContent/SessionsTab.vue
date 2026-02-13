<template>
  <div class="tab-inner">
    <BaseTable
      :rows="sessionReferences"
      :columns="columns"
      :show-add-button="false"
      :show-filter="true"
      :filter-fields="['name', 'campaignName']"
      :can-reorder="false"
      :allow-edit="false"
      :edit-item-label="localize('tooltips.editSession')"
      :add-button-label="''"
      :extra-add-text="''"
      :allow-drop-row="false"
    />
  </div>
</template>

<script setup lang="ts">
// library imports
import { computed, inject } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { useNavigationStore, useMainStore } from '@/applications/stores';
import { ENTRY_DERIVED_STATE_KEY } from '@/composables/useEntryDerivedState';
import { localize } from '@/utils/game';

// library components
import BaseTable from '@/components/tables/BaseTable.vue';

// local components

// types
import { BaseTableColumn } from '@/types';

// store
const navigationStore = useNavigationStore();
const mainStore = useMainStore();
const { sessionReferences } = inject(ENTRY_DERIVED_STATE_KEY)!;
const { hasMultipleCampaigns } = storeToRefs(mainStore);

// methods
const onSessionClick = (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) => {
  navigationStore.openSession(rowData.uuid, { newTab: event.ctrlKey, activate: true, panelIndex: event.altKey ? -1 : undefined });
};

// computed
const columns = computed((): BaseTableColumn[] => {
  const baseColumns = [
    { field: 'number', style: 'text-align: left; width: 15%', header: localize('labels.fields.sessionNumber'), sortable: true }
  ] as BaseTableColumn[];
  
  if (hasMultipleCampaigns.value) {
    baseColumns.push({ 
      field: 'campaignName', 
      style: 'text-align: left; width: 25%', 
      header: localize('labels.fields.campaign'), 
      sortable: true 
    });
  }

  return [
    ...baseColumns,
    { 
      field: 'name', 
      style: `text-align: left; width: ${hasMultipleCampaigns.value ? '35%' : '55%'}`, 
      header: localize('labels.fields.name'), 
      sortable: true, 
      onClick: onSessionClick 
    },
    { 
      field: 'date', 
      style: 'text-align: left; width: 25%', 
      header: localize('labels.fields.sessionDate'), 
      sortable: true 
    }
  ];
});
</script>

<style lang="scss" scoped>
.tab-inner {
  padding: 0.5em;
}

a {
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.text-center {
  text-align: center;
}
</style> 