<template>
  <BaseTable
    ref="sessionTableRef"
    :actions="actions"
    :rows="mappedLoreRows"
    :columns="columns"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLore')"
    :extra-add-text="localize('labels.session.addLoreDrag')"
    :allow-drop-row="true"
    :help-text="localize('labels.session.loreHelpText')"
    help-link="https://slyflourish.com/sharing_secrets.html"
    :can-reorder="true"
    @add-item="onAddLore"
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
  import { useSessionStore, useArcStore, SessionTableTypes, ArcTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import { getValidatedData } from '@/utils/dragdrop';
  import { FCBDialog } from '@/dialogs';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { CellEditCompleteEvent, BaseTableGridRow, SessionLoreDetails } from '@/types';
  import { SessionLore } from '@/documents';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    arcMode: {
      type: Boolean,
      required: false,
      default: false,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const arcStore = useArcStore();
  const { loreRows: sessionLoreRows } = storeToRefs(sessionStore);
  const { loreRows: arcLoreRows } = storeToRefs(arcStore);
  
  ////////////////////////////////
  // data
  const sessionTableRef = ref<any>(null);

  ////////////////////////////////
  // computed data
  const loreRows = computed(() => props.arcMode ? arcLoreRows.value : sessionLoreRows.value);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const mappedLoreRows = computed(() => (
    loreRows.value.map((row) => ({
      ...row,
    }))
  ));

  const columns = computed(() => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = props.arcMode ? 
      arcStore.extraFields[ArcTableTypes.Lore] :
      sessionStore.extraFields[SessionTableTypes.Lore]

    return [ actionColumn, ...extraFields];
  });

    const actions = computed(() => {
    return [
      {
        icon: 'fa-trash', 
        callback: (data) => onDeleteLore(data.uuid), 
        tooltip: localize('tooltips.deleteLore') 
      },
      {
        icon: 'fa-pen', 
        isEdit: true, 
        callback: () => {},
        tooltip: localize('tooltips.editRow')
      },

      // move up (to arc or campaign)
      { 
        icon: 'fa-arrow-up', 
        display: (data) => props.arcMode || !data.delivered,
        callback: (data) => onMoveLoreUp(data.uuid), 
        tooltip: props.arcMode ? localize('tooltips.moveToCampaign') : localize('tooltips.moveToArc') 
      },

      // deliver/undeliver buttons
      { 
        icon: 'fa-circle-check', 
        display: (data) => !props.arcMode && !data.delivered, // hide arrow for things already delivered
        callback: (data) => onMarkLoreDelivered(data.uuid), 
        tooltip: localize('tooltips.markAsDelivered') 
      },
      { 
        icon: 'fa-circle-xmark', 
        display: (data) => !props.arcMode && data.delivered, 
        callback: (data) => onUnmarkLoreDelivered(data.uuid), 
        tooltip: localize('tooltips.unmarkAsDelivered') 
      },

      // move to next session
      { 
        icon: 'fa-share', 
        display: (data) => props.arcMode || !data.delivered, // hide arrow for things already delivered
        callback: (data) => onMoveLoreToNext(data.uuid), 
        tooltip: localize('tooltips.moveToNextSession') 
      }
    ];
  });


  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddLore = async () => {
    // Add the lore and get the UUID of the newly added item
    const loreUuid = await store.value.addLore();
    
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

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'description':
        await store.value.updateLoreDescription(data.uuid, newValue as string);
        break;

      case 'significant':
        if (!props.arcMode)
          await sessionStore.markLoreSignificant(data.uuid, newValue as boolean);
        break;

      default:
        break;
    }  
  }

  const onDeleteLore = async (uuid: string) => {
    await store.value.deleteLore(uuid);
  }

  const onMarkLoreDelivered = async (uuid: string) => {
    if (!props.arcMode) 
      await sessionStore.markLoreDelivered(uuid, true);
  }

  const onUnmarkLoreDelivered = async (uuid: string) => {
    if (!props.arcMode) 
      await sessionStore.markLoreDelivered(uuid, false);
  }

  const onMoveLoreUp = async (uuid: string) => {
    if (props.arcMode)
      await arcStore.moveLoreToCampaign(uuid);
    else 
      await sessionStore.moveLoreToArc(uuid);
  }

  const onMoveLoreToNext = async (uuid: string) => {
    if (props.arcMode) 
      await arcStore.moveLoreToSession(uuid);
    else
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

    // make sure it's the right format - looking for JournalEntry(Page)
    if (['JournalEntry', 'JournalEntryPage'].includes(data.type as string) && data.uuid) {
      // Create a new lore entry and associate it with the journal entry page
      const loreId = await store.value.addLore('');

      if (loreId) {
        await store.value.updateLoreJournalEntry(loreId, data.uuid as string);
      }
    }
  }

  const onDropRow = async (event: DragEvent, rowUuid: string) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format - looking for JournalEntry(Page)
    if (['JournalEntry', 'JournalEntryPage'].includes(data.type as string) && data.uuid && rowUuid) {
      const lore = loreRows.value.find((l)=>l.uuid===rowUuid);
      
      if (lore?.journalEntryPageId && 
          !(await FCBDialog.confirmDialog('Update lore?', 'Are you sure you want to replace the journal entry tied to this lore?'))) {
        return;
      }
      
      await store.value.updateLoreJournalEntry(rowUuid, data.uuid as string);
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
    await store.value.reorderLore(reorderedLore);
  };

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>