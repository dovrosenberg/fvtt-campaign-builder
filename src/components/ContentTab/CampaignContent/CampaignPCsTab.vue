<template>
  <!-- A table to display/manage related scenes and actors -->
  <BaseTable
    :rows="rows"
    :columns="columns"
    :show-add-button="true"
    :extra-add-text="localize('labels.campaign.addPCDrag')"
    :showFilter="false"
    :allow-drop-row="false"
    :add-button-label="localize('labels.campaign.addPC')"
    :actions="[{ icon: 'fa-trash', callback: (data) => onDeleteItemClick(data.uuid), tooltip: localize('tooltips.deleteRelationship') }]"
    @add-item="onAddItemClick"
    @drop-new="onDropNew"
    @dragover="onDragover"
  />

  <RelatedEntryDialog
    v-model="addDialogShow"
    :topic="Topics.PC"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :mode="RelatedEntryDialogModes.Add"
    :allow-create="false"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { useCampaignStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { getValidatedData } from '@/utils/dragdrop';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedEntryDialog from '@/components/dialogs/RelatedEntryDialog.vue';
  
  // types
  import { RelatedPCDetails, RelatedEntryDialogModes, Topics } from '@/types';
  import { Entry } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { relatedPCRows, } = storeToRefs(campaignStore);

  ////////////////////////////////
  // data
  const addDialogShow = ref(false);
  const editItem = ref({
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { itemId: string; itemName: string; extraFields: {field: string; header: string; value: string}[] });

  ////////////////////////////////
  // computed data
  interface CampaignPCsGridRow { 
    uuid: string; 
    name: string, 
    actor: string 
  };

  const rows = computed((): CampaignPCsGridRow[] => (
    relatedPCRows.value.map((pc: RelatedPCDetails) => ({
      uuid: pc.uuid, 
      type: 'PC',
      name: `${pc.name} (${pc.playerName})`, 
      actor: pc.name,
    }))
  ));

  // TODO: why are these here instead of in the store like the others?
  // these are here because they can be; this is cleaner than sticking it all in the store
  // to move the others out, though, will require some refactoring because their onClick handlers need stuff in the store

  const columns = computed((): any[] => [
    { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' },
    { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
    { field: 'actor', style: 'text-align: left', header: 'Character Sheet', sortable: true, onClick: onActorClick },
  ]);

  ////////////////////////////////
  // methods
  const onNameClick = async function (event: MouseEvent, uuid: string) { 
    await navigationStore.openEntry(uuid, { newTab: event.ctrlKey });
  };

  const onActorClick = async function (_event: MouseEvent, uuid: string) { 
    const pc = await Entry.fromUuid(uuid);

    if (!pc)
      return;

    const actor = await pc.getActor();
    if (actor)
      actor.sheet?.render(true);
  };

  ////////////////////////////////
  // event handlers
  const onAddItemClick = async () => {
    addDialogShow.value = true;
  };

  // call mutation to remove item from relationship
  const onDeleteItemClick = async function(_id: string) {
    void campaignStore.deletePC(_id); 
  };

  const onDragover = (event: DragEvent) => {
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
    if (data.topic !== Topics.PC || !data.childId) {
      return;
    }

    const entry = await Entry.fromUuid(data.childId);
    if (!entry)
      return;

    const details: RelatedPCDetails = {
      uuid: data.childId,
      name: entry.name,
      type: 'PC',
      playerName: entry.playerName,
      actorId: entry.actorId,
    };
    await campaignStore.addPC(details);      
  };
  

  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
