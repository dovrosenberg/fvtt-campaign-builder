<template>
  <div class="tab-inner">
    <BaseTable
      ref="baseTableRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="localize('labels.campaign.addToDo')"
      :allow-drop-row="false"
      :rows="mappedToDoRows"
      :columns="columns"
      :allow-edit="true"
      :edit-item-label="localize('tooltips.editRow')"
      :actions="actions"
      @add-item="onAddToDoItem"
      @cell-edit-complete="onCellEditComplete"
      @reorder="onReorder"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, inject, } from 'vue';

  // local imports
  import { useCampaignStore, } from '@/applications/stores';
  import { CAMPAIGN_DERIVED_STATE_KEY } from '@/composables/useCampaignDerivedState';
  import { localize } from '@/utils/game';
  import { formatDate } from '@/utils/misc';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { ToDoItem, ToDoTypes, CampaignTableTypes, BaseTableColumn, BaseTableGridRow, CellEditCompleteEvent } from '@/types';

  // store
  const campaignStore = useCampaignStore();
  const { toDoRows } = inject(CAMPAIGN_DERIVED_STATE_KEY)!;

  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);
  
  // computed
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

  const actions = computed(() => [
    { icon: 'fa-trash', callback: (data) => onDeleteToDoItem(data.uuid), tooltip: localize('tooltips.deleteToDo') },
    { icon: 'fa-arrow-left', callback: (data) => onMoveToIdeas(data.uuid), tooltip: localize('tooltips.moveToIdeas') },
  ])
  const mappedToDoRows = computed(() => (
    toDoRows.value.map((row) => ({
      ...row,
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

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    // Reorder using array order
    const reorderedToDos = reorderedRows.map((row) => toDoRows.value.find(toDo => toDo.uuid === row.uuid));
    await campaignStore.reorderToDos(reorderedToDos);
  };

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