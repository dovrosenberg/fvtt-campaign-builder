<template>
  <BaseTable 
    :actions="actions"
    :rows="mappedParticipantRows"
    :columns="columns"  
    :show-add-button="true"
    :add-button-label="localize('labels.arc.addParticipant')" 
    :extra-add-text="localize('labels.arc.addParticipantDrag')"
    :allow-edit="true"
    :help-text="localize('labels.arc.participantHelpText')"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="onAddItem"
    @dragoverNew="standardDragover"
    @drop-new="onDropNew"
    @cell-edit-complete="onCellEditComplete"
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
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { ArcTableTypes, useArcStore, useMainStore } from '@/applications/stores';
  import { Topics, CellEditCompleteEvent, EntryNodeDragData,} from '@/types';
  import { localize } from '@/utils/game'
  import { getType, getValidatedData, standardDragover } from '@/utils/dragdrop';
  import { getTopicText } from '@/compendia';
  import { notifyInfo } from '@/utils/notifications';
  import { mapEntryToOption } from '@/utils/misc';
  import { FCBDragTypes } from '@/utils/dragdrop';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedItemDialog from '@/components/dialogs/RelatedItemDialog.vue';
  
  // types
  import { BaseTableColumn } from '@/types';
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
  const mainStore = useMainStore();
  const { participantRows } = storeToRefs(arcStore);
  const { currentSetting } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const showParticipantPicker = ref<boolean>(false);
  const addOptions = ref<{id: string; label: string}[]>([]);

  ////////////////////////////////
  // computed data
  const mappedParticipantRows = computed(() => {
    if (!currentSetting.value) 
      return [];

    // add a field for the topic - we assume they can only be character or org
    return participantRows.value.map((row) => {
      const isChar = isEntryCharacter(row.uuid);

      return {
        ...row,
        topic: isChar ? Topics.Character : Topics.Organization,
        type: row.type || (isChar ? getTopicText(Topics.Character) : getTopicText(Topics.Organization))
      };
    });
  });

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = arcStore.extraFields[ArcTableTypes.Participant]

    return [ actionColumn, ...extraFields];
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
      display: (data) => (data.topic===Topics.Character),
      callback: (data) => onCopyParticipantToSession(data.uuid), 
      tooltip: localize('tooltips.copyToNextSession') 
    }
  ]));

  ////////////////////////////////
  // methods
  const isEntryCharacter = (uuid: string) => {
    if (!currentSetting.value)
      throw new Error ('No current setting found in ArcParticipantTab.isEntryCharacter()');

    // see if it's in the characters topic
    return currentSetting.value.topics[Topics.Character]?.entries.some((entry) => entry.uuid === uuid);
  }

  ////////////////////////////////
  // event handlers
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
    const data = getValidatedData(event);
    if (!data || getType(data) !== FCBDragTypes.Entry) {
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
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>