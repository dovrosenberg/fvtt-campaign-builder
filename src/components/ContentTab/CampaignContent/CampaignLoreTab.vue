<template>
  <div class="campaign-lore-container flexcol">
    <!-- For available lore -->
    <BaseTable
      ref="availableLoreRef"
      :actions="actions"
      :rows="availableLoreRows"
      :columns="columns"
      :show-add-button="true"
      :add-button-label="localize('labels.session.addLore')"
      :allow-edit="true"
      :allow-drop-row="false"
      :help-text="localize('labels.campaign.loreHelpText')"
      help-link="https://slyflourish.com/sharing_secrets.html"

      @add-item="onAddLore"
      @cell-edit-complete="onCellEditComplete"
      @reorder="onReorder"
    />
      <!-- 
      :grouped="isGrouped"
      :groups="loreGroups"
      @reorder="availableGroupedTable.onReorder"
      @reorder-group="(items) => groupedTable.onReorderGroup(items, loreGroups)
      @group-add="availableGroupedTable.onGroupAdd"
      @group-edit="availableGroupedTable.onGroupEdit"
      @group-delete="availableGroupedTable.onGroupDelete" -->

    <!-- For delivered lore -->
    <div style="font-size: 1.3em; font-weight: bold; margin: 0.5rem 0 -1rem 8px"> 
      Delivered Lore
    </div>
    <BaseTable
      :actions="deliveredActions"
      :rows="deliveredLoreRows"
      :columns="deliveredColumns"
      :allow-drop-row="false"
      :allow-delete="true"
      :can-reorder="false"
      :delete-item-label="localize('tooltips.deleteLore')"
      :allow-edit="true"
      :show-add-button="false"
      @cell-edit-complete="onCellEditComplete"
    />
  </div>
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, inject } from 'vue';

  // local imports
  import { useCampaignStore, } from '@/applications/stores';
  import { CAMPAIGN_DERIVED_STATE_KEY } from '@/composables/useCampaignDerivedState';
  import { localize } from '@/utils/game'
  
  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { BaseTableColumn, CampaignTableTypes, CellEditCompleteEvent, GroupableItem } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const campaignDerivedState = inject(CAMPAIGN_DERIVED_STATE_KEY, null);
  const { deliveredLoreRows, allRelatedLoreRows, availableLoreRows, } = campaignDerivedState;

  ////////////////////////////////
  // data
  const availableLoreRef = ref<any>(null);

  ////////////////////////////////
  // computed data
  // const isGrouped = computed(() => {
  //   // Access reactive version to create dependency on settings changes
  //   ModuleSettings.getReactiveVersion();
  //   return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[GroupableItem.CampaignLore] || false;
  // });

  // Grouped table composable
  // const availableGroupedTable = useGroupedTable(campaignStore.groupStores[GroupableItem.CampaignLore]);

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = campaignStore.extraFields[CampaignTableTypes.Lore]

    return [ actionColumn, ...extraFields];
  });

  const deliveredColumns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const extraFields = campaignStore.extraFields[CampaignTableTypes.DeliveredLore]

    return [ actionColumn, ...extraFields];
  });

  const actions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data) => onDeleteLore(data.uuid), 
      tooltip: localize('tooltips.deleteLore') 
    },
    {
      icon: 'fa-pen', 
      isEdit: true, 
      callback: () => {},
      tooltip: localize('tooltips.editRow') 
    },

    // only deliver on top table
    { 
      icon: 'fa-circle-check', 
      display: (data) => !data.delivered, 
      callback: (data) => onMarkLoreDelivered(data.uuid), 
      tooltip: localize('tooltips.markAsDelivered') 
    },

    // move to next arc
    {
      icon: 'fa-arrow-down',
      display: (data) => !data.delivered, // hide arrow for things already delivered
      callback: (data) => moveLoreToArc(data.uuid, data.description as string),
      tooltip: localize('tooltips.moveToLatestArc')
    },
    // move to next session
    {
      icon: 'fa-share',
      display: (data) => !data.delivered, // hide arrow for things already delivered
      callback: (data) => moveLoreToLastSession(data.uuid, data.description as string),
      tooltip: localize('tooltips.moveToNextSession')
    }
  ]));

  const deliveredActions = computed(() => ([
    {
      icon: 'fa-trash', 
      callback: (data) => onDeleteLore(data.uuid), 
      tooltip: localize('tooltips.deleteLore') 
    },
    {
      icon: 'fa-pen', 
      isEdit: true, 
      callback: () => {},
      tooltip: localize('tooltips.editRow') 
    },

    // only undeliver
    { 
      icon: 'fa-circle-xmark', 
      display: (data) => data.delivered, 
      callback: (data) => onUnmarkLoreDelivered(data.uuid), 
      tooltip: localize('tooltips.unmarkAsDelivered') 
    },
  ]));


  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // only applicable to the available lore table
  const onAddLore = async () => {
    // Add the lore and get the UUID of the newly added item
    const loreUuid = await campaignStore.addLore();
    
    // If we successfully added a lore item, put its description column into edit mode
    if (loreUuid) {
      // We need to wait for the DOM to update first
      setTimeout(() => {
        if (availableLoreRef.value) {
          availableLoreRef.value.setEditingRow(loreUuid);
        }
      }, 50); // Small delay to ensure the DOM has updated
    }
  }

  const onReorder = async (reorderedRows: CampaignLoreRow[]) => {
    campaignStore.reorderAvailableLore(reorderedRows);
  };

  /**
   * Finds the lockedToSessionId for a lore row by uuid.
   * @param uuid the lore UUID
   * @returns the session ID if session-level, or null for campaign-level
   */
  const getSessionIdForLore = (uuid: string): string | null => {
    const row = allRelatedLoreRows.value.find(r => r.uuid === uuid);
    return row?.lockedToSessionId ?? null;
  };

  // only applicable to the available lore table
  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'description':
        await campaignStore.updateLoreDescription(data.uuid, newValue as string, getSessionIdForLore(data.uuid));
        break;

      default:
        break;
    }
  }

  const onDeleteLore = async (uuid: string) => {
    await campaignStore.deleteLore(uuid, getSessionIdForLore(uuid));
  }

  // only applicable to the available lore table
  const onMarkLoreDelivered = async (uuid: string) => {
    await campaignStore.markLoreDelivered(uuid, true, getSessionIdForLore(uuid));
  }

  // only applicable to the delivered lore table
  const onUnmarkLoreDelivered = async (uuid: string) => {
    await campaignStore.markLoreDelivered(uuid, false, getSessionIdForLore(uuid));
  }

  const moveLoreToLastSession = async (uuid: string, description: string) => {
    await campaignStore.moveLoreToLastSession(uuid, description);
  }

  const moveLoreToArc = async (uuid: string, description: string) => {
    await campaignStore.moveLoreToArc(uuid, description);
  }


  ////////////////////////////////
  // watchers
  

  ////////////////////////////////
  // lifecycle events
  

</script>

<style lang="scss">
  .campaign-lore-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }
</style>