<template>
  <div class="tab-inner">
    <BaseTable
      :rows="sessionReferences"
      :columns="columns"
      :show-add-button="false"
      :show-filter="true"
      :filter-fields="['name', 'campaignName']"
      :allow-edit="false"
      :edit-item-label="localize('tooltips.editSession')"
      :add-button-label="''"
      :extra-add-text="''"
      :allow-drop-row="false"
      :draggable-rows="false"

    />
  </div>
</template>

<script setup lang="ts">
// library imports
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { useNavigationStore, useRelationshipStore, useMainStore } from '@/applications/stores';
import { localize } from '@/utils/game';

// library components
import BaseTable from '@/components/tables/BaseTable.vue';

// local components

// types
import { BaseTableColumn } from '@/types';

// store
const navigationStore = useNavigationStore();
const relationshipStore = useRelationshipStore();
const mainStore = useMainStore();
const { sessionReferences } = storeToRefs(relationshipStore);
const { hasMultipleCampaigns } = storeToRefs(mainStore);

// methods
const onSessionClick = (event: MouseEvent, uuid: string) => {
  navigationStore.openSession(uuid, { newTab: event.ctrlKey, activate: true });
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