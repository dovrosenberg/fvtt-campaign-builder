<template>
  <SessionTable 
    :rows="relatedItemRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Item]"  
    :delete-item-label="localize('tooltips.deleteItem')"   
    :allow-edit="false"
    :show-add-button="false"
    @row-select="onRowSelect($event.data.uuid)"  
    @drop="onDrop"
    @delete-item="onDeleteItem"
    @mark-item-delivered="onMarkItemDelivered"
    @unmark-item-delivered="onUnmarkItemDelivered"
    @move-to-next-session="onMoveItemToNext"        
  />
</template>

<script setup lang="ts">
  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'

  // library components
	
  // local components
  import SessionTable from '@/components/DocumentTable/SessionTable.vue';

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

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDrop = async (event: DragEvent) => {
    if (event.dataTransfer?.types[0]==='text/plain') {
      try {
        let data;
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');

        // make sure it's the right format
        if (data.type==='Item' && data.uuid) {
          await sessionStore.addItem(data.uuid);  
        }

        return true;
      }
      catch (err) {
        return false;
      }
    } else {
      return false;
    }
  }

  const onRowSelect = async (uuid: string) => {
    const item = await fromUuid(uuid) as Item;
    await item?.sheet?.render(true);
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

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>