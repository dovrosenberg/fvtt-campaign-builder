<template>
  <!-- For available lore -->
  <SessionTable
    ref="availableLoreRef"
    :rows="availableLoreRows"
    :columns="campaignStore.extraFields[CampaignTableTypes.Lore]"
    :delete-item-label="localize('tooltips.deleteLore')"
    :allow-edit="true"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLore')"
    :extra-add-text="localize('labels.session.addLoreDrag')"
    :allow-drop-row="true"
    @add-item="onAddLore"
    @delete-item="onDeleteLore"
    @mark-item-delivered="onMarkLoreDelivered"
    @move-to-next-session="onMoveLoreToNext"
    @cell-edit-complete="onCellEditComplete"
    @dragoverNew="onDragover"
    @dragoverRow="onDragover"
    @dropRow="onDropRow"
    @dropNew="onDropNew"
  />

  <!-- For delivered lore -->
  <div style="font-size: 1.3em; font-weight: bold"> 
    Delivered Lore
  </div>
  <SessionTable
    :rows="deliveredLoreRows"
    :columns="campaignStore.extraFields[CampaignTableTypes.DeliveredLore]"
    :allow-delete="true"
    :delete-item-label="localize('tooltips.deleteLore')"
    :allow-edit="true"
    :show-add-button="false"
    :allow-drop-row="false"
    @delete-item="onDeleteLore"
    @unmark-item-delivered="onUnmarkLoreDelivered"
    @cell-edit-complete="onCellEditComplete"
  />
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';
  import { ref } from 'vue';

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
  const { availableLoreRows, deliveredLoreRows } = storeToRefs(campaignStore);
  
  ////////////////////////////////
  // data
  const availableLoreRef = ref<any>(null);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // only applicable to the available lore table
  const onAddLore = async () => {
    // Add the lore and get the UUID of the newly added item
    const loreUuid = await campaignStore.addLore();
    
    // If we successfully added a lore item, put its description column into edit mode
    if (loreUuid) {
      // We need to wait for the DOM to update first
      setTimeout(() => {
        if (availableLoreRef.value) {
          availableLoreRef.value.setEditingRow(loreUuid);
        }
      }, 50); // Small delay to ensure the DOM has updated
    }
  }

  // only applicable to the available lore table
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

  // only applicable to the available lore table
  const onMarkLoreDelivered = async (uuid: string) => {
    await campaignStore.markLoreDelivered(uuid, true);
  }

  // only applicable to the delivered lore table
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