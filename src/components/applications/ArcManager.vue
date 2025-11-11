<template>
  <Teleport to="body">
    <Dialog 
      v-model="show"
      :title="localize('dialogs.arcManager.title')"
      :width="900"
      :buttons="[
        {
          label: localize('labels.cancel'),
          default: false,
          close: true,
          callback: () => { show=false; }
        },
        {
          label: localize('labels.reset'),
          default: false,
          close: false,
          callback: onClickReset,
        },
        {
          label: localize('labels.saveChanges'),
          default: true,
          close: true,
          callback: onClickSubmit,
        },
      ]"
    >
      <div class="standard-form scrollable">
        <BaseTable
          :rows="rows"
          :columns="columns"
          :show-add-button="false"
          :show-filter="false"
          :can-reorder="true"
          :allow-edit="true"
          :edit-button-label="localize('dialogs.arcManager.labels.edit')"
          :delete-button-label="localize('dialogs.arcManager.labels.delete')"
          :actions="actions"
          @row-edit-complete="onRowEditComplete"
          @reorder="onRowReorder"
        />
      </div>
    </Dialog>
  </Teleport>
</template> 

<script setup lang="ts">
  // library imports
  import { computed, ref, watch } from 'vue';
  
  // local imports
  import { localize } from '@/utils/game';
  import { Arc, Campaign, } from '@/classes';
  import { ActionButtonDefinition, ArcBasicIndex } from '@/types';
  import { useMainStore, useNavigationStore, useCampaignDirectoryStore } from '@/applications/stores';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import Dialog from '@/components/Dialog.vue';

  // types
  import { RowEditCompleteEvent } from '@/types';
  import { notifyWarn } from '@/utils/notifications';
  
  ////////////////////////////////
  // props
  interface Props {
    campaignId: string;
  }

  const props = defineProps<Props>();

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  
  ////////////////////////////////
  // data
  const campaign = ref<Campaign | null>(null);
  const arcs = ref<ArcBasicIndex[]>([]);
  const show = ref<boolean>(true);

  ////////////////////////////////
  // computed data
  const rows = computed((): any[] => (
    arcs.value.map((arc, index) => ({
      uuid: arc.uuid,
      name: arc.name,
      startSessionNumber: arc.startSessionNumber === -1 ? '' : arc.startSessionNumber,
      endSessionNumber: arc.endSessionNumber === -1 ? '' : arc.endSessionNumber,
      startSessionName: getSessionName(arc.startSessionNumber),
      endSessionName: getSessionName(arc.endSessionNumber),
      sortOrder: index,
    })
  )));

  const columns = computed((): any[] => {
    const dragColumn = { field: 'drag', style: 'width: 3rem; text-align: center;', header: '' };
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 75px;', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left; width: 25%;', header: 'Arc Name', sortable: false, editable: true, smallEditBox: true }; 
    const startSessionColumn = { field: 'startSessionNumber', style: 'text-align: left; width: 10%;', header: 'Start #', sortable: false, editable: true, smallEditBox: true };
    const startSessionNameColumn = { field: 'startSessionName', style: 'text-align: left; width: 20%;', header: 'Start Session', sortable: false, editable: false };
    const endSessionColumn = { field: 'endSessionNumber', style: 'text-align: left; width: 10%;', header: 'End #', sortable: false, editable: true, smallEditBox: true };
    const endSessionNameColumn = { field: 'endSessionName', style: 'text-align: left; width: 20%;', header: 'End Session', sortable: false, editable: false };

    return [dragColumn, actionColumn, nameColumn, startSessionColumn, startSessionNameColumn, endSessionColumn, endSessionNameColumn];
  });

  const actions = computed((): ActionButtonDefinition[] => [
    // don't allow delete from here... too dangerous
    // { 
    //   icon: 'fa-trash', 
    //   callback: (data) => onDeleteItem(data.uuid), 
    //   tooltip: localize('dialogs.arcManager.labels.delete') 
    // },
    { 
      icon: 'fa-edit', 
      callback: (data) => onEditItem(data.uuid), 
      tooltip: localize('dialogs.arcManager.labels.edit'),
      isEdit: true
    }
  ]);

  ////////////////////////////////
  // methods

  /**
   * Get the session name based on session number
   */
  const getSessionName = (sessionNumber: number): string => {
    if (!campaign.value || sessionNumber < 0) return '';
    
    const sessionIndex = campaign.value.sessionIndex.find(s => s.number === sessionNumber);
    return sessionIndex ? sessionIndex.name : `(${localize('dialogs.arcManager.missingSession')})`;
  };

  /** 
   * Forces reactive refresh
   */
  const refreshData = () => {
    arcs.value = [...arcs.value];
  };

  /**
   * Load campaign and arcs data from original
   */
  const loadData = () => {
    if (!campaign.value)
      return;
    
    arcs.value = foundry.utils.deepClone(campaign.value.arcIndex);
  };

  ////////////////////////////////
  // event handlers
  const onDeleteItem = async (uuid: string): Promise<void> => {
    // Remove the arc from our list
    const arcIndex = arcs.value.findIndex(a => a.uuid === uuid);
    if (arcIndex !== -1) {
      arcs.value.splice(arcIndex, 1);
    }
  };

  const onEditItem = async (uuid: string): Promise<void> => {
    // This would typically open the arc in the main application
    // For now, we'll just log it
    console.log('Edit arc:', uuid);
  };

  // if we want to allow this, we can't create the actual arcs here
  // we need to create just in the index then create when we save
  // const onAddItem = async (): Promise<void> => {
  //   if (!campaign.value) return;

  //   // Create a new arc properly
  //   const newArc = await Arc.create(campaign.value, 'New Arc');
  //   if (newArc) {
  //     arcs.value.push(newArc);
  //   }
  // };

  interface RowType {
    uuid: string;
    name: string;
    startSessionNumber: string;
    endSessionNumber: string;
    startSessionName: string;
    endSessionName: string;
    sortOrder: number;
  };
  
  const onRowEditComplete = async (event: RowEditCompleteEvent<RowType>): Promise<void> => {
    const { data, newData } = event;
    
    // Find the arc in our list and update the specific field
    const arcIndex = arcs.value.findIndex(a => a.uuid === data.uuid);
    const arc = arcs.value[arcIndex];

    // get the arc before and after the current one
    const prevArc = arcIndex > 0 ? arcs.value[arcIndex - 1] : null;
    const nextArc = arcIndex < arcs.value.length - 1 ? arcs.value[arcIndex + 1] : null;

    // convert blanks to -1
    newData.startSessionNumber = newData.startSessionNumber || '-1';
    newData.endSessionNumber = newData.endSessionNumber || '-1';

    // if the session numbers are bad, reset everything
    const newStartSession = Number.parseInt(newData.startSessionNumber);
    const newEndSession = Number.parseInt(newData.endSessionNumber);

    // if there are no current sessions, arc must be empty
    if (campaign.value?.currentSessionNumber == null &&
      (newStartSession !== -1 || newEndSession !== -1)
    ) {
      notifyWarn(localize('dialogs.arcManager.warning.mustBeBlank'));
      refreshData();
      return;
    }
    // make sure the session numbers were blank or a number
    if (isNaN(newStartSession) || isNaN(newEndSession) ||
        newStartSession < -1 || newEndSession < -1) {
      notifyWarn(localize('dialogs.arcManager.warning.invalidSessionNumber'));
      refreshData();
      return;
    } 
    // make sure the start session is less than the end session
    if (newStartSession > newEndSession) {
      notifyWarn(localize('dialogs.arcManager.warning.startTooHigh'));
      refreshData();
      return;
    }
    // the session numbers must either be both blank or both not blank
    if (newStartSession * newEndSession < 0) {
      notifyWarn(localize('dialogs.arcManager.warning.bothBlank'));
      refreshData();
      return;
    }

    // if the starting session changed, need to adjust the prior session
    if (prevArc && data.startSessionNumber !== newData.startSessionNumber) {
      // if we made it 0, all prior arcs must be empty
      if (newStartSession === 0) {
        for (let i=arcIndex-1; i>=0; i--) {
          arcs.value[i].endSessionNumber = -1;
          arcs.value[i].startSessionNumber = -1;
        }
      } else {
        prevArc.endSessionNumber = newStartSession-1;
      }
    }

    // if the ending session changed, need to adjust the next session
    if (nextArc && data.endSessionNumber !== newData.endSessionNumber) {
      // if we made it >= highest session number, all later arcs must be empty
      if (newEndSession >= campaign.value?.currentSessionNumber!) {
        for (let i=arcIndex+1; i<arcs.value.length; i++) {
          arcs.value[i].endSessionNumber = -1;
          arcs.value[i].startSessionNumber = -1;
        }
      } else {
        nextArc.startSessionNumber = newEndSession+1;
      }
    }

    arc.name = newData.name;
    arc.startSessionNumber = newStartSession;
    arc.endSessionNumber = newEndSession;

    // force refresh
    refreshData();
  };

  const onRowReorder = (reorderedRows: any[]) => {
    // Update the sortOrder for all arcs based on the new order
    reorderedRows.forEach((row, index) => {
      const arc = arcs.value.find(a => a.uuid === row.uuid);
      if (arc) {
        arc.sortOrder = index;
      }
    });
    
    // Reorder the arcs array to match
    arcs.value.sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const onClickSubmit = async () => {
    if (!campaign.value) return;

    // update the arcs and the indexes will get updated
    for (const arcIndex of arcs.value) {
      const arc = await Arc.fromUuid(arcIndex.uuid);

      if (!arc)
        throw new Error ('Bad arc in ArcManager.onClickSubmit()');

      const nameChange = arc.name !== arcIndex.name;

      arc.name = arcIndex.name;
      arc.startSessionNumber = arcIndex.startSessionNumber;
      arc.endSessionNumber = arcIndex.endSessionNumber;
      arc.sortOrder = arcIndex.sortOrder;
      await arc.save();

      // if name changed, need to propagate the change
      if (nameChange) {
        await useNavigationStore().propagateNameChange(arc.uuid, arcIndex.name);

        if (useMainStore().currentArc?.uuid === arc.uuid) {
          await useMainStore().refreshCurrentContent();
        }
      }
    }

    // force reload of all the arcs
    const ids = arcs.value.map(a => a.uuid);
    await useCampaignDirectoryStore().refreshCampaignDirectoryTree(ids);
  };

  const onClickReset = async () => {
    loadData();
  };

  ////////////////////////////////
  // watchers
  watch(() => props.campaignId, async () => {
    // load the index
    if (!props.campaignId) {
      throw new Error('No campaign ID provided in ArcManager.loadData()');
    }
    
    campaign.value = await Campaign.fromUuid(props.campaignId);
    if (!campaign.value) {
      throw new Error('Failed to load campaign data in ArcManager.loadData()');
    }

    loadData();
  }, { immediate: true });
  
  ////////////////////////////////
  // lifecycle events
  // onMounted(async () => {
  //   await loadData();
  // });
  

</script>

<style lang="scss">
  .application.fcb-arc-manager {
    // hide the wrapper window
    display: none;
  }
</style>
