<template>
  <BaseTable
    ref="baseTableRef"
    :show-add-button="true"
    :show-filter="false"
    :filter-fields="[]"
    :add-button-label="localize('labels.danger.addParticipant')"
    :extra-add-text="localize('labels.danger.addParticipantDrag')"
    :rows="participantRows"
    :columns="columns"
    :actions="actions"
    :can-reorder="true"
    @add-item="onAddParticipant"
    @cell-edit-complete="onCellEditComplete"
    @reorder="onReorder"
    @dragover-new="onDragoverNew"
    @dropNew="onDropNew"
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
  import { getValidatedData } from '@/utils/dragdrop';
  
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedItemDialog from '@/components/tables/RelatedItemDialog.vue';

  // types
  import { CellEditCompleteEvent, ActionButtonDefinition, DangerParticipant, RelatedItemDialogModes, Topics, } from '@/types';
  import { Entry } from '@/classes';

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

  const onDragoverNew = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  };

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();

    const data = getValidatedData(event);
    if (!data)
      return;

    if (![Topics.Character, Topics.Organization].includes(data.topic as Topics) || !data.childId)
      return;

    const entry = await Entry.fromUuid(data.childId as string);
    if (!entry)
      return;

    await frontStore.addParticipant(entry, { role: '' });
  };


</script>

<style lang="scss" scoped>
</style>
