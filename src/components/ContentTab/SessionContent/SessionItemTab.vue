<template>
  <BaseTable
    :actions="actions"
    :rows="mappedItemRows"
    :columns="columns"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addItem')"
    :extra-add-text="localize('labels.session.addItemDrag')"
    :allow-edit="true"
    :draggable-rows="true"
    :help-text="localize('labels.session.itemHelpText')"
    help-link="https://slyflourish.com/lazy_magic_items.html"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="showItemPicker=true"
    @drop-new="onDropNew"
    @dragoverNew="DragDropService.standardDragover"
    @dragstart="onDragStart"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
  <RelatedDocumentsDialog
    v-model="showItemPicker"
    document-type="item"
    @added="onItemAdded"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, } from '@/applications/stores';
  import { localize, } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop'; 
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/tables/RelatedDocumentsDialog.vue';

  // types
  import { CellEditCompleteEvent, SessionTableTypes, BaseTableColumn, BaseTableGridRow } from '@/types';
  import { SessionItem } from '@/documents';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { relatedEntryRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const showItemPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const mappedItemRows = computed(() => (
    relatedEntryRows.value.map((row) => ({
      ...row,
    }))
  ));
  
  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = sessionStore.extraFields[SessionTableTypes.Item]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data, removedUUIDs) => onDeleteItem(data.uuid, removedUUIDs), 
      tooltip: localize('tooltips.deleteItem'),
    },
    {
      icon: 'fa-pen', 
      isEdit: true, 
      callback: () => {},
      tooltip: localize('tooltips.editNotes') 
    },

    // deliver/undeliver buttons
    { 
      icon: 'fa-circle-check', 
      display: (data) => !data.delivered, 
      callback: (data) => onMarkItemDelivered(data.uuid), 
      tooltip: localize('tooltips.markAsDelivered') 
    },
    { 
      icon: 'fa-circle-xmark', 
      display: (data) => data.delivered, 
      callback: (data) => onUnmarkItemDelivered(data.uuid), 
      tooltip: localize('tooltips.unmarkAsDelivered') 
    },

    // move to next session
    { 
      icon: 'fa-share', 
      display: (data) => !data.delivered, // hide arrow for things already delivered
      callback: (data) => onMoveItemToNext(data.uuid), 
      tooltip: localize('tooltips.moveToNextSession') 
    }
  ]));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onItemAdded = async (documentUuid: string) => {
    await sessionStore.addItem(documentUuid);
  }

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data  - looking for raw foundry data
    let data = DragDropService.getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format
    if (data.type === 'Item' && data.uuid) {
      await sessionStore.addItem(data.uuid as string);  
    }
  }

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'notes':
        await sessionStore.updateItemNotes(data.uuid, newValue as string);
        break;

      default:
        break;
    }  
  }

  const onDeleteItem = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await sessionStore.deleteItem(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
  }

  const onMarkItemDelivered = async (uuid: string) => {
    await sessionStore.markItemDelivered(uuid, true);
  }

  const onUnmarkItemDelivered = async (uuid: string) => {
    await sessionStore.markItemDelivered(uuid, false);
  }

  const onMoveItemToNext = async (uuid: string) => {
    await sessionStore.moveItemToNext(uuid);
  }

  const onDragStart = async (event: DragEvent, uuid: string) => {
    await DragDropService.itemDragStart(event, uuid);
  }

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    const reorderedItems = reorderedRows.map((row) => {
      const item = relatedEntryRows.value.find(i => i.uuid === row.uuid);

      // rows have extra fields we don't want
      return {
        uuid: row.uuid,
        delivered: item?.delivered ?? false,
        notes: item?.notes ?? '',
      } as SessionItem;
    });

    await sessionStore.reorderItems(reorderedItems);
  };

  ////////////////////////////////
  // watchers


  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">

</style>