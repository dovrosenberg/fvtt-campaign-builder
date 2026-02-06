<template>
  <div class="campaign-lore-container flexcol">
    <!-- For available lore -->
    <BaseTable
      ref="availableLoreRef"
      :actions="actions"
      :rows="mappedAvailableLoreRows"
      :columns="columns"
      :show-add-button="true"
      :add-button-label="localize('labels.session.addLore')"
      :allow-edit="true"
      :allow-drop-row="false"
      :help-text="localize('labels.campaign.loreHelpText')"
      help-link="https://slyflourish.com/sharing_secrets.html"
      @add-item="onAddLore"
      @cell-edit-complete="onCellEditComplete"
      @reorder="onReorderAvailable"
    />

    <!-- For delivered lore -->
    <div style="font-size: 1.3em; font-weight: bold; margin: 0.5rem 0 -1rem 8px"> 
      Delivered Lore
    </div>
    <BaseTable
      :actions="deliveredActions"
      :rows="mappedDeliveredLoreRows"
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
  import { storeToRefs } from 'pinia';
  import { computed, ref } from 'vue';

  // local imports
  import { useCampaignStore, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import DragDropService from '@/utils/dragDrop'; 
  
  // library components
	
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { BaseTableColumn, CampaignTableTypes, BaseTableGridRow, CampaignLoreDetails, CellEditCompleteEvent } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const { availableLoreRows, deliveredLoreRows } = storeToRefs(campaignStore);
  
  ////////////////////////////////
  // data
  const availableLoreRef = ref<any>(null);

  ////////////////////////////////
  // computed data
  const mappedAvailableLoreRows = computed(() => (
    availableLoreRows.value.map((row) => ({
      ...row,
    }))
  ));

  const mappedDeliveredLoreRows = computed(() => (
    deliveredLoreRows.value.map((row) => ({
      ...row,
    }))
  ));

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
      callback: (data) => moveLoreToArc(data.uuid), 
      tooltip: localize('tooltips.movetoLatestArc') 
    },
    // move to next session
    { 
      icon: 'fa-share', 
      display: (data) => !data.delivered, // hide arrow for things already delivered
      callback: (data) => moveLoreToLastSession(data.uuid), 
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

  // only applicable to the available lore table
  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field, } = event;

    switch (field) {
      case 'description':
        await campaignStore.updateLoreDescription(data.uuid, newValue as string);
        break;

      default:
        break;
    }  
  }

  const onDeleteLore = async (uuid: string) => {
    await campaignStore.deleteLore(uuid);
  }

  // only applicable to the available lore table
  const onMarkLoreDelivered = async (uuid: string) => {
    await campaignStore.markLoreDelivered(uuid, true);
  }

  // only applicable to the delivered lore table
  const onUnmarkLoreDelivered = async (uuid: string) => {
    await campaignStore.markLoreDelivered(uuid, false);
  }

  const moveLoreToLastSession = async (uuid: string) => {
    await campaignStore.moveLoreToLastSession(uuid);
  }

  const moveLoreToArc = async (uuid: string) => {
    await campaignStore.moveLoreToArc(uuid);
  }


  const onReorderAvailable = async (reorderedRows: BaseTableGridRow[]) => {
    // Reorder using array order 
    const reorderedLore = reorderedRows.map((row) => availableLoreRows.value.find(lore => lore.uuid === row.uuid) as CampaignLoreDetails);
    await campaignStore.reorderAvailableLore(reorderedLore);
  };

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