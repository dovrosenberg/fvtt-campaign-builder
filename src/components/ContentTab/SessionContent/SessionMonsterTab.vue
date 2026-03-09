<template>
  <BaseTable
    :actions="actions"
    :rows="monsterRows"
    :columns="columns"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addMonster')"
    :extra-add-text="localize('labels.session.addMonsterDrag')"
    :allow-drop-row="false"
    :allow-edit="true"
    :draggable-rows="true"
    :grouped="isGrouped"
    :groups="monsterGroups"
    :help-text="localize('labels.session.monsterHelpText')"
    help-link="https://slyflourish.com/choose_monsters_based_on_the_story.html"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="showMonsterPicker=true"
    @drop-new="onDropNew"
    @dragoverNew="DragDropService.standardDragover"
    @dragstart="onDragStart"
    @cell-edit-complete="onCellEditComplete"
    @reorder="groupedTable.onReorder"
    @reorder-group="(items) => groupedTable.onReorderGroup(items, monsterGroups)"
    @group-add="groupedTable.onGroupAdd"
    @group-edit="groupedTable.onGroupEdit"
    @group-delete="groupedTable.onGroupDelete"
  />
  <RelatedDocumentsDialog
    v-model="showMonsterPicker"
    document-type="actor"
    @added="onActorAdded"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, computed, watch, inject } from 'vue';

  // local imports
  import { useSessionStore, useArcStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useGroupedTable } from '@/composables/useGroupedTable';
  import { ARC_DERIVED_STATE_KEY } from '@/composables/useArcDerivedState';
  import { SESSION_DERIVED_STATE_KEY } from '@/composables/useSessionDerivedState';
  import { localize } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop'; 
  import { notifyInfo } from '@/utils/notifications';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/dialogs/RelatedDocumentsDialog.vue';

  // types
  import { CellEditCompleteEvent, ArcTableTypes, SessionTableTypes, BaseTableColumn, GroupableItem, } from '@/types';
  
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
  const sessionDerivedState = inject(SESSION_DERIVED_STATE_KEY, null);
  const arcDerivedState = inject(ARC_DERIVED_STATE_KEY, null);
  const { currentArc } = useContentState();
  
  ////////////////////////////////
  // data
  const showMonsterPicker = ref<boolean>(false);
  const campaignHasSessions = ref<boolean>(false);  // are any sessions in the campaign this belongs to?

  ////////////////////////////////
  // computed data
  const derivedState = computed(() => props.arcMode ? arcDerivedState : sessionDerivedState);
  const monsterRows = computed(() => derivedState.value?.monsterRows.value ?? []);
  const monsterGroups = computed(() => derivedState.value?.monsterGroups.value ?? []);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const isGrouped = computed(() => {
    // Access reactive version to create dependency on settings changes
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[
      props.arcMode ?
      GroupableItem.ArcMonsters :
      GroupableItem.SessionMonsters
    ] || false;
  });

  // Grouped table composable
  const groupedTable = useGroupedTable(
    (props.arcMode ? arcStore : sessionStore)
    .groupStores[props.arcMode ? GroupableItem.ArcMonsters : GroupableItem.SessionMonsters]
  );
  
  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = props.arcMode ? 
      arcStore.extraFields[ArcTableTypes.Monster] :
      sessionStore.extraFields[SessionTableTypes.Monster]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data, removedUUIDs) => onDeleteMonster(data.uuid, removedUUIDs), 
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
      display: (data) => !props.arcMode && !data.delivered, 
      callback: (data) => onMarkMonsterDelivered(data.uuid), 
      tooltip: localize('tooltips.markAsDelivered') 
    },
    { 
      icon: 'fa-circle-xmark', 
      display: (data) => !props.arcMode && data.delivered, 
      callback: (data) => onUnmarkMonsterDelivered(data.uuid), 
      tooltip: localize('tooltips.unmarkAsDelivered') 
    },

    // move to next session
    { 
      icon: 'fa-share', 
      // only show for arc mode if the campaign has at least one session
      display: (data) => (props.arcMode && campaignHasSessions.value)
        || (!props.arcMode && !data.delivered), // hide arrow for things already delivered
      callback: (data) => onMoveMonsterToNext(data.uuid, data.number as number),
      tooltip: props.arcMode ? localize('tooltips.copyToNextSession') : localize('tooltips.moveToNextSession') 
    }
  ]));

  
  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onActorAdded = async (documentUuid: string) => {
    await store.value.addMonster(documentUuid);
  }

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data - looking for raw foundry data
    let data = DragDropService.getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format
    if (data.type==='Actor' && data.uuid) {
      await store.value.addMonster(data.uuid as string);  
    }
  }

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'number':
        if (parseInt(newValue as string))  {
          await sessionStore.updateMonsterNumber(data.uuid, parseInt(newValue as string));
        }
        break;
      case 'notes':
        if (props.arcMode) {
          await arcStore.updateMonsterNotes(data.uuid, newValue as string);
        } else {
          await sessionStore.updateMonsterNotes(data.uuid, newValue as string);
        }
        break;

      default:
        break;
    }  
  }

  const onDeleteMonster = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await store.value.deleteMonster(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
  }

  const onMarkMonsterDelivered = async (uuid: string) => {
    await sessionStore.markMonsterDelivered(uuid, true);
  }

  const onUnmarkMonsterDelivered = async (uuid: string) => {
    await sessionStore.markMonsterDelivered(uuid, false);
  }

  const onMoveMonsterToNext = async (uuid: string, number: number) => {
    if (props.arcMode) {
      await arcStore.copyMonsterToSession(uuid);
      notifyInfo(localize('notifications.monsterCopiedToNextSession'));
    } else {
      await sessionStore.moveMonsterToNext(uuid, number);
    }
  }

  const onDragStart = async (event: DragEvent, uuid: string) => {
    await DragDropService.actorDragStart(event, uuid);
  }

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