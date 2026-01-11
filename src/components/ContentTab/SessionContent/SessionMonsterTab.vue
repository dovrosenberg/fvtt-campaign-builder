<template>
  <BaseTable
    :actions="actions"
    :rows="mappedMonsterRows"
    :columns="columns"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addMonster')"
    :extra-add-text="localize('labels.session.addMonsterDrag')"
    :allow-drop-row="false"
    :allow-edit="true"
    :draggable-rows="true"
    :help-text="localize('labels.session.monsterHelpText')"
    help-link="https://slyflourish.com/choose_monsters_based_on_the_story.html"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="showMonsterPicker=true"
    @drop-new="onDropNew"
    @dragoverNew="DragDropService.standardDragover"
    @dragstart="onDragStart"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
  <RelatedDocumentsDialog
    v-model="showMonsterPicker"
    document-type="actor"
    @added="onActorAdded"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, computed, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, useArcStore,  useMainStore, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop'; 
  import { notifyInfo } from '@/utils/notifications';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/tables/RelatedDocumentsDialog.vue';

  // types
  import { CellEditCompleteEvent, ArcTableTypes, SessionTableTypes, BaseTableColumn, BaseTableGridRow, ArcMonsterDetails, SessionMonsterDetails } from '@/types';
  import { ArcMonster, SessionMonster } from '@/documents';
  
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
  const mainStore = useMainStore();
  const { relatedMonsterRows: sessionMonsterRows } = storeToRefs(sessionStore);
  const { monsterRows: arcMonsterRows } = storeToRefs(arcStore);
  const { currentArc } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const showMonsterPicker = ref<boolean>(false);
  const campaignHasSessions = ref<boolean>(false);  // are any sessions in the campaign this belongs to?

  ////////////////////////////////
  // computed data
  const monsterRows = computed(() => (props.arcMode ? arcMonsterRows.value : sessionMonsterRows.value) as ArcMonsterDetails[] | SessionMonsterDetails[]);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const mappedMonsterRows = computed(() => (
    monsterRows.value.map((row) => ({
      ...row,
    }))
  ));
  
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
      callback: (data) => onMoveMonsterToNext(data.uuid), 
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

  const onMoveMonsterToNext = async (uuid: string) => {
    if (props.arcMode) {
      await arcStore.copyMonsterToSession(uuid);
      notifyInfo(localize('notifications.monsterCopiedToNextSession'));
    } else {
      await sessionStore.moveMonsterToNext(uuid);
    }
  }

  const onDragStart = async (event: DragEvent, uuid: string) => {
    await DragDropService.actorDragStart(event, uuid);
  }

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    const reorderedMonsters = reorderedRows.map((row) => {
      const monster = monsterRows.value.find(m => m.uuid === row.uuid);

      // rows have extra fields we don't want
      return props.arcMode ? {
        uuid: row.uuid,
        notes: monster!.notes ?? '',
      } as ArcMonster : {
        uuid: row.uuid,
        notes: monster!.notes ?? '',
        delivered: (monster as SessionMonsterDetails)!.delivered ?? false,
        number: (monster as SessionMonsterDetails)!.number ?? 0,
      } as SessionMonster;
    });

    await store.value.reorderMonsters(reorderedMonsters);
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