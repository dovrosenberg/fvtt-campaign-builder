<template>
  <div class="tab-inner">
    <BaseTable
      ref="baseTableRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="localize('labels.campaign.addToDo')"
      :allow-drop-row="false"
      :grouped="ModuleSettings.get(SettingKey.tableGroupingSettings)?.[TableGroupingSetting.Todos] || false"
      :groups="toDoGroups"
      :rows="mappedToDoRows"
      :columns="columns"
      :allow-edit="true"
      :edit-item-label="localize('tooltips.editRow')"
      :actions="actions"
      @add-item="onAddToDoItem"
      @cell-edit-complete="onCellEditComplete"
      @reorder="groupedTable.onReorder"
      @reorder-group="groupedTable.onReorderGroup"
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
  import { formatDate } from '@/utils/misc';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { ToDoItem, ToDoTypes, CampaignTableTypes, BaseTableColumn, BaseTableGridRow, CellEditCompleteEvent, GroupedTableGridRow, GroupableItem } from '@/types';

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const { toDoRows, toDoGroups } = inject(CAMPAIGN_DERIVED_STATE_KEY)!;

  ////////////////////////////////
  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);
    
  ///////////////////////////////
  // computed
  const groupedTable = useGroupedTable<ToDoItem, GroupableItem.ToDos>({
    store: campaignStore.groupStores[GroupableItem.ToDos],
    rows: computed(() => toDoRows.value),
    mapReorderedRows: (reorderedRows: BaseTableGridRow[], originalRows: ToDoItem[]) => {
      // Map reordered rows back to ToDoItems, preserving groupId changes
      return reorderedRows
        .map((row): ToDoItem | null => {
          const toDo = originalRows.find(toDo => toDo.uuid === row.uuid);
          return toDo ? { ...toDo, groupId: (row as GroupedTableGridRow).groupId } : null;
        })
        .filter((row): row is ToDoItem => row !== null);
    },
  });

  const actions = computed(() => [
    { icon: 'fa-trash', callback: (data) => onDeleteToDoItem(data.uuid), tooltip: localize('tooltips.deleteToDo') },
    { icon: 'fa-arrow-left', callback: (data) => onMoveToIdeas(data.uuid), tooltip: localize('tooltips.moveToIdeas') },
  ]);

  const mappedToDoRows = computed(() => (
    toDoRows.value.map((row) => ({
      ...row,
      groupId: row.groupId || null,
      entry: mapToDoToName(row),
      lastTouched: row.lastTouched ? formatDate(row.lastTouched) : '', 
    }))
  ));

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
  const mapToDoToName = (toDo: ToDoItem) => {
    switch (toDo.type) {
      case ToDoTypes.Manual:
        return '';
      case ToDoTypes.Entry:
        return toDo.linkedText;
      case ToDoTypes.Lore:
        return 'Lore';
      case ToDoTypes.Monster:
        return 'Monster';
      case ToDoTypes.Vignette:
        return 'Vignette'; 
      case ToDoTypes.Item:
        return 'Item';
      case ToDoTypes.GeneratedName:
        return 'Generated Name';
      default:
        return '';
    }
  }

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