<template>
  <BaseTable 
    :actions="actions"
    :rows="mappedLocationRows"
    :columns="columns"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLocation')" 
    :extra-add-text="localize('labels.session.addLocationDrag')"
    :allow-drop-row="false"
    :allow-edit="true"
    :help-text="localize('labels.session.locationHelpText')"
    help-link="https://slyflourish.com/designing_fantastic_locations.html"
    :can-reorder="false"
    @add-item="showLocationPicker=true"
    @dragover-new="onDragoverNew"
    @dropNew="onDropNew"
    @cell-edit-complete="onCellEditComplete"
  />
  <RelatedEntryDialog
    v-model="showLocationPicker"
    :topic="Topics.Location"
    :mode="props.arcMode ? RelatedEntryDialogModes.ArcLocation : RelatedEntryDialogModes.Session"
  />

</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, useArcStore, ArcTableTypes } from '@/applications/stores';
  import { Topics, RelatedEntryDialogModes, CellEditCompleteEvent, EntryNodeDragData, } from '@/types';
  import { localize } from '@/utils/game'
  import { getType, getValidatedData } from '@/utils/dragdrop';
  import { notifyInfo } from '@/utils/notifications';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedEntryDialog from '@/components/dialogs/RelatedEntryDialog.vue';

  // types
  
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
  const { relatedLocationRows: sessionLocationRows } = storeToRefs(sessionStore);
  const { locationRows: arcLocationRows } = storeToRefs(arcStore);

  ////////////////////////////////
  // data
  const showLocationPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const locationRows = computed(() => props.arcMode ? arcLocationRows.value : sessionLocationRows.value);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const mappedLocationRows = computed(() => (
    locationRows.value.map((row) => ({
      ...row,
    }))
  ));

  const columns = computed(() => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = props.arcMode ? 
      arcStore.extraFields[ArcTableTypes.Location] :
      sessionStore.extraFields[SessionTableTypes.Location]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data) => onDeleteLocation(data.uuid), 
      tooltip: localize('tooltips.deleteLocation') 
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
      display: (data) => !props.arcMode && !data.delivered, // hide arrow for things already delivered
      callback: (data) => onMarkLocationDelivered(data.uuid), 
      tooltip: localize('tooltips.markAsDelivered') 
    },
    { 
      icon: 'fa-circle-xmark', 
      display: (data) => !props.arcMode && data.delivered, 
      callback: (data) => onUnmarkLocationDelivered(data.uuid), 
      tooltip: localize('tooltips.unmarkAsDelivered') 
    },

    // move to next session
    { 
      icon: 'fa-share', 
      display: (data) => props.arcMode || !data.delivered, // hide arrow for things already delivered
      callback: (data) => onMoveLocationToNext(data.uuid), 
      tooltip: props.arcMode ? localize('tooltips.copyToNextSession') : localize('tooltips.moveToNextSession') 
    }
  ]));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDeleteLocation = async (uuid: string) => {
    await store.value.deleteLocation(uuid);
  }

  const onMarkLocationDelivered = async (uuid: string) => {
    if (!props.arcMode)
      await sessionStore.markLocationDelivered(uuid, true);
  }

  const onUnmarkLocationDelivered = async (uuid: string) => {
    if (!props.arcMode)
      await sessionStore.markLocationDelivered(uuid, false);
  }

  const onMoveLocationToNext = async (uuid: string) => {
    if (props.arcMode) {
      await arcStore.copyLocationToSession(uuid);
      notifyInfo(localize('notifications.locationCopiedToNextSession'));
    } else {
      await sessionStore.moveLocationToNext(uuid);
    }
  }

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    if (field === 'notes') {
      if (props.arcMode) {
        await arcStore.updateLocationNotes(data.uuid, newValue as string);
      } else {
        await sessionStore.updateLocationNotes(data.uuid, newValue as string);
      }
    }
  };

  const onDragoverNew = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data - looking for location entries
    const data = getValidatedData(event);
    if (!data || getType(data) !== 'fcb-entry')
      return;

    const fcbEntry = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;

    // make sure it's the right format
    if (!fcbEntry || fcbEntry.topic !== Topics.Location || !fcbEntry.childId) {
      return;
    }

    await store.value.addLocation(fcbEntry.childId);
  };

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>