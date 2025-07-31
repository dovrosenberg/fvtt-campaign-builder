<template>
  <SessionTable
    ref="sessionTableRef"
    :rows="mappedVignetteRows"
    :columns="sessionStore.extraFields[SessionTableTypes.Vignette]"
    :delete-item-label="localize('tooltips.deleteVignette')"
    :allow-edit="true"
    :edit-item-label="localize('tooltips.editRow')"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addVignette')"
    :help-text="localize('labels.session.vignetteHelpText')"
    help-link="https://slyflourish.com/scenes_catch_all_step.html"
    :can-reorder="true"
    @add-item="onAddVignette"
    @delete-item="onDeleteVignette"
    @mark-item-delivered="onMarkVignetteDelivered"
    @unmark-item-delivered="onUnmarkVignetteDelivered"
    @move-to-next-session="onMoveVignetteToNext"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, SessionTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'

  // library components
	
  // local components
  import SessionTable from '@/components/tables/SessionTable.vue';

  // types
  import { DataTableCellEditCompleteEvent } from 'primevue';
  import { BaseTableGridRow } from '@/types';
  import { SessionVignette } from '@/documents';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const sessionStore = useSessionStore();
  const { vignetteRows } = storeToRefs(sessionStore);
  
  ////////////////////////////////
  // data
  const sessionTableRef = ref<any>(null);

  ////////////////////////////////
  // computed data
 const mappedVignetteRows = computed(() => (
    vignetteRows.value.map((row) => ({
      ...row,
    }))
  ));

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
  
  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    // Create properly ordered vignettes with updated sortOrder values
    const reorderedVignettes = reorderedRows.map((row, index) => {
      const vignette = vignetteRows.value.find(vignette => vignette.uuid === row.uuid) as SessionVignette;
      return { ...vignette, sortOrder: index };
    });
    await sessionStore.reorderVignettes(reorderedVignettes);
  };

  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">

</style>