<template>
  <div class="tab-inner">
    <BaseTable
      ref="baseTableRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="'Put something here'"
      :track-delivery="false"
      :allow-drop-row="false"
      :rows="mappedTodoRows"
      :columns="columns"
      :allow-edit="false"
      :delete-item-label="localize('tooltips.deleteToDo')"
      :show-move-to-campaign="false"
      :draggable-rows="false"
      @edit-item="(uuid) => {}"
      @delete-item="onDeleteTodoItem"
      @add-item="() => {}"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, CampaignTableTypes, } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components

  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  
  // store
  const campaignStore = useCampaignStore();
  const { todoRows, } = storeToRefs(campaignStore);

  // computed
  const mappedTodoRows = computed(() => todoRows.value);

  const columns = computed((): any[] => {
    // add actions    
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const columns = [ actionColumn ] as any[];
    for (const col of campaignStore.extraFields[CampaignTableTypes.Todo]) {
      columns.push(col);
    }

    return columns;
  });
  
  // methods
  const onDeleteTodoItem = async (uuid: string) => {
    await campaignStore.completeTodoItem(uuid);
  };
</script>

<style lang="scss" scoped>
  .tab-inner {
    padding: 0.5em;
  }

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
</style> 