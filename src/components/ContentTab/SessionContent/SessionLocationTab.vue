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
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="showLocationPicker=true"
    @dragover-new="DragDropService.standardDragover"
    @dropNew="onDropNew"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
  <RelatedEntryDialog
    v-model="showLocationPicker"
    :topic="Topics.Location"
    :mode="props.arcMode ? RelatedEntryDialogModes.ArcLocation : RelatedEntryDialogModes.Session"
  />

</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, useArcStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { localize } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop';
  import { notifyInfo } from '@/utils/notifications';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedEntryDialog from '@/components/dialogs/RelatedEntryDialog.vue';

  // types
  import { BaseTableColumn, Topics, RelatedEntryDialogModes, ArcTableTypes, SessionTableTypes, CellEditCompleteEvent, EntryNodeDragData, BaseTableGridRow, } from '@/types';
  import { ArcLocation, SessionLocation } from '@/documents';
  
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
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const arcStore = useArcStore();
  const { relatedLocationRows: sessionLocationRows } = storeToRefs(sessionStore);
  const { locationRows: arcLocationRows } = storeToRefs(arcStore);
  const { currentArc } = useContentState();

  ////////////////////////////////
  // data
  const showLocationPicker = ref<boolean>(false);
  const campaignHasSessions = ref<boolean>(false);  // are any sessions in the campaign this belongs to?

  ////////////////////////////////
  // computed data
  const locationRows = computed(() => props.arcMode ? arcLocationRows.value : sessionLocationRows.value);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const mappedLocationRows = computed(() => (
    locationRows.value.map((row) => ({
      ...row,
    }))
  ));

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = props.arcMode ? 
      arcStore.extraFields[ArcTableTypes.Location] :
      sessionStore.extraFields[SessionTableTypes.Location]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data, removedUUIDs) => onDeleteLocation(data.uuid, removedUUIDs), 
      tooltip: localize('tooltips.deleteLocation'),
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
      // only show for arc mode if the campaign has at least one session
      display: (data) => (props.arcMode && campaignHasSessions.value)
        || (!props.arcMode && !data.delivered), // hide arrow for things already delivered
      callback: (data) => onMoveLocationToNext(data.uuid), 
      tooltip: props.arcMode ? localize('tooltips.copyToNextSession') : localize('tooltips.moveToNextSession') 
    }
  ]));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDeleteLocation = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await store.value.deleteLocation(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
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

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data - looking for location entries
    const data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== DragDropService.FCBDragTypes.Entry)
      return;

    const fcbEntry = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;

    // make sure it's the right format
    if (!fcbEntry || fcbEntry.topic !== Topics.Location || !fcbEntry.childId) {
      return;
    }

    await store.value.addLocation(fcbEntry.childId);
  };

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    const reorderedLocations = reorderedRows.map((row) => {
      const location = locationRows.value.find(l => l.uuid === row.uuid);

      // rows have extra fields we don't want
      if (props.arcMode) {
        return {
          uuid: row.uuid,
          notes: location?.notes ?? '',
        } as ArcLocation;
      } else {
        return {
          uuid: row.uuid,
          delivered: location?.delivered ?? false,
          notes: location?.notes ?? '',
        } as SessionLocation;
      }
    });

    await store.value.reorderLocations(reorderedLocations);
  };

  ////////////////////////////////
  // watchers
  watch(currentArc, async (newArc) => {
    if (newArc) {
      const campaign = await newArc?.loadCampaign();
      campaignHasSessions.value = (campaign?.sessionIndex?.length || 0) > 0;
    } else {
      campaignHasSessions.value = true;
    }
  }, { immediate: true });


  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>