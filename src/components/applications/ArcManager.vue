<template>
  <Teleport to="body">
    <Dialog 
      v-model="show"
      :title="localize('applications.arcManager.title')"
      :buttons="[
        {
          label: localize('labels.cancel'),
          default: false,
          close: true,
          callback: onCancel,
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
          close: false,
          callback: onClickSubmit,
        },
      ]"
      @cancel="onCancel"
    >
      <div class="standard-form scrollable">
        <BaseTable
          :rows="rows"
          :columns="columns"
          :show-add-button="true"
          :show-filter="false"
          :can-reorder="true"
          :allow-edit="true"
          :add-button-label="localize('applications.arcManager.labels.add')"
          :actions="actions"
          @add-item="onAddItem"
          @cell-edit-complete="onCellEditComplete"
          @reorder="onRowReorder"
        />
      </div>
    </Dialog>
  </Teleport>
</template> 

<script setup lang="ts">
  // library imports
  import { computed, onMounted, ref, watch } from 'vue';
  
  // local imports
  import { arcManagerApp } from '@/applications/settings/ArcManagerApplication';
  import { localize } from '@/utils/game';
  import { Campaign, Arc } from '@/classes';
  import { ArcBasicIndex, ActionButtonDefinition } from '@/types';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import Dialog from '@/components/Dialog.vue';

  // types
  import { DataTableCellEditCompleteEvent } from 'primevue';
  
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
  const arcs = ref<Arc[]>([]);
  const originalArcs = ref<Arc[]>([]);
  const show = ref<boolean>(true);

  ////////////////////////////////
  // computed data
  const rows = computed((): any[] => (
    arcs.value.map((arc, index) => ({
      uuid: arc.uuid,
      name: arc.name,
      startSessionNumber: arc.startSessionNumber,
      endSessionNumber: arc.endSessionNumber,
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
    { 
      icon: 'fa-trash', 
      callback: (data) => onDeleteItem(data.uuid), 
      tooltip: localize('applications.arcManager.labels.delete') 
    },
    { 
      icon: 'fa-edit', 
      callback: (data) => onEditItem(data.uuid), 
      tooltip: localize('applications.arcManager.labels.edit'),
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
    return sessionIndex ? sessionIndex.name : `Session ${sessionNumber}`;
  };

  /**
   * Load campaign and arcs data
   */
  const loadData = async () => {
    if (!props.campaignId) return;
    
    try {
      campaign.value = await Campaign.fromUuid(props.campaignId);
      if (!campaign.value) return;

      // Load full arc objects
      const loadedArcs: Arc[] = [];
      for (const arcIndex of campaign.value.arcIndex) {
        const arc = await Arc.fromUuid(arcIndex.uuid);
        if (arc) {
          loadedArcs.push(arc);
        }
      }
      
      // Sort by sortOrder
      loadedArcs.sort((a, b) => a.sortOrder - b.sortOrder);
      
      arcs.value = loadedArcs;
      originalArcs.value = [...loadedArcs];
    } catch (error) {
      console.error('Failed to load arc data:', error);
    }
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

  const onAddItem = async (): Promise<void> => {
    if (!campaign.value) return;

    // Create a new arc properly
    const newArc = await Arc.create(campaign.value, 'New Arc');
    if (newArc) {
      arcs.value.push(newArc);
    }
  };

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent): Promise<void> => {
    const { data, field, newValue } = event;
    
    // Find the arc in our list and update the specific field
    const arcIndex = arcs.value.findIndex(a => a.uuid === data.uuid);
    if (arcIndex !== -1) {
      const arc = arcs.value[arcIndex];
      
      if (field === 'name') {
        arc.name = newValue;
      } else if (field === 'startSessionNumber' || field === 'endSessionNumber') {
        const numValue = parseInt(newValue) || -1;
        (arc as any)[field] = numValue;
      }
    }
  };

  const onRowReorder = (reorderedRows: any[]): Promise<void> => {
    // Update the sortOrder for all arcs based on the new order
    reorderedRows.forEach((row, index) => {
      const arc = arcs.value.find(a => a.uuid === row.uuid);
      if (arc) {
        arc.sortOrder = index;
      }
    });
    
    // Reorder the arcs array to match
    arcs.value.sort((a, b) => a.sortOrder - b.sortOrder);
    
    return Promise.resolve();
  };

  const onClickSubmit = async () => {
    if (!campaign.value) return;

    try {
      // Save each arc with updated sortOrder
      for (let index = 0; index < arcs.value.length; index++) {
        const arc = arcs.value[index];
        arc.sortOrder = index;
        await arc.save();
      }

      // Close the application
      arcManagerApp?.close();
      show.value = false;
    } catch (error) {
      console.error('Failed to save arcs:', error);
    }
  };

  const onClickReset = async () => {
    arcs.value = [...originalArcs.value];
  };

  const onCancel = () => {
    arcManagerApp?.close();
  };

  ////////////////////////////////
  // watchers
  watch(() => props.campaignId, () => {
    loadData();
  }, { immediate: true });
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    await loadData();
  });
  

</script>

<style lang="scss">
  .application.fcb-arc-manager {
    // hide the wrapper window
    display: none;
  }
</style>
