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
  import { useMainStore, useFrontStore } from '@/applications/stores';
  
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { ActionButtonDefinition, BaseTableGridRow, GrimPortent } from '@/types';
  import { DataTableCellEditCompleteEvent } from 'primevue/datatable';

  ////////////////////////////////
  // props
  const props = defineProps({
    /** the index of the danger without currentFront */
    dangerIndex: {
      type: Number,
      required: true,
    },
    rows: {
      type: Array as () => BaseTableGridRow[],
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const frontStore = useFrontStore();
  const { currentFront } = storeToRefs(mainStore);
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
    await frontStore.addGrimPortent();

    // Wait for the next tick to ensure the new row is rendered
    await nextTick();
    
    // Set the new row to edit mode
    if (props.rows.length > 0) {
      const newRow = props.rows[props.rows.length - 1];
      setEditingRow(newRow.uuid);
    }
  };

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, } = event;

    await frontStore.updateGrimPortent(data.uuid, newValue);
  };

  const onReorder = (reorderedRows: GrimPortent[]) => {
    frontStore.reorderGrimPortents(reorderedRows);
  };


</script>

<style lang="scss" scoped>
</style>
