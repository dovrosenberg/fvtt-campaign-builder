<template>
  <SessionTable
    :rows="relatedMonsterRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Monster]"
    :delete-item-label="localize('tooltips.deleteMonster')"
    :allow-edit="true"
    :edit-item-label="localize('tooltips.editRow')"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addMonster')"
    :extra-add-text="localize('labels.session.addMonsterDrag')"
    :draggable-rows="true"
    @add-item="showMonsterPicker=true"
    @drop-new="onDropNew"
    @dragoverNew="onDragoverNew"
    @delete-item="onDeleteMonster"
    @mark-item-delivered="onMarkMonsterDelivered"
    @unmark-item-delivered="onUnmarkMonsterDelivered"
    @move-to-next-session="onMoveMonsterToNext"
    @cell-edit-complete="onCellEditComplete"
    @dragstart="onDragStart"
  />
  <RelatedDocumentsDialog
    v-model="showMonsterPicker"
    document-type="actor"
    @added="onActorAdded"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import { getValidatedData, actorDragStart } from '@/utils/dragdrop';

  // library components
	
  // local components
  import SessionTable from '@/components/Tables/SessionTable.vue';
  import RelatedDocumentsDialog from '@/components/Tables/RelatedDocumentsDialog.vue';
  import { DataTableCellEditCompleteEvent } from 'primevue';

  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { relatedMonsterRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const showMonsterPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onActorAdded = async (documentUuid: string) => {
    await sessionStore.addMonster(documentUuid, 1); // Always use 1 as the default
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
      await sessionStore.addMonster(data.uuid);  
    }
  }

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'number':
        if (parseInt(newValue))  {
          await sessionStore.updateMonsterNumber(data.uuid, parseInt(newValue));
        } else {
          originalEvent.preventDefault();
        }
        break;

      default:
        originalEvent.preventDefault();
        break;
    }  
  }

  const onDeleteMonster = async (uuid: string) => {
    await sessionStore.deleteMonster(uuid);
  }

  const onMarkMonsterDelivered = async (uuid: string) => {
    await sessionStore.markMonsterDelivered(uuid, true);
  }

  const onUnmarkMonsterDelivered = async (uuid: string) => {
    await sessionStore.markMonsterDelivered(uuid, false);
  }

  const onMoveMonsterToNext = async (uuid: string) => {
    await sessionStore.moveMonsterToNext(uuid);
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