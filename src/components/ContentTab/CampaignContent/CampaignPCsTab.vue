<template>
  <!-- A table to display/manage related scenes and actors -->
  <BaseTable
    :rows="rows"
    :columns="columns"
    :show-add-button="true"
    :extra-add-text="localize('labels.campaign.addPCDrag')"
    :showFilter="false"
    :allowEdit="false"
    :delete-item-label="localize('tooltips.deleteRelationship')"
    :add-button-label="localize('labels.campaign.addPC')"
    @add-item="onAddItemClick"
    @delete-item="onDeleteItemClick"
    @drop="onDrop"
    @dragover="onDragover"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { useCampaignStore, useNavigationStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { getValidatedData } from '@/utils/dragdrop';

  // library components

  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  // types
  import { PCDetails, } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const navigationStore = useNavigationStore();
  const { relatedPCRows, } = storeToRefs(campaignStore);

  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data
  type CampaignPCsGridRow = { uuid: string; name: string, playerName: string };

  const rows = computed((): CampaignPCsGridRow[] => 
    relatedPCRows.value.map((pc: PCDetails) => {
      const base = { 
        uuid: pc.uuid, 
        name: pc.name, 
        playerName: pc.playerName,
      };

      return base;
    })
  );

  const columns = computed((): any[] => {
    // for now, just action and name
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick }; 
    const playerNameColumn = { field: 'playerName', style: 'text-align: left', header: 'Player', sortable: true }; 

    return [actionColumn, nameColumn, playerNameColumn];
  });

  ////////////////////////////////
  // methods
  const onNameClick = async function (event: MouseEvent, uuid: string) { 
    await navigationStore.openPC(uuid, { newTab: event.ctrlKey });
  };

  ////////////////////////////////
  // event handlers
  const onAddItemClick = async () => {
    const newPC = await campaignStore.addPC();

    if (newPC)
      await navigationStore.openPC(newPC.uuid, { newTab: true });
  };

  // call mutation to remove item from relationship
  const onDeleteItemClick = async function(_id: string) {
    // show the confirmation dialog 
    await Dialog.confirm({
      title: localize('dialogs.confirmDeletePC.title'),
      content: localize('dialogs.confirmDeletePC.message'),
      yes: () => { 
        void campaignStore.deletePC(_id); 
      },
      no: () => {},
    });
  };

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
    // if it's an actor, create a new PC and link it
    if (data.type==='Actor' && data.uuid) {
      const newPC = await campaignStore.addPC();

      if (newPC) {
        newPC.actorId = data.uuid;
        await newPC?.getActor();
        await navigationStore.openPC(newPC.uuid, { newTab: true });
      }
    }
  };
  
  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
