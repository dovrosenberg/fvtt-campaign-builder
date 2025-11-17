<template>
  <!-- a table for use in sessions - handles items that can be moved to the next session, marked done, etc. -->
  <BaseTable
    ref="baseTableRef"
    :show-add-button="props.showAddButton"
    :show-filter="false"
    :filter-fields="[]"
    :add-button-label="props.addButtonLabel"
    :extra-add-text="props.extraAddText"
    :allow-drop-row="props.allowDropRow"
    :rows="props.rows"
    :columns="columns"
    :draggable-rows="props.draggableRows"
    :help-text="props.helpText"
    :help-link="props.helpLink"
    :actions="actions"
    @row-select="(event) => emit('rowContextMenu', event)"
    @add-item="() => emit('addItem')"
    @row-contextmenu="(event) => emit('rowContextMenu', event)"
    @cell-edit-complete="(event) => emit('cellEditComplete', event)"
    @dragstart="(event, uuid) => emit('dragstart', event, uuid)"
    @drop-row="(event, uuid) => emit('dropRow', event, uuid)"
    @drop-new="(event) => emit('dropNew', event)"
    @set-editing-row="(uuid) => emit('setEditingRow', uuid)"
  >
  </BaseTable>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, computed, ref } from 'vue';

  // local imports
  import { localize } from '@/utils/game';

  // library components
  
  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  interface SessionTableGridRow extends Record<string, any> { 
    uuid: string; 
    delivered: boolean;
  };
  import { ActionButtonDefinition, CellEditCompleteEvent } from '@/types';
  import  { DataTableRowContextMenuEvent, DataTableRowSelectEvent } from 'primevue/datatable';

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
    helpText: {   // displays an info icon with this tooltop
      type: String,
      default: '',
    },
    helpLink: {   // clicking the icon opens this link
      type: String,
      default: '',
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
    allowDelete: {
      type: Boolean,
      default: true,
    },
    deleteItemLabel: {
      type: String,
      default: '',
    },
    showMoveToArc: {
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
    (e: 'cellEditComplete', originalEvent: CellEditCompleteEvent): void;
    (e: 'rowContextMenu', originalEvent: DataTableRowContextMenuEvent): void;
    (e: 'markItemDelivered', uuid: string): void;
    (e: 'unmarkItemDelivered', uuid: string): void;
    (e: 'moveToNextSession', uuid: string): void;
    (e: 'moveToArc', uuid: string): void;
    (e: 'dragstart', event: DragEvent, uuid: string): void;
    (e: 'dropRow', event: DragEvent, uuid: string): void;
    (e: 'dropNew', event: DragEvent): void;
    (e: 'setEditingRow', uuid: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const baseTableRef = ref<typeof BaseTable | null>(null);

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

  const actions = computed(() => {
    return [
      {
        icon: 'fa-trash', 
        display: () => props.allowDelete,
        callback: (data) => emit('deleteItem', data.uuid), 
        tooltip: props.deleteItemLabel 
      },
      {
        icon: 'fa-pen', 
        isEdit: true, 
        display: () => props.allowEdit,
        callback: (data) => emit('editItem', data.uuid), 
        tooltip: props.editItemLabel 
      },
      { 
        icon: 'fa-arrow-up', 
        display: (data) => props.showMoveToArc && !data.delivered, // hide arrow for things already delivered
        callback: (data) => emit('moveToArc', data.uuid), 
        tooltip: localize('tooltips.moveToArc') 
      },

      // deliver/undeliver buttons
      { 
        icon: 'fa-circle-check', 
        display: (data) => !data.delivered, // hide arrow for things already delivered
        callback: (data) => emit('markItemDelivered', data.uuid), 
        tooltip: localize('tooltips.markAsDelivered') 
      },
      { 
        icon: 'fa-circle-xmark', 
        display: (data) => data.delivered, 
        callback: (data) => emit('unmarkItemDelivered', data.uuid), 
        tooltip: localize('tooltips.unmarkAsDelivered') 
      },
      { 
        icon: 'fa-share', 
        display: (data) => !data.delivered, // hide arrow for things already delivered
        callback: (data) => emit('moveToNextSession', data.uuid), 
        tooltip: localize('tooltips.moveToNextSession') 
      }
    ];
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
