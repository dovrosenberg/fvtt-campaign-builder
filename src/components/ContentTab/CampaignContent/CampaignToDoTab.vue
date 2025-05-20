<template>
  <div class="tab-inner">
    <BaseTable
      ref="baseTableRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="localize('labels.campaign.addToDo')"
      :track-delivery="false"
      :allow-drop-row="false"
      :rows="mappedToDoRows"
      :columns="columns"
      :allow-edit="false"
      :delete-item-label="localize('tooltips.deleteToDo')"
      :show-move-to-campaign="false"
      :draggable-rows="false"
      @delete-item="onDeleteToDoItem"
      @add-item="onAddToDoItem"
      @cell-edit-complete="onCellEditComplete"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, CampaignTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components

  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';
  
  // types
  import { ToDoItem, ToDoTypes } from '@/types';
  import { Entry } from '@/classes';
import { DataTableCellEditCompleteEvent } from 'primevue';

  interface ToDoRow extends ToDoItem {
    entry: string;
  }

  // store
  const campaignStore = useCampaignStore();
  const { todoRows, } = storeToRefs(campaignStore);

  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);
  
  // computed
  const mappedToDoRows = computed(() => (
    todoRows.value.map((row) => ({
      ...row,
      lastTouched: row.lastTouched ? row.lastTouched.toLocaleString(undefined, { 
        day: 'numeric', 
        month: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).replace(/\s*([AP]M)/i, (_, p1) => p1.toLowerCase()) : '',  // replace AM/PM with am/pm
    }))
  ));

  const columns = computed((): any[] => {
    // add actions    
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const columns = [ actionColumn ] as any[];
    for (const col of campaignStore.extraFields[CampaignTableTypes.ToDo]) {
      columns.push(col);
    }

    return columns;
  });
  
  // methods
  const onDeleteToDoItem = async (uuid: string) => {
    await campaignStore.completeToDoItem(uuid);
  };

  const onAddToDoItem = async () => {
    const newRow = await campaignStore.addToDoItem(ToDoTypes.Manual, '');

    // open for editing
    if (baseTableRef.value && newRow) {
      baseTableRef.value.setEditingRow(newRow.uuid);
    }
  };

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'text':
        await campaignStore.updateToDoItem(data.uuid, newValue);
        break;

      default:
        originalEvent?.preventDefault();
        break;
    }  
  }
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
</style> 