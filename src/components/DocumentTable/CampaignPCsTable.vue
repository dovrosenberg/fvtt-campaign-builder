<template>
  <!-- A table to display/manage related scenes and actors -->
  <div 
    @drop="onDrop"
  >
    <BaseTable
      :rows="rows"
      :columns="columns"
      :showAddButton="true"
      :showFilter="false"
      :allowEdit="false"
      :delete-item-label="localize('tooltips.deleteRelationship')"
      :add-button-label="localize('labels.campaign.addPC')"

      @add-item="onAddItemClick"
      @delete-item="onDeleteItemClick"
      @row-select="onRowSelect"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { useCampaignStore, useNavigationStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';

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
  type GridRow = { uuid: string; name: string, playerName: string };

  const rows = computed((): GridRow[] => 
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
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true }; 
    const playerNameColumn = { field: 'playerName', style: 'text-align: left', header: 'Player', sortable: true }; 

    return [actionColumn, nameColumn, playerNameColumn];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddItemClick = async () => {
    const newPC = await campaignStore.addPC();

    if (newPC)
      await navigationStore.openPC(newPC.uuid, { newTab: true });
  };

  const onRowSelect = async function (event: { originalEvent: PointerEvent; data: GridRow} ) { 
    await navigationStore.openPC(event.data.uuid, { newTab: event.originalEvent?.ctrlKey });
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

  const onDrop = async(event: DragEvent) => {
    if (event.dataTransfer?.types[0]==='text/plain') {
      try {
        let data;
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');

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

        return true;
      }
      catch (err) {
        return false;
      }
    } else {
      return false;
    }
  };
  
  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
  .action-icon {
    cursor: pointer;
  }
</style>
