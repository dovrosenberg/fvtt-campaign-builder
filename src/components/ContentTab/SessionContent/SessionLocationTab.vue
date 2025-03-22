<template>
  <SessionTable 
    :rows="relatedLocationRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Location]"
    :delete-item-label="localize('tooltips.deleteLocation')"   
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLocation')" 
    :extra-add-text="localize('labels.session.addLocationDrag')"
    @row-select="onRowSelect"
    @add-item="showLocationPicker=true"
    @delete-item="onDeleteLocation"
    @mark-item-delivered="onMarkLocationDelivered"
    @unmark-item-delivered="onUnmarkLocationDelivered"
    @move-to-next-session="onMoveLocationToNext"        
    @dragover="onDragover"
    @drop="onDrop"
  />
  <EntryPickerDialog
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
  import { useSessionStore, useNavigationStore, SessionTableTypes } from '@/applications/stores';
  import { Topics, } from '@/types';
  import { localize } from '@/utils/game'
  import { getValidatedData } from '@/utils/dragdrop';

  // library components
	import { DataTableRowSelectEvent } from 'primevue/datatable';

  // local components
  import SessionTable from '@/components/DocumentTable/SessionTable.vue';
  import EntryPickerDialog from '@/components/ContentTab/SessionContent/EntryPickerDialog.vue';

  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const navigationStore = useNavigationStore();
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
  const onRowSelect = async function (event: DataTableRowSelectEvent) { 
    await navigationStore.openEntry(event.data.uuid, { newTab: event.originalEvent?.ctrlKey });
  };

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

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format
    if (data.topic !== Topics.Location || !data.childId) {
      return;
    }

    await sessionStore.addLocation(data.childId);      
  };

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>