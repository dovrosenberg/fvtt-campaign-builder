<template>
  <!-- a table for data inside a session that supports moving rows around to other sessions -->
  <SessionTable
    :rows="relatedLoreRows"
    :columns="campaignStore.extraFields[CampaignTableTypes.Lore]"
    :delete-item-label="localize('tooltips.deleteLore')"
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLore')"
    :extra-add-text="localize('labels.session.addLoreDrag')"
    :allow-drop-row="true"
    @add-item="onAddLore"
    @delete-item="onDeleteLore"
    @mark-item-delivered="onMarkLoreDelivered"
    @unmark-item-delivered="onUnmarkLoreDelivered"
    @move-to-next-session="onMoveLoreToNext"
    @cell-edit-complete="onCellEditComplete"
    @dragoverNew="onDragover"
    @dragoverRow="onDragover"
    @dropRow="onDropRow"
    @dropNew="onDropNew"
  />
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, CampaignTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import { getValidatedData } from '@/utils/dragdrop';

  // library components
	
  // local components
  import SessionTable from '@/components/Tables/SessionTable.vue';

  // types
  import { DataTableCellEditCompleteEvent } from 'primevue';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const { relatedLoreRows } = storeToRefs(campaignStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddLore = async () => {
    await campaignStore.addLore();
  }

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'description':
        await campaignStore.updateLoreDescription(data.uuid, newValue);
        break;

      default:
        originalEvent?.preventDefault();
        break;
    }  
  }

  const onDeleteLore = async (uuid: string) => {
    await campaignStore.deleteLore(uuid);
  }

  const onMarkLoreDelivered = async (uuid: string) => {
    await campaignStore.markLoreDelivered(uuid, true);
  }

  const onUnmarkLoreDelivered = async (uuid: string) => {
    await campaignStore.markLoreDelivered(uuid, false);
  }

  const onMoveLoreToNext = async (uuid: string) => {
    await campaignStore.moveLoreToLastSession(uuid);
  }

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format - looking for JournalEntryPage
    if (data.type === 'JournalEntryPage' && data.uuid) {
      // Create a new lore entry and associate it with the journal entry page
      const loreId = await campaignStore.addLore('');

      if (loreId) {
        await campaignStore.updateLoreJournalEntry(loreId, data.uuid);
      }
    }
  }

  const onDropRow = async (event: DragEvent, rowUuid: string) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format - looking for JournalEntryPage
    if (data.type === 'JournalEntryPage' && data.uuid) {
      if (rowUuid) {
        await campaignStore.updateLoreJournalEntry(rowUuid, data.uuid);
      }
    }
  }

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>