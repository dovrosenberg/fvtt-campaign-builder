<template>
  <BaseTable 
    :actions="actions"
    :rows="mappedNPCRows"
    :columns="columns"  
    :show-add-button="true"
    :add-button-label="localize('labels.session.addNPC')" 
    :extra-add-text="localize('labels.session.addNPCDrag')"
    :allow-edit="false"
    :help-text="localize('labels.session.npcHelpText')"
    @add-item="showNPCPicker=true"
    @dragoverNew="onDragoverNew"
    @drop-new="onDropNew"
  />
  <RelatedItemDialog
    v-model="showNPCPicker"
    :topic="Topics.Character"
    :mode="RelatedItemDialogModes.Session"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes} from '@/applications/stores';
  import { Topics, RelatedItemDialogModes,} from '@/types';
  import { localize } from '@/utils/game'
  import { getValidatedData } from '@/utils/dragdrop';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedItemDialog from '@/components/tables/RelatedItemDialog.vue';

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
  const mappedNPCRows = computed(() => (
    relatedNPCRows.value.map((row) => ({
      ...row,
    }))
  ));

   const columns = computed(() => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = sessionStore.extraFields[SessionTableTypes.NPC]

    return [ actionColumn, ...extraFields];
  });

   const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data) => onDeleteNPC(data.uuid), 
      tooltip: localize('tooltips.deleteNPC') 
    },

    // deliver/undeliver buttons
    { 
      icon: 'fa-circle-check', 
      display: (data) => !data.delivered, 
      callback: (data) => onMarkNPCDelivered(data.uuid), 
      tooltip: localize('tooltips.markAsDelivered') 
    },
    { 
      icon: 'fa-circle-xmark', 
      display: (data) => data.delivered, 
      callback: (data) => onUnmarkNPCDelivered(data.uuid), 
      tooltip: localize('tooltips.unmarkAsDelivered') 
    },

    // move to next session
    { 
      icon: 'fa-share', 
      display: (data) => !data.delivered, // hide arrow for things already delivered
      callback: (data) => onMoveNPCToNext(data.uuid), 
      tooltip: localize('tooltips.moveToNextSession') 
    }
  ]));

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

    await sessionStore.addNPC(data.childId as string);      
  };


  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>