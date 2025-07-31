<template>
  <SessionTable
    ref="sessionTableRef"
    :rows="mappedLoreRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Lore]"
    :delete-item-label="localize('tooltips.deleteLore')"
    :allow-edit="true"
    :edit-item-label="localize('tooltips.editRow')"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLore')"
    :extra-add-text="localize('labels.session.addLoreDrag')"
    :allow-drop-row="true"
    :show-move-to-campaign="true"
    :help-text="localize('labels.session.loreHelpText')"
    help-link="https://slyflourish.com/sharing_secrets.html"
    :can-reorder="true"
    @add-item="onAddLore"
    @delete-item="onDeleteLore"
    @mark-item-delivered="onMarkLoreDelivered"
    @unmark-item-delivered="onUnmarkLoreDelivered"
    @move-to-next-session="onMoveLoreToNext"
    @move-to-campaign="onMoveToCampaign"
    @cell-edit-complete="onCellEditComplete"
    @dragover-new="onDragover"
    @dragover-row="onDragover"
    @drop-row="onDropRow"
    @drop-new="onDropNew"
    @reorder="onReorder"
  />
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';
  import { computed, ref } from 'vue';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import { getValidatedData } from '@/utils/dragdrop';
  import { FCBDialog } from '@/dialogs';

  // library components
	
  // local components
  import SessionTable from '@/components/tables/SessionTable.vue';

  // types
  import { DataTableCellEditCompleteEvent } from 'primevue';
  import { BaseTableGridRow, SessionLoreDetails } from '@/types';
  import { SessionLore } from '@/documents';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { loreRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const sessionTableRef = ref<any>(null);

  ////////////////////////////////
  // computed data
  const mappedLoreRows = computed(() => (
    loreRows.value.map((row) => ({
      ...row,
    }))
  ));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddLore = async () => {
    // Add the lore and get the UUID of the newly added item
    const loreUuid = await sessionStore.addLore();
    
    // If we successfully added a lore item, put its description column into edit mode
    if (loreUuid) {
      // We need to wait for the DOM to update first
      setTimeout(() => {
        if (sessionTableRef.value) {
          sessionTableRef.value.setEditingRow(loreUuid);
        }
      }, 50); // Small delay to ensure the DOM has updated
    }
  }

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'description':
        await sessionStore.updateLoreDescription(data.uuid, newValue);
        break;

      case 'significant':
        await sessionStore.markLoreSignificant(data.uuid, newValue);
        break;

      default:
        originalEvent?.preventDefault();
        break;
    }  
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

  const onMoveToCampaign = async (uuid: string) => {
    await sessionStore.moveLoreToCampaign(uuid);
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

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format - looking for JournalEntryPage
    if (data.type === 'JournalEntryPage' && data.uuid) {
      // Create a new lore entry and associate it with the journal entry page
      const loreId = await sessionStore.addLore('');

      if (loreId) {
        await sessionStore.updateLoreJournalEntry(loreId, data.uuid);
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
    if (data.type === 'JournalEntryPage' && data.uuid && rowUuid) {
      const lore = loreRows.value.find((l)=>l.uuid===rowUuid);
      
      if (lore?.journalEntryPageId && 
          !(await FCBDialog.confirmDialog('Update lore?', 'Are you sure you want to replace the journal entry tied to this lore?'))) {
        return;
      }
      
      await sessionStore.updateLoreJournalEntry(rowUuid, data.uuid);
    }
  }

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    // Create properly ordered lore with updated sortOrder values
    const reorderedLore = reorderedRows.map((row, index) => {
      const lore = loreRows.value.find(lore => lore.uuid === row.uuid) as SessionLoreDetails;
      return { 
        uuid: lore.uuid,
        description: lore.description,
        delivered: lore.delivered,
        significant: lore.significant,
        journalEntryPageId: lore.journalEntryPageId,
        sortOrder: index 
      } as SessionLore;
    });
    await sessionStore.reorderLore(reorderedLore);
  };

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>