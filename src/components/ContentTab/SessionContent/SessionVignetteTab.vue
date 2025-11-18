<template>
  <BaseTable
    ref="sessionTableRef"
    :actions="actions"
    :columns="columns"
    :rows="mappedVignetteRows"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addVignette')"
    :allow-drop-row="false"
    :allow-edit="true"
    :draggable-rows="false"
    :help-text="localize('labels.session.vignetteHelpText')"
    help-link="https://slyflourish.com/scenes_catch_all_step.html"
    :can-reorder="true"
    @add-item="onAddVignette"
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
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { BaseTableGridRow, CellEditCompleteEvent } from '@/types';
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

  const columns = computed(() => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = sessionStore.extraFields[SessionTableTypes.Vignette]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data) => onDeleteVignette(data.uuid), 
      tooltip: localize('tooltips.deleteVignette') 
    },
    {
      icon: 'fa-pen', 
      isEdit: true, 
      callback: () => {},
      tooltip: localize('tooltips.editRow') 
    },

    // deliver/undeliver buttons
    { 
      icon: 'fa-circle-check', 
      display: (data) => !data.delivered, 
      callback: (data) => onMarkVignetteDelivered(data.uuid), 
      tooltip: localize('tooltips.markAsDelivered') 
    },
    { 
      icon: 'fa-circle-xmark', 
      display: (data) => data.delivered, 
      callback: (data) => onUnmarkVignetteDelivered(data.uuid), 
      tooltip: localize('tooltips.unmarkAsDelivered') 
    },

    // move to next session
    { 
      icon: 'fa-share', 
      display: (data) => !data.delivered, // hide arrow for things already delivered
      callback: (data) => onMoveVignetteToNext(data.uuid), 
      tooltip: localize('tooltips.moveToNextSession') 
    }
  ]));


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

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'description':
        await sessionStore.updateVignetteDescription(data.uuid, newValue as string);
        break;

      default:
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