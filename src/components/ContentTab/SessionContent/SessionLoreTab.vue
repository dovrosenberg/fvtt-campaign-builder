<template>
  <BaseTable
    ref="sessionTableRef"
    :actions="actions"
    :rows="loreRows"
    :columns="columns"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addLore')"
    :allow-drop-row="false"
    :grouped="isGrouped"
    :groups="loreGroups"
    :help-text="localize('labels.session.loreHelpText')"
    help-link="https://slyflourish.com/sharing_secrets.html"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="onAddLore"
    @cell-edit-complete="onCellEditComplete"
    @reorder="groupedTable.onReorder"
    @reorder-group="(items) => groupedTable.onReorderGroup(items, loreGroups)"
    @group-add="groupedTable.onGroupAdd"
    @group-edit="groupedTable.onGroupEdit"
    @group-delete="groupedTable.onGroupDelete"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, watch, inject } from 'vue';

  // local imports
  import { useSessionStore, useArcStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useGroupedTable } from '@/composables/useGroupedTable';
  import { ARC_DERIVED_STATE_KEY } from '@/composables/useArcDerivedState';
  import { SESSION_DERIVED_STATE_KEY } from '@/composables/useSessionDerivedState';
  import { localize } from '@/utils/game'
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { ArcTableTypes, SessionTableTypes, CellEditCompleteEvent, BaseTableColumn, GroupableItem } from '@/types';
  
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
  const sessionLoreRows = computed(() => sessionDerivedState?.loreRows.value ?? []);
  const sessionLoreGroups = computed(() => sessionDerivedState?.loreGroups.value ?? []);
  const arcDerivedState = inject(ARC_DERIVED_STATE_KEY, null);
  const arcLoreRows = computed(() => arcDerivedState?.loreRows.value ?? []);
  const arcLoreGroups = computed(() => arcDerivedState?.loreGroups.value ?? []);
  const { currentArc } = useContentState();
  
  ////////////////////////////////
  // data
  const sessionTableRef = ref<any>(null);
  const campaignHasSessions = ref<boolean>(false);  // are any sessions in the campaign this belongs to?

  ////////////////////////////////
  // computed data
  const loreRows = computed(() => props.arcMode ? arcLoreRows.value : sessionLoreRows.value);
  const loreGroups = computed(() => props.arcMode ? arcLoreGroups.value : sessionLoreGroups.value);
  const store = computed(() => props.arcMode ? arcStore : sessionStore);

  const isGrouped = computed(() => {
    // Access reactive version to create dependency on settings changes
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[
      props.arcMode ?
      GroupableItem.ArcLore :
      GroupableItem.SessionLore
    ] || false;
  });

  // Grouped table composable
  const groupedTable = useGroupedTable(
    (props.arcMode ? arcStore : sessionStore)
    .groupStores[props.arcMode ? GroupableItem.ArcLore : GroupableItem.SessionLore]
  );

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = props.arcMode ? 
      arcStore.extraFields[ArcTableTypes.Lore] :
      sessionStore.extraFields[SessionTableTypes.Lore]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => {
    return [
      {
        icon: 'fa-trash', 
        callback: (data, removedUUIDs) => onDeleteLore(data.uuid, removedUUIDs), 
        tooltip: localize('tooltips.deleteLore'),
      },
      {
        icon: 'fa-pen', 
        isEdit: true, 
        callback: () => {},
        tooltip: localize('tooltips.editRow')
      },

      // move up (to arc or campaign)
      {
        icon: 'fa-arrow-up',
        display: (data) => props.arcMode || !data.delivered,
        callback: (data) => onMoveLoreUp(data.uuid, data.description as string),
        tooltip: props.arcMode ? localize('tooltips.moveToCampaign') : localize('tooltips.moveToArc')
      },

      // deliver/undeliver buttons
      { 
        icon: 'fa-circle-check', 
        display: (data) => !props.arcMode && !data.delivered, // hide arrow for things already delivered
        callback: (data) => onMarkLoreDelivered(data.uuid), 
        tooltip: localize('tooltips.markAsDelivered') 
      },
      { 
        icon: 'fa-circle-xmark', 
        display: (data) => !props.arcMode && data.delivered, 
        callback: (data) => onUnmarkLoreDelivered(data.uuid), 
        tooltip: localize('tooltips.unmarkAsDelivered') 
      },

      // move to next session
      {
        icon: 'fa-share',
        // we hide if already delivered in session mode or no sessions in arc's campaign
        display: (data) => (props.arcMode && campaignHasSessions.value)
          || (!props.arcMode && !data.delivered), // hide arrow for things already delivered
        callback: (data) => onMoveLoreToNext(data.uuid, data.description as string),
        tooltip: localize('tooltips.moveToNextSession')
      }
    ];
  });


  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddLore = async () => {
    // Add the lore and get the UUID of the newly added item
    const loreUuid = await store.value.addLore();
    
    // If we successfully added a lore item, put its description column into edit mode
    if (loreUuid) {
      // We need to wait for the DOM to update first
      setTimeout(() => {
        if (sessionTableRef.value) {
          sessionTableRef.value.setEditingRow(loreUuid);
        }
      }, 50); // Small delay to ensure the DOM has updated
    }
  }

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'description':
        await store.value.updateLoreDescription(data.uuid, newValue as string);
        break;

      case 'significant':
        if (!props.arcMode)
          await sessionStore.markLoreSignificant(data.uuid, newValue as boolean);
        break;

      default:
        break;
    }  
  }

  const onDeleteLore = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await store.value.deleteLore(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
  }

  const onMarkLoreDelivered = async (uuid: string) => {
    if (!props.arcMode) 
      await sessionStore.markLoreDelivered(uuid, true);
  }

  const onUnmarkLoreDelivered = async (uuid: string) => {
    if (!props.arcMode) 
      await sessionStore.markLoreDelivered(uuid, false);
  }

  const onMoveLoreUp = async (uuid: string, description: string) => {
    if (props.arcMode)
      await arcStore.moveLoreToCampaign(uuid, description);
    else
      await sessionStore.moveLoreToArc(uuid, description);
  }

  const onMoveLoreToNext = async (uuid: string, description: string) => {
    if (props.arcMode)
      await arcStore.moveLoreToSession(uuid, description);
    else
      await sessionStore.moveLoreToNext(uuid, description);
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