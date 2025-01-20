<template>
  <SessionTable 
    :rows="relatedLocationRows"
    :columns="[]"  
    :delete-item-label="localize('tooltips.deleteLocation')"   
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLocation')" 
    @add-item="showLocationPicker=true"
    @delete-item="onDeleteLocation"
    @mark-item-delivered="onMarkLocationDelivered"
    @unmark-item-delivered="onUnmarkLocationDelivered"
    @move-to-next-session="onMoveLocationToNext"        
  />
  <ItemPickerDialog
    v-model="showLocationPicker"
    :topic="Topics.Location"
    @item-picked="onAddLocationPicked"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, } from '@/applications/stores';
  import { Topics, } from '@/types';
  import { localize } from '@/utils/game'

  // library components
	
  // local components
  import SessionTable from '@/components/DocumentTable/SessionTable.vue';
  import ItemPickerDialog from '@/components/ItemPickerDialog/ItemPickerDialog.vue';

  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { relatedLocationRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const showLocationPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddLocationPicked = async (uuid: string) => {
    await sessionStore.addLocation(uuid);  
  }

  const onDeleteLocation = async (uuid: string) => {
    await sessionStore.deleteLocation(uuid);
  }

  const onMarkLocationDelivered = async (uuid: string) => {
    await sessionStore.markLocationDelivered(uuid, true);
  }

  const onUnmarkLocationDelivered = async (uuid: string) => {
    await sessionStore.markLocationDelivered(uuid, false);
  }

  const onMoveLocationToNext = async (uuid: string) => {
    await sessionStore.moveLocationToNext(uuid);
  }

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>