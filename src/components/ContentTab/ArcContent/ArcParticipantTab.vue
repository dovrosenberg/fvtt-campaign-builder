<template>
  <BaseTable 
    :actions="actions"
    :rows="participantRows"
    :columns="columns"  
    :show-add-button="true"
    :add-button-label="localize('labels.arc.addParticipant')" 
    :extra-add-text="localize('labels.arc.addParticipantDrag')"
    :allow-edit="true"
    :grouped="isGrouped"
    :groups="participantGroups"
    :help-text="localize('labels.arc.participantHelpText')"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="onAddItem"
    @dragoverNew="DragDropService.standardDragover"
    @drop-new="onDropNew"
    @dragstart="onDragStart"
    @cell-edit-complete="onCellEditComplete"
    @reorder="groupedTable.onReorder"
    @reorder-group="(items) => groupedTable.onReorderGroup(items, participantGroups)"
    @group-add="groupedTable.onGroupAdd"
    @group-edit="groupedTable.onGroupEdit"
    @group-delete="groupedTable.onGroupDelete"
  />
  <RelatedItemDialog
    v-model="showParticipantPicker"
    :title="localize('dialogs.relatedEntries.entry.title')"
    :main-button-label="localize('dialogs.relatedEntries.entry.buttonTitle')"
    :options="addOptions"
    :extra-fields="[]"
    :allow-create="false"
    @main-button-click="onDialogSubmitClick"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, watch, inject } from 'vue';

  // local imports
  import { useArcStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useGroupedTable } from '@/composables/useGroupedTable';
  import { ARC_DERIVED_STATE_KEY } from '@/composables/useArcDerivedState';
  import { Topics, CellEditCompleteEvent, EntryNodeDragData,} from '@/types';
  import { localize } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop'; 
  import { notifyInfo } from '@/utils/notifications';
  import { mapEntryToOption } from '@/utils/misc';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedItemDialog from '@/components/dialogs/RelatedItemDialog.vue';
  
  // types
  import { BaseTableColumn, ArcTableTypes, GroupableItem, } from '@/types';
  import { Entry } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const arcStore = useArcStore();
  const { participantRows, participantGroups } = inject(ARC_DERIVED_STATE_KEY)!;
  const { currentSetting, currentArc } = useContentState();
  
  ////////////////////////////////
  // data
  const showParticipantPicker = ref<boolean>(false);
  const addOptions = ref<{id: string; label: string}[]>([]);
  const campaignHasSessions = ref<boolean>(false);  // are any sessions in the campaign this belongs to?

  ////////////////////////////////
  // computed data
  const isGrouped = computed(() => {
    // Access reactive version to create dependency on settings changes
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[GroupableItem.ArcParticipants] || false;
  });

  // Grouped table composable
  const groupedTable = useGroupedTable(arcStore.groupStores[GroupableItem.ArcParticipants]);

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const dragColumn = { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' };

    const extraFields = arcStore.extraFields[ArcTableTypes.Participant]

    return [ actionColumn, dragColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data, removedUUIDs) => onDeleteParticipant(data.uuid, removedUUIDs), 
      tooltip: localize('tooltips.deleteNPC'),
    },

    {
      icon: 'fa-edit',
      isEdit: true, 
      callback: () => {}, 
      tooltip: localize('tooltips.editParticipant') 
    },

    // copy to next session - only for characters
    { 
      icon: 'fa-share', 
      display: (data) => (data.topic===Topics.Character) && campaignHasSessions.value,
      callback: (data) => onCopyParticipantToSession(data.uuid), 
      tooltip: localize('tooltips.copyToNextSession') 
    }
  ]));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDragStart = async (event: DragEvent, actorId: string) => {
    await DragDropService.actorDragStart(event, actorId);
  };

  const onDeleteParticipant = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await arcStore.deleteParticipant(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
  }

  const onCopyParticipantToSession = async (uuid: string) => {
    await arcStore.copyParticipantToSession(uuid);
    notifyInfo(localize('notifications.participantCopiedToNextSession'));
  }

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, } = event;

    await arcStore.updateParticipantNotes(data.uuid, newValue as string);
  }
  
  
  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data - make sure its an entry
    const data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== DragDropService.FCBDragTypes.Entry) {
      return;
    }

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;

    // make sure it's the right format
    if (!fcbData || ![Topics.Character, Topics.Organization].includes(fcbData.topic) || !fcbData.childId) {
      return;
    }

    await arcStore.addParticipant(fcbData.childId as string);      
  };

  const onDialogSubmitClick = async (selectedItemId: string, extraFieldValues: Record<string, string>) => {
    if (selectedItemId) {
      const fullEntry = await Entry.fromUuid(selectedItemId);

      if (fullEntry) {
        await arcStore.addParticipant(fullEntry.uuid, extraFieldValues.role || '');
      }
    };
  };

  const onAddItem = () => {
    if (!currentSetting.value)
      return;

    // characters and organizations only
    let entries = [] as { id: string; label: string }[];
    for (const topic of [Topics.Character, Topics.Organization]) {
      entries = entries.concat(
        (currentSetting.value.topics[topic]?.entries || []).map(mapEntryToOption)
      );
    }
    addOptions.value = entries;

    showParticipantPicker.value = true;
  };

  ////////////////////////////////
  // watchers
  watch(currentArc, async (newArc) => {
    if (newArc) {
      const campaign = await newArc?.loadCampaign();
      campaignHasSessions.value = (campaign?.sessionIndex?.length || 0) > 0;
    } else {
      campaignHasSessions.value = true;  // means we're in session mode
    }
  }, { immediate: true });

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>