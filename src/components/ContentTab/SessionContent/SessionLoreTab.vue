<template>
  <SessionTable
    :rows="relatedLoreRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Lore]"
    :delete-item-label="localize('tooltips.deleteLore')"
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLore')"
    :extra-add-text="localize('labels.session.addLoreDrag')"
    @row-select="onRowSelect($event.data.journalEntryPageId)"
    @add-item="onAddLore"
    @delete-item="onDeleteLore"
    @mark-item-delivered="onMarkLoreDelivered"
    @unmark-item-delivered="onUnmarkLoreDelivered"
    @move-to-next-session="onMoveLoreToNext"
    @cell-edit-complete="onCellEditComplete"
    @dragover="onDragover"
    @drop="onDrop"
  />
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
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
  const sessionStore = useSessionStore();
  const { relatedLoreRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddLore = async () => {
    await sessionStore.addLore();
  }

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'description':
        await sessionStore.updateLoreDescription(data.uuid, newValue);
        break;

      default:
        originalEvent?.preventDefault();
        break;
    }  
  }

  const onRowSelect = async (journalEntryPageId: string) => {
    // the uuid is of the lore, not the journal entry
    const page = await fromUuid(journalEntryPageId) as JournalEntryPage | null
    ;
    await page?.sheet?.render(true);
  }

  const onDeleteLore = async (uuid: string) => {
    await sessionStore.deleteLore(uuid);
  }

  const onMarkLoreDelivered = async (uuid: string) => {
    await sessionStore.markLoreDelivered(uuid, true);
  }

  const onUnmarkLoreDelivered = async (uuid: string) => {
    await sessionStore.markLoreDelivered(uuid, false);
  }

  const onMoveLoreToNext = async (uuid: string) => {
    await sessionStore.moveLoreToNext(uuid);
  }

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format - looking for JournalEntryPage
    if (data.type === 'JournalEntryPage' && data.uuid) {
      // Create a new lore entry and associate it with the journal entry page
      const lore = await sessionStore.addLore('');
      if (lore) {
        await sessionStore.updateLoreJournalEntry(lore, data.uuid);
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