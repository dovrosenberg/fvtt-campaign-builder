<template>
  <!-- A table to display/manage PCs -->
  <BaseTable
    :rows="pcRows"
    :columns="columns"
    :show-add-button="true"
    :extra-add-text="localize('labels.campaign.addPCDrag')"
    :showFilter="false"
    :allow-drop-row="false"
    :grouped="isGrouped"
    :groups="pcGroups"
    :add-button-label="localize('labels.campaign.addPC')"
    :actions="[{ icon: 'fa-trash', callback: (data) => onDeleteItemClick(data.uuid), tooltip: localize('tooltips.deleteRelationship') }]"
    @add-item="onAddItemClick"
    @drop-new="onDropNew"
    @dragover="DragDropService.standardDragover"
    @reorder="groupedTable.onReorder"
    @reorder-group="(items) => groupedTable.onReorderGroup(items, pcGroups)"
    @group-add="groupedTable.onGroupAdd"
    @group-edit="groupedTable.onGroupEdit"
    @group-delete="groupedTable.onGroupDelete"
  />

  <RelatedEntryDialog
    v-model="addDialogShow"
    :topic="Topics.PC"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :mode="RelatedEntryDialogModes.Add"
    :allow-create="false"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, inject } from 'vue';

  // local imports
  import { useCampaignStore, useNavigationStore, } from '@/applications/stores';
  import { useGroupedTable } from '@/composables/useGroupedTable';
  import { CAMPAIGN_DERIVED_STATE_KEY } from '@/composables/useCampaignDerivedState';
  import { SESSION_DERIVED_STATE_KEY } from '@/composables/useSessionDerivedState';
  import { localize } from '@/utils/game';
  import DragDropService from '@/utils/dragDrop'; 
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedEntryDialog from '@/components/dialogs/RelatedEntryDialog.vue';
  
  // types
  import { BaseTableColumn, RelatedEntryDialogModes, Topics, EntryNodeDragData, GroupableItem, CampaignPC } from '@/types';
  import { Entry } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    sessionMode: {
      type: Boolean,
      default: false
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const navigationStore = useNavigationStore();
  
  // Inject both states
  const campaignDerivedState = inject(CAMPAIGN_DERIVED_STATE_KEY, null);
  const sessionDerivedState = inject(SESSION_DERIVED_STATE_KEY, null);
  
  // Use session or campaign state based on mode
  const pcRows = computed(() => 
    props.sessionMode 
      ? sessionDerivedState?.pcRows.value ?? [] 
      : campaignDerivedState?.pcRows.value ?? []
  );

  const pcGroups = computed(() => 
    props.sessionMode 
      ? sessionDerivedState?.pcGroups.value ?? [] 
      : campaignDerivedState?.pcGroups.value ?? []
  );

  ////////////////////////////////
  // data
  const addDialogShow = ref(false);
  const editItem = ref({
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { itemId: string; itemName: string; extraFields: {field: string; header: string; value: string}[] });

  ////////////////////////////////
  // computed data

  const isGrouped = computed(() => {
    // Access reactive version to create dependency on settings changes
    ModuleSettings.getReactiveVersion();
    // Both session and campaign use CampaignPCs setting since they share groups
    return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[GroupableItem.CampaignPCs] || false;
  });

  // Grouped table composable - always use campaign store since data lives on campaign
  const groupedTable = useGroupedTable(campaignStore.groupStores[GroupableItem.CampaignPCs]);

  // TODO: why are these here instead of in the store like the others?
  // these are here because they can be; this is cleaner than sticking it all in the store
  // to move the others out, though, will require some refactoring because their onClick handlers need stuff in the store

  const columns = computed((): BaseTableColumn[] => [
    { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' },
    { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
    { field: 'actor', style: 'text-align: left', header: 'Character Sheet', sortable: true, onClick: onActorClick },
  ]);

  ////////////////////////////////
  // methods
  const onNameClick = async function (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string; }) { 
    await navigationStore.openEntry(rowData.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
  };

  const onActorClick = async function (_event: MouseEvent, rowData: Record<string, unknown> & { uuid: string; }) { 
    const pc = await Entry.fromUuid(rowData.uuid);

    if (!pc)
      return;

    const actor = await pc.getActor();
    if (actor)
      actor.sheet?.render(true);
  };

  ////////////////////////////////
  // event handlers
  const onAddItemClick = async () => {
    addDialogShow.value = true;
  };

  // call mutation to remove item from relationship
  const onDeleteItemClick = async function(_id: string) {
    void campaignStore.deletePC(_id);  // Always use campaign store - data lives on campaign
  };

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    const data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== DragDropService.FCBDragTypes.Entry) {
      return;
    }

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;
    
    // make sure it's the right format
    if (!fcbData || fcbData.topic !== Topics.PC || !fcbData.childId) {
      return;
    }

    const entry = await Entry.fromUuid(fcbData.childId);
    if (!entry)
      return;

    const details: CampaignPC = {
      uuid: fcbData.childId,
      type: 'PC',
      actorId: entry.actorId,
      groupId: null,
    };
    await campaignStore.addPC(details);  // Always use campaign store - data lives on campaign
  };
  

  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
