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
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="onAddVignette"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSessionStore, useArcStore, useMainStore, SessionTableTypes, ArcTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import { ModuleSettings, SettingKey } from '@/settings';


  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { BaseTableColumn, BaseTableGridRow, CellEditCompleteEvent } from '@/types';
  import { ArcVignette, SessionVignette } from '@/documents';

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
  const { vignetteRows: sessionVignetteRows } = storeToRefs(sessionStore);
  const { vignetteRows: arcVignetteRows } = storeToRefs(arcStore);
  const { currentArc } = storeToRefs(useMainStore());
  
  ////////////////////////////////
  // data
  const sessionTableRef = ref<any>(null);
  const campaignHasSessions = ref<boolean>(false);  // are any sessions in the campaign this belongs to?

  ////////////////////////////////
  // computed data
  const vignetteRows = computed(() => props.arcMode ? arcVignetteRows.value : sessionVignetteRows.value);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const mappedVignetteRows = computed(() => (
    vignetteRows.value.map((row) => ({
      ...row,
    }))
  ));

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = props.arcMode ? 
      arcStore.extraFields[ArcTableTypes.Vignette] :
      sessionStore.extraFields[SessionTableTypes.Vignette]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data, removedUUIDs) => onDeleteVignette(data.uuid, removedUUIDs), 
      tooltip: localize('tooltips.deleteVignette'),
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
      display: (data) => !props.arcMode && !data.delivered, 
      callback: (data) => onMarkVignetteDelivered(data.uuid), 
      tooltip: localize('tooltips.markAsDelivered') 
    },
    { 
      icon: 'fa-circle-xmark', 
      display: (data) => !props.arcMode && data.delivered, 
      callback: (data) => onUnmarkVignetteDelivered(data.uuid), 
      tooltip: localize('tooltips.unmarkAsDelivered') 
    },

    // move to next session
    { 
      icon: 'fa-share', 
      // only show for arc mode if the campaign has at least one session
      display: (data) => (props.arcMode && campaignHasSessions.value)
        || (!props.arcMode && !data.delivered), // hide arrow for things already delivered
      callback: (data) => onMoveVignetteToNext(data.uuid), 
      tooltip: localize('tooltips.moveToNextSession') 
    }
  ]));


  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddVignette = async () => {
    const vignetteUuid = await store.value.addVignette();

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
        await store.value.updateVignetteDescription(data.uuid, newValue as string);
        break;

      default:
        break;
    }  
  }

  const onDeleteVignette = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await store.value.deleteVignette(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
  }

  const onMarkVignetteDelivered = async (uuid: string) => {
    if (!props.arcMode)
      await sessionStore.markVignetteDelivered(uuid, true);
  }

  const onUnmarkVignetteDelivered = async (uuid: string) => {
    if (!props.arcMode)
      await sessionStore.markVignetteDelivered(uuid, false);
  }

  const onMoveVignetteToNext = async (uuid: string) => {
    if (props.arcMode)
      await arcStore.moveVignetteToSession(uuid);
    else
      await sessionStore.moveVignetteToNext(uuid);
  }
  
  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    // Reorder using array order
    const reorderedVignettes = reorderedRows.map((row) => vignetteRows.value.find(v => v.uuid === row.uuid) as ArcVignette | SessionVignette);
    // @ts-ignore - the type will match the store.value type
    await store.value.reorderVignettes(reorderedVignettes);
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