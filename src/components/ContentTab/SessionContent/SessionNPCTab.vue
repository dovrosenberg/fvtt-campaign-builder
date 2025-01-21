<template>
  <SessionTable 
    :rows="relatedNPCRows"
    :columns="[]"  
    :delete-item-label="localize('tooltips.deleteNPC')"   
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addNPC')" 
    @row-select="onRowSelect"
    @add-item="showNPCPicker=true"
    @delete-item="onDeleteNPC"
    @mark-item-delivered="onMarkNPCDelivered"
    @unmark-item-delivered="onUnmarkNPCDelivered"
    @move-to-next-session="onMoveNPCToNext"        
  />
  <EntryPickerDialog
    v-model="showNPCPicker"
    :topic="Topics.Character"
    @item-picked="onAddNPCPicked"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, useNavigationStore, } from '@/applications/stores';
  import { Topics, } from '@/types';
  import { localize } from '@/utils/game'

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
  const { relatedNPCRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const showNPCPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onRowSelect = async function (event: DataTableRowSelectEvent) { 
    await navigationStore.openEntry(event.data.uuid, { newTab: event.originalEvent?.ctrlKey });
  };

  const onAddNPCPicked = async (uuid: string) => {
    await sessionStore.addNPC(uuid);  
  }

  const onDeleteNPC = async (uuid: string) => {
    await sessionStore.deleteNPC(uuid);
  }

  const onMarkNPCDelivered = async (uuid: string) => {
    await sessionStore.markNPCDelivered(uuid, true);
  }

  const onUnmarkNPCDelivered = async (uuid: string) => {
    await sessionStore.markNPCDelivered(uuid, false);
  }

  const onMoveNPCToNext = async (uuid: string) => {
    await sessionStore.moveNPCToNext(uuid);
  }

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>