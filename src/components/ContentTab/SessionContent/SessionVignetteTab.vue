<template>
  <SessionTable
    ref="sessionTableRef"
    :rows="relatedVignetteRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Vignette]"
    :delete-item-label="localize('tooltips.deleteVignette')"
    :allow-edit="false"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addVignette')"
    @add-item="onAddVignette"
    @delete-item="onDeleteVignette"
    @mark-item-delivered="onMarkVignetteDelivered"
    @unmark-item-delivered="onUnmarkVignetteDelivered"
    @move-to-next-session="onMoveVignetteToNext"
    @cell-edit-complete="onCellEditComplete"
  />
</template>

<script setup lang="ts">

  // library imports
  import { ref } from 'vue';
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
  const { relatedVignetteRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const sessionTableRef = ref<any>(null);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddVignette = async () => {
    const vignetteUuid = await sessionStore.addVignette();

      // If we successfully added an item, put its description column into edit mode
      if (vignetteUuid) {
      // We need to wait for the DOM to update first
      setTimeout(() => {
        if (sessionTableRef.value) {
          sessionTableRef.value.setEditingRow(vignetteUuid);
        }
      }, 50); // Small delay to ensure the DOM has updated
    }

  }

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'description':
        await sessionStore.updateVignetteDescription(data.uuid, newValue);
        break;

      default:
        originalEvent?.preventDefault();
        break;
    }  
  }

  const onDeleteVignette = async (uuid: string) => {
    await sessionStore.deleteVignette(uuid);
  }

  const onMarkVignetteDelivered = async (uuid: string) => {
    await sessionStore.markVignetteDelivered(uuid, true);
  }

  const onUnmarkVignetteDelivered = async (uuid: string) => {
    await sessionStore.markVignetteDelivered(uuid, false);
  }

  const onMoveVignetteToNext = async (uuid: string) => {
    await sessionStore.moveVignetteToNext(uuid);
  }

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>