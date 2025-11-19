<template>
  <div class="tab-inner">
    <BaseTable
      ref="availableIdeaRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="localize('labels.campaign.addIdea')"
      :allow-drop-row="false"
      :rows="mappedIdeaRows"
      :columns="columns"
      :allow-edit="true"
      :edit-item-label="localize('tooltips.editRow')"
      :draggable-rows="false"
      :can-reorder="true"
      :actions="actions"
      @add-item="onAddIdea"
      @cell-edit-complete="onCellEditComplete"
      @reorder="onReorder"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, CampaignTableTypes, useArcStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { Idea, BaseTableGridRow, CellEditCompleteEvent } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    arcMode: {
      type: Boolean,
      default: false
    }
  })

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const arcStore = useArcStore();
  const { ideaRows: campaignIdeaRows } = storeToRefs(campaignStore);
  const { ideaRows: arcIdeaRows } = storeToRefs(arcStore);

  ////////////////////////////////
  // data
  const availableIdeaRef = ref<InstanceType<typeof BaseTable> | null>(null);

  ////////////////////////////////
  // computed data
  const store = computed(() => props.arcMode ? arcStore : campaignStore);
  const ideaRows = computed(() => props.arcMode ? arcIdeaRows.value : campaignIdeaRows.value);

  const mappedIdeaRows = computed(() => {
    return ideaRows.value.map((row: Idea) => ({
      ...row
    }));
  });

  const actions = computed(() => {
    return [
      { 
        icon: 'fa-trash', 
        callback: (data) => onDeleteIdea(data.uuid), 
        tooltip: localize('tooltips.deleteIdea') 
      },
      { 
        icon: 'fa-arrow-up',
        display: () => props.arcMode,
        callback: (data) => onMoveToCampaign(data.uuid), 
        tooltip: localize('tooltips.moveToCampaign') 
      },
      { 
        icon: 'fa-arrow-down', 
        display: () => !props.arcMode,
        callback: (data) => onMoveToArc(data.uuid), 
        tooltip: localize('tooltips.movetoLastArc') 
      },
      { 
        icon: 'fa-arrow-right', 
        display: () => !props.arcMode,
        callback: (data) => onMoveToToDo(data.uuid), 
        tooltip: localize('tooltips.moveToToDo') 
      },
    ];
  });

  const columns = computed(() => {
    // add actions    
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const columns = [ actionColumn ] as any[];
    for (const col of campaignStore.extraFields[CampaignTableTypes.Idea]) {
      columns.push(col);
    }

    return columns;
  });


  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDeleteIdea = async (uuid: string) => {
    await store.value.deleteIdea(uuid);
  };

  const onAddIdea = async () => {
    // Add the idea and get the UUID of the newly added item
    const ideaUuid = await store.value.addIdea();

    // If we successfully added an idea, put its description column into edit mode
    if (ideaUuid) {
      // We need to wait for the DOM to update first
      setTimeout(() => {
        if (availableIdeaRef.value) {
          availableIdeaRef.value.setEditingRow(ideaUuid);
        }
      }, 50); // Small delay to ensure the DOM has updated
    }
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field } = event;
    
    if (field === 'text') {
      await store.value.updateIdea(data.uuid, newValue as string);
    }
  };

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    // Create properly ordered ideas with updated sortOrder values
    const reorderedIdeas = reorderedRows.map((row, index) => {
      const idea = ideaRows.value.find(idea => idea.uuid === row.uuid) as Idea;
      return { ...idea, sortOrder: index };
    });
    await store.value.reorderIdeas(reorderedIdeas);
  };

  const onMoveToToDo = async (uuid: string) => {
    await campaignStore.moveIdeaToToDo(uuid);
  };

  const onMoveToCampaign = async (uuid: string) => {
    await arcStore.moveIdeaToCampaign(uuid);
  };

  const onMoveToArc = async (uuid: string) => {
    await campaignStore.moveIdeaToArc(uuid);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style> 