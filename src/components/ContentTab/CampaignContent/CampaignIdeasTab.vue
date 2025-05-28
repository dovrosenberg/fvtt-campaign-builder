<template>
  <div class="tab-inner">
    <BaseTable
      ref="baseTableRef"
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
      @delete-item="onDeleteIdeaItem"
      @add-item="onAddIdeaItem"
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
  import { IdeaItem } from '@/types';
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
  const baseTableRef = ref<InstanceType<typeof BaseTable> | null>(null);

  ////////////////////////////////
  // computed data
  const mappedIdeaRows = computed(() => {
    return ideaRows.value.map((idea: IdeaItem) => ({
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
  const onDeleteIdeaItem = async (uuid: string) => {
    await campaignStore.deleteIdeaItem(uuid);
  };

  const onAddIdeaItem = async () => {
    const newRow = await campaignStore.addIdeaItem();

    // open for editing
    if (baseTableRef.value && newRow) {
      baseTableRef.value.setEditingRow(newRow.uuid);
    }
  };

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field } = event;
    
    if (field === 'text') {
      await campaignStore.updateIdeaItem(data.uuid, newValue as string);
    }
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style> 