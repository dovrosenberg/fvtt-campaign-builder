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
    :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
    @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
    @add-item="onAddPortent"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, nextTick, inject } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { useFrontStore } from '@/applications/stores';
  import { FRONT_DERIVED_STATE_KEY } from '@/composables/useFrontDerivedState';
  import { ModuleSettings, SettingKey } from '@/settings';
  
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { BaseTableColumn, ActionButtonDefinition, GrimPortent, CellEditCompleteEvent } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const frontStore = useFrontStore();
  const { grimPortentRows, currentDangerIndex } = inject(FRONT_DERIVED_STATE_KEY)!;

  ////////////////////////////////
  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);

  ////////////////////////////////
  // computed data
  const columns = computed((): BaseTableColumn[] => [
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
    },
    { 
      field: 'description', 
      header: localize('labels.description'),
      sortable: true,
      editable: true,
      style: 'width: 100%',
    }
  ]);

  const actions = computed(() => {
    const actions = [] as ActionButtonDefinition[];
    actions.push({ 
      icon: 'fa-trash', 
      callback: async (data, removedUUIDs) => {
        if (currentDangerIndex.value == null)
          return;
        const deleted = await frontStore.deleteGrimPortent(currentDangerIndex.value, data.uuid);
        if (deleted && removedUUIDs && removedUUIDs.length > 0) {
          emit('relatedEntriesChanged', [], removedUUIDs);
        }
      },
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
    if (currentDangerIndex.value == null)
      return;

    const uuid = await frontStore.addGrimPortent(currentDangerIndex.value);

    if (!uuid)
      return;
  
    // Wait for the next tick to ensure the new row is rendered
    await nextTick();
    
    // Set the new row to edit mode
    setEditingRow(uuid);
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field } = event;

    if (currentDangerIndex.value == null)
      return;

    if (field === 'description')
      await frontStore.updateGrimPortent(currentDangerIndex.value, data.uuid, newValue as string, data.complete as boolean);
    else if (field === 'complete')
      await frontStore.updateGrimPortent(currentDangerIndex.value, data.uuid, data.description as string, newValue as boolean);
  };

  const onReorder = (reorderedRows: GrimPortent[]) => {
    if (currentDangerIndex.value != null)
      frontStore.reorderGrimPortents(currentDangerIndex.value, reorderedRows);
  };


</script>

<style lang="scss" scoped>
</style>
