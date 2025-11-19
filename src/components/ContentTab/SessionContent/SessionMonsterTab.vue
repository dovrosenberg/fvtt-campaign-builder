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
    @add-item="showMonsterPicker=true"
    @drop-new="onDropNew"
    @dragoverNew="onDragoverNew"
    @dragstart="onDragStart"
    @cell-edit-complete="onCellEditComplete"
  />
  <RelatedDocumentsDialog
    v-model="showMonsterPicker"
    document-type="actor"
    @added="onActorAdded"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, computed } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, useArcStore, ArcTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import { getValidatedData, actorDragStart } from '@/utils/dragdrop';
  import { notifyInfo } from '@/utils/notifications';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/tables/RelatedDocumentsDialog.vue';

  // types
  import { CellEditCompleteEvent } from '@/types';
  
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
  const { relatedMonsterRows: sessionMonsterRows } = storeToRefs(sessionStore);
  const { monsterRows: arcMonsterRows } = storeToRefs(arcStore);
  
  ////////////////////////////////
  // data
  const showMonsterPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const monsterRows = computed(() => props.arcMode ? arcMonsterRows.value : sessionMonsterRows.value);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const mappedMonsterRows = computed(() => (
    monsterRows.value.map((row) => ({
      ...row,
    }))
  ));
  
  const columns = computed(() => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = props.arcMode ? 
      arcStore.extraFields[ArcTableTypes.Monster] :
      sessionStore.extraFields[SessionTableTypes.Monster]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data) => onDeleteMonster(data.uuid), 
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
      display: (data) => props.arcMode || !data.delivered, // hide arrow for things already delivered
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

  const onDragoverNew = (event: DragEvent) => {
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
        await arcStore.updateMonsterNotes(data.uuid, newValue as string);
        break;

      default:
        break;
    }  
  }

  const onDeleteMonster = async (uuid: string) => {
    await store.value.deleteMonster(uuid);
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
    await actorDragStart(event, uuid);
  }

  ////////////////////////////////
  // watchers


  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">

</style>