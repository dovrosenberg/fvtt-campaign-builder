<template>
  <div class="tab-inner">
    <BaseTable
      ref="baseTableRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="localize('labels.campaign.addToDo')"
      :allow-drop-row="false"
      :grouped="isGrouped"
      :groups="toDoGroups"
      :rows="toDoRows"
      :columns="columns"
      :allow-edit="true"
      :edit-item-label="localize('tooltips.editRow')"
      :actions="actions"
      @add-item="onAddToDoItem"
      @cell-edit-complete="onCellEditComplete"
      @reorder="groupedTable.onReorder"
      @reorder-group="(items) => groupedTable.onReorderGroup(items, toDoGroups)"
      @group-add="groupedTable.onGroupAdd"
      @group-edit="groupedTable.onGroupEdit"
      @group-delete="groupedTable.onGroupDelete"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, inject } from 'vue';

  // local imports
  import { useCampaignStore, } from '@/applications/stores';
  import { CAMPAIGN_DERIVED_STATE_KEY } from '@/composables/useCampaignDerivedState';
  import { useGroupedTable } from '@/composables/useGroupedTable';
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey, } from '@/settings';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { ToDoTypes, CampaignTableTypes, BaseTableColumn, CellEditCompleteEvent, GroupableItem } from '@/types';

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const { toDoRows, toDoGroups } = inject(CAMPAIGN_DERIVED_STATE_KEY)!;

  ////////////////////////////////
  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);
    
  ///////////////////////////////
  // computed
  const isGrouped = computed(() => {
    // Access reactive version to create dependency on settings changes
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[GroupableItem.CampaignToDos] || false;
  });

  const groupedTable = useGroupedTable(campaignStore.groupStores[GroupableItem.CampaignToDos]);

  const actions = computed(() => [
    { icon: 'fa-trash', callback: (data) => onDeleteToDoItem(data.uuid), tooltip: localize('tooltips.deleteToDo') },
    { icon: 'fa-arrow-left', callback: (data) => onMoveToIdeas(data.uuid), tooltip: localize('tooltips.moveToIdeas') },
  ]);

  const columns = computed((): BaseTableColumn[] => {
    // add actions    
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const columns = [ actionColumn ] as BaseTableColumn[];
    for (const col of campaignStore.extraFields[CampaignTableTypes.ToDo]) {
      columns.push(col);
    }

    return columns;
  });
  
  ///////////////////////////////
  // methods

  ///////////////////////////////
  // event handlers
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

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'text':
        await campaignStore.updateToDoItem(data.uuid, newValue as string);
        break;

      default:
        break;
    }  
  }

  const onMoveToIdeas = async (uuid: string) => {
    await campaignStore.moveToDoToIdea(uuid);
  };
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