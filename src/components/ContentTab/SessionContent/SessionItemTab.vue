<template>
  <SessionTable
    :rows="relatedItemRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Item]"
    :delete-item-label="localize('tooltips.deleteItem')"
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addItem')"
    :extra-add-text="localize('labels.session.addItemDrag')"
    :draggable-rows="true"
    @add-item="showItemPicker=true"
    @drop="onDrop"
    @dragover="onDragover"
    @delete-item="onDeleteItem"
    @mark-item-delivered="onMarkItemDelivered"
    @unmark-item-delivered="onUnmarkItemDelivered"
    @move-to-next-session="onMoveItemToNext"
    @dragstart="onDragStart"
  />
  <RelatedDocumentsDialog
    v-model="showItemPicker"
    document-type="item"
    @added="onItemAdded"
  />
</template>

<script setup lang="ts">
  // library imports
  import { ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize, } from '@/utils/game'
  import { getValidatedData, itemDragStart } from '@/utils/dragdrop';

  // library components
	
  // local components
  import SessionTable from '@/components/Tables/SessionTable.vue';
  import RelatedDocumentsDialog from '@/components/Tables/RelatedDocumentsDialog.vue';

  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { relatedItemRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const showItemPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onItemAdded = async (documentUuid: string) => {
    await sessionStore.addItem(documentUuid);
  }

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format
    if (data.type==='Item' && data.uuid) {
      await sessionStore.addItem(data.uuid);  
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