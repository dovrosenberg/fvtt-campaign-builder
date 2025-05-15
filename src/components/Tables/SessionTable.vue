<template>
  <!-- a table for use in sessions - handles items that can be moved to the next session, marked done, etc. -->
  <div class="primevue-only">
    <BaseTable
      ref="baseTableRef"
      :show-add-button="props.showAddButton"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="props.addButtonLabel"
      :track-delivery="true"
      :extra-add-text="props.extraAddText"
      :allow-drop-row="props.allowDropRow"
      :rows="props.rows"
      :columns="columns"
      :allow-edit="props.allowEdit"
      :edit-item-label="props.editItemLabel"
      :delete-item-label="props.deleteItemLabel"
      :show-move-to-campaign="props.showMoveToCampaign"
      :draggable-rows="props.draggableRows"
      @row-select="(event) => emit('rowContextMenu', event)"
      @edit-item="(uuid) => emit('editItem', uuid)"
      @delete-item="(uuid) => emit('deleteItem', uuid)"
      @add-item="() => emit('addItem')"
      @row-contextmenu="(event) => emit('rowContextMenu', event)"
      @cell-edit-complete="(event) => emit('cellEditComplete', event)"
      @mark-item-delivered="(uuid) => emit('markItemDelivered', uuid)"
      @unmark-item-delivered="(uuid) => emit('unmarkItemDelivered', uuid)"
      @move-to-next-session="(uuid) => emit('moveToNextSession', uuid)"
      @move-to-campaign="(uuid) => emit('moveToCampaign', uuid)"
      @dragstart="(event, uuid) => emit('dragstart', event, uuid)"
      @drop-row="(event, uuid) => emit('dropRow', event, uuid)"
      @drop-new="(event) => emit('dropNew', event)"
      @set-editing-row="(uuid) => emit('setEditingRow', uuid)"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, computed, ref } from 'vue';

  // local imports
  
  // library components
  import  { DataTableCellEditCompleteEvent, DataTableRowContextMenuEvent, DataTableRowSelectEvent } from 'primevue/datatable';
  
  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  // types
  type SessionTableGridRow = { uuid: string; delivered: boolean } & Record<string, any>;

  ////////////////////////////////
  // props
  const props = defineProps({
    showAddButton: {
      type: Boolean,
      default: false,
    },
    addButtonLabel: {
      type: String,
      default: '',
    },
    extraAddText: {   // displays as text next to the add button (even if no button)
      type: String,
      default: '',
    },
    allowDropRow: {   // allow dropping on a row (i.e. as an edit action)
      type: Boolean,
      default: false,
    },
    rows: {
      type: Array as PropType<SessionTableGridRow[]>,
      required: true,
    },
    columns: {
      type: Array as PropType<any[]>,
      required: true,
    },
    allowEdit: {
      type: Boolean,
      default: false,
    },
    editItemLabel: {
      type: String,
      default: '',
    },
    deleteItemLabel: {
      type: String,
      required: true,
    },
    showMoveToCampaign: {
      type: Boolean,
      default: false,
    },
    draggableRows: {
      type: Boolean,
      required: false,
      default: false,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'rowSelect', originalEvent: DataTableRowSelectEvent): void;
    (e: 'editItem', uuid: string): void;
    (e: 'deleteItem', uuid: string): void;
    (e: 'addItem'): void;
    (e: 'cellEditComplete', originalEvent: DataTableCellEditCompleteEvent): void;
    (e: 'rowContextMenu', originalEvent: DataTableRowContextMenuEvent): void;
    (e: 'markItemDelivered', uuid: string): void;
    (e: 'unmarkItemDelivered', uuid: string): void;
    (e: 'moveToNextSession', uuid: string): void;
    (e: 'moveToCampaign', uuid: string): void;
    (e: 'dragstart', event: DragEvent, uuid: string): void;
    (e: 'dropRow', event: DragEvent, uuid: string): void;
    (e: 'dropNew', event: DragEvent): void;
    (e: 'setEditingRow', uuid: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const baseTableRef = ref<any>(null);

  ////////////////////////////////
  // computed data
  const columns = computed((): any[] => {
    // they all have some standard columns
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const columns = [ actionColumn ];
    for (const col of props.columns) {
      columns.push(col);
    }

    return columns;
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

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
