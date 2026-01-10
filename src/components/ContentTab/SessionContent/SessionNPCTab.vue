<template>
  <BaseTable 
    :actions="actions"
    :rows="mappedNPCRows"
    :columns="columns"  
    :show-add-button="true"
    :add-button-label="localize('labels.session.addNPC')" 
    :extra-add-text="localize('labels.session.addNPCDrag')"
    :allow-edit="true"
    :help-text="localize('labels.session.npcHelpText')"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="showNPCPicker=true"
    @dragoverNew="DragDropService.standardDragover"
    @drop-new="onDropNew"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
  <RelatedEntryDialog
    v-model="showNPCPicker"
    :topic="Topics.Character"
    :mode="RelatedEntryDialogModes.Session"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore} from '@/applications/stores';
  import { Topics, RelatedEntryDialogModes, EntryNodeDragData,} from '@/types';
  import { localize } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop'; 
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedEntryDialog from '@/components/dialogs/RelatedEntryDialog.vue';

  // types
  import { CellEditCompleteEvent, SessionTableTypes, BaseTableColumn, BaseTableGridRow } from '@/types';
  import { SessionNPC } from '@/documents';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

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

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = sessionStore.extraFields[SessionTableTypes.NPC]

    return [ actionColumn, ...extraFields];
  });

   const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data, removedUUIDs) => onDeleteNPC(data.uuid, removedUUIDs), 
      tooltip: localize('tooltips.deleteNPC'),
    },
    {
      icon: 'fa-pen', 
      isEdit: true, 
      callback: () => {},
      tooltip: localize('tooltips.editNotes') 
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
  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'notes':
        await sessionStore.updateNPCNotes(data.uuid, newValue as string);
        break;

      default:
        break;
    }  
  }

  const onDeleteNPC = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await sessionStore.deleteNPC(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
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

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data  - looking for entry node
    const data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== DragDropService.FCBDragTypes.Entry) {
      return;
    }

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;
    if (!fcbData || fcbData.topic !== Topics.Character) {
      return;
    }

    // make sure it's the right format
    if (fcbData.topic !== Topics.Character || !fcbData.childId) {
      return;
    }

    await sessionStore.addNPC(fcbData.childId);      
  };

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    const reorderedNPCs = reorderedRows.map((row) => {
      const npc = relatedNPCRows.value.find(n => n.uuid === row.uuid);

      // rows have extra fields we don't want
      return {
        uuid: row.uuid,
        delivered: npc?.delivered ?? false,
        notes: npc?.notes ?? '',
      } as SessionNPC;
    });

    await sessionStore.reorderNPCs(reorderedNPCs);
  };


  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>