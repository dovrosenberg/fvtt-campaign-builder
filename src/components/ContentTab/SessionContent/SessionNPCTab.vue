<template>
  <SessionTable 
    :rows="relatedNPCRows"
    :columns="sessionStore.extraFields[SessionTableTypes.NPC]"  
    :delete-item-label="localize('tooltips.deleteNPC')"   
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addNPC')" 
    :extra-add-text="localize('labels.session.addNPCDrag')"
    @add-item="showNPCPicker=true"
    @delete-item="onDeleteNPC"
    @mark-item-delivered="onMarkNPCDelivered"
    @unmark-item-delivered="onUnmarkNPCDelivered"
    @move-to-next-session="onMoveNPCToNext"        
    @dragoverNew="onDragoverNew"
    @dropNew="onDropNew"
  />
  <RelatedItemDialog
    v-model="showNPCPicker"
    :topic="Topics.Character"
    :mode="RelatedItemDialogModes.Session"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, useNavigationStore, SessionTableTypes} from '@/applications/stores';
  import { Topics, RelatedItemDialogModes,} from '@/types';
  import { localize } from '@/utils/game'
  import { getValidatedData } from '@/utils/dragdrop';

  // library components
	import { DataTableRowSelectEvent } from 'primevue/datatable';

  // local components
  import SessionTable from '@/components/Tables/SessionTable.vue';
  import RelatedItemDialog from '@/components/Tables/RelatedItemDialog.vue';

  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
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

  const onDragoverNew = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format
    if (data.topic !== Topics.Character || !data.childId) {
      return;
    }

    await sessionStore.addNPC(data.childId);      
  };


  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>