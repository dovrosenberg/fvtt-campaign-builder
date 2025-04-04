<template>
  <SessionTable
    :rows="relatedSceneRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Scene]"
    :delete-item-label="localize('tooltips.deleteScene')"
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addScene')"
    @add-item="onAddScene"
    @delete-item="onDeleteScene"
    @mark-item-delivered="onMarkSceneDelivered"
    @unmark-item-delivered="onUnmarkSceneDelivered"
    @move-to-next-session="onMoveSceneToNext"
    @cell-edit-complete="onCellEditComplete"
  />
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'

  // library components
	
  // local components
  import SessionTable from '@/components/Tables/SessionTable.vue';

  // types
  import { DataTableCellEditCompleteEvent } from 'primevue';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { relatedSceneRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddScene = async () => {
    await sessionStore.addScene();
  }

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'description':
        await sessionStore.updateSceneDescription(data.uuid, newValue);
        break;

      default:
        originalEvent?.preventDefault();
        break;
    }  
  }

  const onDeleteScene = async (uuid: string) => {
    await sessionStore.deleteScene(uuid);
  }

  const onMarkSceneDelivered = async (uuid: string) => {
    await sessionStore.markSceneDelivered(uuid, true);
  }

  const onUnmarkSceneDelivered = async (uuid: string) => {
    await sessionStore.markSceneDelivered(uuid, false);
  }

  const onMoveSceneToNext = async (uuid: string) => {
    await sessionStore.moveSceneToNext(uuid);
  }

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>