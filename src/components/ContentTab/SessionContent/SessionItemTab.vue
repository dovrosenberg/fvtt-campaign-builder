<!--
SessionItemTab: Magic Items Tab

Purpose
- Display and manage magic items for sessions or arcs

Responsibilities
- Show table of magic items with add/delete/edit capabilities
- Support both session mode (with delivered tracking) and arc mode (with copy to session)
- Handle drag and drop for adding items

Props
- arcMode: boolean, whether to operate in arc mode (default false)

Emits
- relatedEntriesChanged: (addedUUIDs, removedUUIDs) when items are added/removed

Dependencies
- Stores: sessionStore, arcStore
- Composables: useGroupedTable, useSessionDerivedState, useArcDerivedState
-->

<template>
  <BaseTable
    :actions="actions"
    :rows="itemRows"
    :columns="columns"
    :show-add-button="true"
    :add-button-label="localize('labels.session.addItem')"
    :extra-add-text="localize('labels.session.addItemDrag')"
    :allow-edit="true"
    :grouped="isGrouped"
    :groups="itemGroups"
    :help-text="localize('labels.session.itemHelpText')"
    help-link="https://slyflourish.com/lazy_magic_items.html"
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="showItemPicker=true"
    @drop-new="onDropNew"
    @dragoverNew="DragDropService.standardDragover"
    @dragstart="onDragstart"
    @cell-edit-complete="onCellEditComplete"
    @reorder="groupedTable.onReorder"
    @reorder-group="(items) => groupedTable.onReorderGroup(items, itemGroups)"
    @group-add="groupedTable.onGroupAdd"
    @group-edit="groupedTable.onGroupEdit"
    @group-delete="groupedTable.onGroupDelete"
  />
  <RelatedDocumentsDialog
    v-model="showItemPicker"
    document-type="item"
    @added="onItemAdded"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, inject, watch } from 'vue';

  // local imports
  import { useSessionStore, useArcStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useGroupedTable } from '@/composables/useGroupedTable';
  import { SESSION_DERIVED_STATE_KEY } from '@/composables/useSessionDerivedState';
  import { ARC_DERIVED_STATE_KEY } from '@/composables/useArcDerivedState';
  import { localize, } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop'; 
  import { notifyInfo } from '@/utils/notifications';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/dialogs/RelatedDocumentsDialog.vue';

  // types
  import { CellEditCompleteEvent, SessionTableTypes, ArcTableTypes, BaseTableColumn, GroupableItem } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    arcMode: {
      type: Boolean,
      default: false,
    },
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
  const { currentArc } = useContentState();

  // Get derived state based on mode
  const sessionDerivedState = props.arcMode ? null : inject(SESSION_DERIVED_STATE_KEY);
  const arcDerivedState = props.arcMode ? inject(ARC_DERIVED_STATE_KEY) : null;
  
  // Store reference for actions
  const store = computed(() => props.arcMode ? arcStore : sessionStore);
  
  ////////////////////////////////
  // data
  const showItemPicker = ref<boolean>(false);
  const campaignHasSessions = ref<boolean>(false);  // are any sessions in the campaign this belongs to?

  ////////////////////////////////
  // computed data
  const derivedState = computed(() => props.arcMode ? arcDerivedState : sessionDerivedState);
  const itemRows = computed(() => derivedState.value?.itemRows.value ?? []);
  const itemGroups = computed(() => derivedState.value?.itemGroups.value ?? []);

  const isGrouped = computed(() => {
    // Access reactive version to create dependency on settings changes
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[
      props.arcMode ?
      GroupableItem.ArcItems :
      GroupableItem.SessionItems
    ] || false;
  });

  // Grouped table composable
  const groupedTable = useGroupedTable(
    (props.arcMode ? arcStore : sessionStore)
    .groupStores[props.arcMode ? GroupableItem.ArcItems : GroupableItem.SessionItems]
  );
  
  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const dragColumn = { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' };

    const extraFields = props.arcMode 
      ? arcStore.extraFields[ArcTableTypes.Item]
      : sessionStore.extraFields[SessionTableTypes.Item];

    return [ actionColumn, dragColumn, ...extraFields];
  });

  const actions = computed(() => {
    const baseActions = [
      {
        icon: 'fa-trash', 
        callback: (data, removedUUIDs) => onDeleteItem(data.uuid, removedUUIDs), 
        tooltip: localize('tooltips.deleteItem'),
      },
      {
        icon: 'fa-pen', 
        isEdit: true, 
        callback: () => {},
        tooltip: localize('tooltips.editNotes') 
      },
    ];

    // Session-only actions (delivered tracking)
    if (!props.arcMode) {
      baseActions.push(
        // deliver/undeliver buttons
        { 
          icon: 'fa-circle-check', 
          display: (data) => !data.delivered, 
          callback: (data) => onMarkItemDelivered(data.uuid), 
          tooltip: localize('tooltips.markAsDelivered') 
        },
        { 
          icon: 'fa-circle-xmark', 
          display: (data) => data.delivered, 
          callback: (data) => onUnmarkItemDelivered(data.uuid), 
          tooltip: localize('tooltips.unmarkAsDelivered') 
        },

        // move to next session
        { 
          icon: 'fa-share', 
          display: (data) => !data.delivered, // hide arrow for things already delivered
          callback: (data) => onMoveItemToNext(data.uuid), 
          tooltip: localize('tooltips.moveToNextSession') 
        }
      );
    } else {
      // Arc-only action (copy to next session)
      baseActions.push({
        icon: 'fa-share',
        // only show for arc mode if the campaign has at least one session
        display: () => campaignHasSessions.value,
        callback: (data) => onCopyItemToSession(data.uuid),
        tooltip: localize('tooltips.copyToNextSession'),
      });
    }

    return baseActions;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onItemAdded = async (documentUuid: string) => {
    await store.value.addItem(documentUuid);
  }

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data  - looking for raw foundry data
    let data = DragDropService.getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format
    if (data.type === 'Item' && data.uuid) {
      await store.value.addItem(data.uuid as string);  
    }
  }

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'notes':
        await store.value.updateItemNotes(data.uuid, newValue as string);
        break;

      default:
        break;
    }  
  }

  const onDeleteItem = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await store.value.deleteItem(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
  }

  // Session-only handlers
  const onMarkItemDelivered = async (uuid: string) => {
    if (!props.arcMode) {
      await sessionStore.markItemDelivered(uuid, true);
    }
  }

  const onUnmarkItemDelivered = async (uuid: string) => {
    if (!props.arcMode) {
      await sessionStore.markItemDelivered(uuid, false);
    }
  }

  const onMoveItemToNext = async (uuid: string) => {
    if (!props.arcMode) {
      await sessionStore.moveItemToNext(uuid);
    }
  }

  // Arc-only handler
  const onCopyItemToSession = async (uuid: string) => {
    if (props.arcMode) {
      await arcStore.copyItemToSession(uuid);
      notifyInfo(localize('notifications.itemCopiedToNextSession'));
    }
  }

  const onDragstart = async (event: DragEvent, uuid: string) => {
    await DragDropService.itemDragStart(event, uuid);
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