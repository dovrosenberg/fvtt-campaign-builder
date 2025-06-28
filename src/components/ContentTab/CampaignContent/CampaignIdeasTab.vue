<template>
  <div class="tab-inner">
    <BaseTable
      ref="availableIdeaRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="localize('labels.campaign.addIdea')"
      :track-delivery="false"
      :allow-drop-row="false"
      :rows="mappedIdeaRows"
      :columns="columns"
      :allow-edit="true"
      :edit-item-label="localize('tooltips.editRow')"
      :delete-item-label="localize('tooltips.deleteIdea')"
      :show-move-to-campaign="false"
      :draggable-rows="false"
      :can-reorder="true"
      @delete-item="onDeleteIdea"
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
  import { useCampaignStore, CampaignTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { Idea, BaseTableGridRow } from '@/types';
  import { DataTableCellEditCompleteEvent } from 'primevue';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const { ideaRows } = storeToRefs(campaignStore);

  ////////////////////////////////
  // data
  const availableIdeaRef = ref<InstanceType<typeof BaseTable> | null>(null);

  ////////////////////////////////
  // computed data
  const mappedIdeaRows = computed(() => {
    return ideaRows.value.map((idea: Idea) => ({
      uuid: idea.uuid,
      text: idea.text,
      sortOrder: idea.sortOrder,
    }));
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
    await campaignStore.deleteIdea(uuid);
  };

  const onAddIdea = async () => {
    // Add the idea and get the UUID of the newly added item
    const ideaUuid = await campaignStore.addIdea();

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

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field } = event;
    
    if (field === 'text') {
      await campaignStore.updateIdea(data.uuid, newValue as string);
    }
  };

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    // we need to use the sortOrder and uuid to reorder the idea items (because the grid rows are not idea items)
    const reorderedIdeas = [] as Idea[];
    for (const row of reorderedRows) {
      reorderedIdeas.push(ideaRows.value.find(idea => idea.uuid === row.uuid) as Idea);
    }
    await campaignStore.reorderIdeas(reorderedIdeas);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style> 