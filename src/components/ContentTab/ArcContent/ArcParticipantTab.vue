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
    @add-item="onAddItem"
    @dragoverNew="onDragoverNew"
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
  import { Topics, CellEditCompleteEvent,} from '@/types';
  import { localize } from '@/utils/game'
  import { getValidatedData } from '@/utils/dragdrop';
  import { getTopicText } from '@/compendia';
  import { notifyInfo } from '@/utils/notifications';
  import { mapEntryToOption } from '@/utils/misc';


  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedItemDialog from '@/components/dialogs/RelatedItemDialog.vue';
  
  // types
  import { Entry } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

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

  const columns = computed(() => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = arcStore.extraFields[ArcTableTypes.Participant]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data) => onDeleteParticipant(data.uuid), 
      tooltip: localize('tooltips.deleteNPC') 
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
  const onDeleteParticipant = async (uuid: string) => {
    await arcStore.deleteParticipant(uuid);
  }

  const onCopyParticipantToSession = async (uuid: string) => {
    await arcStore.copyParticipantToSession(uuid);
    notifyInfo(localize('notifications.participantCopiedToNextSession'));
  }

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, } = event;

    await arcStore.updateParticipantNotes(data.uuid, newValue as string);
  }
  
  const onDragoverNew = (event: DragEvent) => {
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
    if (![Topics.Character, Topics.Organization].includes(data.topic as Topics) || !data.childId) {
      return;
    }

    await arcStore.addParticipant(data.childId as string);      
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