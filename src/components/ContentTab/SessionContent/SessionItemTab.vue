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
    @add-item="showItemPicker=true"
    @drop-new="onDropNew"
    @dragoverNew="standardDragover"
    @dragstart="onDragStart"
    @cell-edit-complete="onCellEditComplete"
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
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize, } from '@/utils/game'
  import { getValidatedData, itemDragStart, standardDragover } from '@/utils/dragdrop';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/tables/RelatedDocumentsDialog.vue';

  // types
  import { CellEditCompleteEvent, BaseTableColumn } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

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
      callback: (data) => onDeleteItem(data.uuid), 
      tooltip: localize('tooltips.deleteItem') 
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
    let data = getValidatedData(event);
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

  const onDeleteItem = async (uuid: string) => {
    await sessionStore.deleteItem(uuid);
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
    await itemDragStart(event, uuid);
  }

  ////////////////////////////////
  // watchers


  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">

</style>