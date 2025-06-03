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
      @delete-item="onDeleteIdea"
      @add-item="onAddIdea"
      @cell-edit-complete="onCellEditComplete"
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
  import BaseTable from '@/components/BaseTable/BaseTable.vue';
  
  // types
  import { Idea } from '@/types';
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

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style> 