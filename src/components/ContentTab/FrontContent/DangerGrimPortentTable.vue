<template>
  <BaseTable
    ref="baseTableRef"
    :show-add-button="true"
    :show-filter="false"
    :filter-fields="[]"
    :add-button-label="localize('labels.front.addPortent')"
    :rows="grimPortentRows"
    :columns="columns"
    :actions="actions"
    :can-reorder="true"
    @add-item="onAddPortent"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, nextTick } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useFrontStore } from '@/applications/stores';
  
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { ActionButtonDefinition, GrimPortent, CellEditCompleteEvent } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const frontStore = useFrontStore();
  const { grimPortentRows } = storeToRefs(frontStore);

  ////////////////////////////////
  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);

  ////////////////////////////////
  // computed data
  const columns = computed(() => [
    { 
      field: 'actions', 
      style: 'text-align: left; width: 60px; max-width: 60px', 
      header: 'Actions' 
    },
    { 
      field: 'complete', 
      header: localize('labels.complete'),
      style: 'text-align: center; width: 80px; max-width: 80px',
      editable: true,
      type: 'boolean',
      clickable: true,
    },
    { 
      field: 'description', 
      header: localize('labels.description'),
      sortable: true,
      editable: true,
      clickable: true,
      style: 'width: 100%',
    }
  ]);

  const actions = computed(() => {
    const actions = [] as ActionButtonDefinition[];
    actions.push({ 
      icon: 'fa-trash', 
      callback: async (data) => { await frontStore.deleteGrimPortent(data.uuid); }, 
      tooltip: localize('tooltips.deletePortent')
    });

    actions.push({ 
      icon: 'fa-pen', 
      isEdit: true, 
      callback: () => {},
      tooltip: localize('tooltips.editPortent') 
    });

    return actions;
  });
  
  ////////////////////////////////
  // methods
  /**
   * Sets a specific row to edit mode
   * @param uuid The UUID of the row to edit
   */
  const setEditingRow = (uuid: string) => {
    // Call the setEditingRow method on the BaseTable component
    if (baseTableRef.value) {
      baseTableRef.value.setEditingRow(uuid);
    }
  }

  // Expose the setEditingRow method to parent components
  defineExpose({
    setEditingRow
  });

  ////////////////////////////////
  // event handlers
  const onAddPortent = async () => {
    const uuid = await frontStore.addGrimPortent();

    if (!uuid)
      return;
  
    // Wait for the next tick to ensure the new row is rendered
    await nextTick();
    
    // Set the new row to edit mode
    setEditingRow(uuid);
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field } = event;

    if (field === 'description')
      await frontStore.updateGrimPortent(data.uuid, newValue as string, data.complete as boolean);
    else if (field === 'complete')
      await frontStore.updateGrimPortent(data.uuid, data.description as string, newValue as boolean);
  };

  const onReorder = (reorderedRows: GrimPortent[]) => {
    frontStore.reorderGrimPortents(reorderedRows);
  };


</script>

<style lang="scss" scoped>
</style>
