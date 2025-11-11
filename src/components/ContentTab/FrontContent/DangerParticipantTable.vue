<template>
  <BaseTable
    ref="baseTableRef"
    :show-add-button="true"
    :show-filter="false"
    :filter-fields="[]"
    :add-button-label="localize('labels.front.addParticipant')"
    :rows="participantRows"
    :columns="columns"
    :actions="actions"
    :can-reorder="true"
    @add-item="onAddParticipant"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
  />

  <!-- note topic doesn't matter for this mode -->
  <RelatedItemDialog
    v-model="addParticipantDialogShow"
    :topic="Topics.Character"
    :allow-create="false"
    :mode="RelatedItemDialogModes.Danger"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useFrontStore } from '@/applications/stores';
  
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedItemDialog from '@/components/tables/RelatedItemDialog.vue';

  // types
  import { CellEditCompleteEvent, ActionButtonDefinition, BaseTableGridRow, DangerParticipant, RelatedItemDialogModes, Topics, } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const frontStore = useFrontStore();
  const { participantRows } = storeToRefs(frontStore);

  ////////////////////////////////
  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);
  const addParticipantDialogShow = ref(false);

  ////////////////////////////////
  // computed data
  const columns = computed(() => [
    { 
      field: 'actions', 
      style: 'text-align: left; width: 60px; max-width: 60px', 
      header: 'Actions' 
    },
    { 
      field: 'name', 
      header: localize('labels.tableHeaders.name'),
      sortable: true,
      clickable: true,
      style: 'width: 100%',
    },
    { 
      field: 'type', 
      header: localize('labels.tableHeaders.type'),
      sortable: true,
      style: 'width: 100%',
    },
    { 
      field: 'role', 
      header: localize('labels.tableHeaders.role'),
      sortable: true,
      editable: true,
      style: 'width: 100%',
    }
  ]);

  const actions = computed(() => {
    const actions = [] as ActionButtonDefinition[];
    actions.push({ 
      icon: 'fa-trash', 
      callback: async (data) => { await frontStore.deleteParticipant(data.uuid); }, 
      tooltip: localize('tooltips.deleteParticipant')
    });

    actions.push({ 
      icon: 'fa-pen', 
      isEdit: true, 
      callback: () => {},
      tooltip: localize('tooltips.editParticipant') 
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
  const onAddParticipant = async () => {
    addParticipantDialogShow.value = true;
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, } = event;

    await frontStore.updateParticipant(data.uuid, newValue);
  };

  const onReorder = (reorderedRows: DangerParticipant[]) => {
    frontStore.reorderParticipants(reorderedRows);
  };


</script>

<style lang="scss" scoped>
</style>
