<template>
  <SessionTable 
    :rows="relatedMonsterRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Monster]"  
    :delete-item-label="localize('tooltips.deleteMonster')"   
    :allow-edit="false"
    :show-add-button="false"
    @row-select="onRowSelect($event.data.uuid)"  
    @drop="onDrop"
    @delete-item="onDeleteMonster"
    @mark-item-delivered="onMarkMonsterDelivered"
    @unmark-item-delivered="onUnmarkMonsterDelivered"
    @move-to-next-session="onMoveMonsterToNext"        
    @cell-edit-complete="onCellEditComplete"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'

  // library components
	
  // local components
  import SessionTable from '@/components/DocumentTable/SessionTable.vue';
  import { DataTableCellEditCompleteEvent } from 'primevue';

  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { relatedMonsterRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const showMonsterPicker = ref<boolean>(false);

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
        if (data.type==='Actor' && data.uuid) {
          await sessionStore.addMonster(data.uuid);  
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

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'number':
        if (parseInt(newValue))  {
          await sessionStore.updateMonsterNumber(data.uuid, parseInt(newValue));
        } else {
          originalEvent.preventDefault();
        }
        break;

      default:
        originalEvent.preventDefault();
        break;
    }  
  }

  const onRowSelect = async (uuid: string) => {
    const monster = await fromUuid(uuid) as Actor;
    await monster?.sheet?.render(true);
  }

  const onDeleteMonster = async (uuid: string) => {
    await sessionStore.deleteMonster(uuid);
  }

  const onMarkMonsterDelivered = async (uuid: string) => {
    await sessionStore.markMonsterDelivered(uuid, true);
  }

  const onUnmarkMonsterDelivered = async (uuid: string) => {
    await sessionStore.markMonsterDelivered(uuid, false);
  }

  const onMoveMonsterToNext = async (uuid: string) => {
    await sessionStore.moveMonsterToNext(uuid);
  }

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>