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
    @dragover-new="standardDragover"
    @dropNew="onDropNew"
  />

  <!-- note topic doesn't matter for this mode -->
  <RelatedItemDialog
    v-model="addParticipantDialogShow"
    :title="localize('dialogs.relatedEntries.entry.title')"
    :main-button-label="localize('dialogs.relatedEntries.entry.buttonTitle')"
    :options="addOptions"
    :extra-fields="[{ field: 'role', header: 'Role' }]"
    :allow-create="false"
    @main-button-click="onDialogSubmitClick"
  />

</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useFrontStore, useMainStore, useNavigationStore } from '@/applications/stores';
  import { getType, getValidatedData, standardDragover, FCBDragTypes } from '@/utils/dragdrop';
  import { mapEntryToOption } from '@/utils/misc';
  
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedItemDialog from '@/components/dialogs/RelatedItemDialog.vue';

  // types
  import { BaseTableColumn, CellEditCompleteEvent, ActionButtonDefinition, DangerParticipant, Topics, EntryNodeDragData, } from '@/types';
  import { Entry } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const frontStore = useFrontStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { participantRows } = storeToRefs(frontStore);
  const { currentSetting } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);
  const addParticipantDialogShow = ref(false);
  const addOptions = ref<{id: string; label: string}[]>([]);

  ////////////////////////////////
  // computed data
  const columns = computed((): BaseTableColumn[] => [
    { 
      field: 'actions', 
      style: 'text-align: left; width: 60px; max-width: 60px', 
      header: 'Actions' 
    },
    { 
      field: 'name', 
      header: localize('labels.tableHeaders.name'),
      sortable: true,
      onClick: onNameClick,
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
  ] as BaseTableColumn[]);

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
  const onDialogSubmitClick = async (selectedItemId: string, extraFieldValues: Record<string, string>) => {
    const fullEntry = await Entry.fromUuid(selectedItemId);

    if (fullEntry) {
      await frontStore.addParticipant(fullEntry, extraFieldValues);
    }
  };
  
  // when we click on a name, open the entry
  async function onNameClick (event: MouseEvent, uuid: string) {
    return navigationStore.openEntry(uuid, { newTab: event.ctrlKey, activate: true });
  }

  const onAddParticipant = () => {
    if (!currentSetting.value)
      return;

    // characters and organizations only
    let entries = [] as { id: string; label: string }[];
    for (const topic of [Topics.Character, Topics.Location, Topics.Organization]) {
      entries = entries.concat(
        (currentSetting.value.topics[topic]?.entries || []).map(mapEntryToOption)
      );
    }
    addOptions.value = entries;

    addParticipantDialogShow.value = true;
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, } = event;

    await frontStore.updateParticipant(data.uuid, newValue as string);
  };

  const onReorder = (reorderedRows: DangerParticipant[]) => {
    frontStore.reorderParticipants(reorderedRows);
  };

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();

    const data = getValidatedData(event);
    if (!data || getType(data) !== FCBDragTypes.Entry)
      return;

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;

    if (!fcbData || ![Topics.Character, Topics.Organization].includes(fcbData.topic as Topics) || !fcbData.childId)
      return;

    const entry = await Entry.fromUuid(fcbData.childId);
    if (!entry)
      return;

    await frontStore.addParticipant(entry, { role: '' });
  };


</script>

<style lang="scss" scoped>
</style>
