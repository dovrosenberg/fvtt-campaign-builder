<template>
  <div class="primevue-only" style="display: flex">
    <DataTable
      data-key="uuid"
      :value="rows"
      size="small"
      scrollable
      scroll-height="flex"
      paginator-position="bottom"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      current-page-report-template="{first} to {last} of {totalRecords}"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :first="pagination.first"
      :default-sort-order="1"
      :total-records="rows.length"
      :global-filter-fields="props.filterFields"
      :filters="pagination.filters"
      :pt="{
        header: { style: 'border: none' },
        table: { style: 'margin: 0px; table-layout: fixed;' },
        thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
        row: { 
          style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;', 
        },
        pcPaginator: { 
          // these are needed to override the foundry button styling
          first: {
            style: 'width: auto', 
          },
          root: { style: 'background: inherit', }
        },
      }"

      @row-contextmenu="emit('rowContextMenu', $event)"
      @row-reorder="onRowReorder"
    >
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <div style="display: flex">
            <Button
              v-if="props.showAddButton"
              unstyled
              :label="props.addButtonLabel" 
              style="flex: initial; width:auto;"
              @click="emit('addItem')"
            >
              <template #icon>
                <!-- icon="o_add_circle"  -->
                <i class="fas fa-plus"></i>
              </template>
            </Button>
            <div 
              v-if="props.helpText"
              class="fcb-table-help-icon"
              :style="props.helpLink ? 'cursor: pointer;' : ''"
              :data-tooltip="props.helpText"
              @click="onHelpIconClick"
            >
              <i class="fas fa-info-circle"></i>
            </div>
            <div 
              v-if="props.extraAddText"
              :class="['fcb-table-new-drop-box', isDragHover ? 'valid-drag-hover' : '']"
              @dragover="onDragoverNew"
              @dragleave="onDragLeaveNew"
              @drop="onDropNew"
            >
              {{ props.extraAddText}}
            </div>
          </div>
          <IconField 
            v-if="props.showFilter"
            icon-position="left"
          >
            <InputIcon>
              <i class="fas fa-search"></i>
            </InputIcon>
            <InputText 
              v-model="pagination.filters.global.value"  
              style="font-size: var(--font-size-14);"
              :placeholder="localize('placeholders.search')"
            />
          </IconField>
        </div>
      </template>
      <template #empty>
        {{ localize('labels.noResults') }} 
      </template>
      <template #loading>
        {{ localize('labels.loading') }}...
      </template>

      <Column v-if="props.canReorder" :rowReorder="true" headerStyle="width: 3rem" :reorderableColumn="false" />

      <Column 
        v-for="col of props.columns" 
        :key="col.field" 
        :field="col.field" 
        :header="col.header" 
        :header-style="col.style"
        :body-style="col.style"
        :sortable="props.canReorder ? false : col.sortable"
      >
        <template #body="{ data, field }">
          <!-- ACTIONS -->
          <div v-if="field === 'actions'">
            <div 
              :class="[
                'fcb-row-wrapper', 
                isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <a 
                v-if="props.allowDelete"
                class="fcb-action-icon" 
                :data-tooltip="props.deleteItemLabel"
                @click.stop="emit('deleteItem', data.uuid)" 
              >
                <i class="fas fa-trash"></i>
              </a>
              <a 
                v-if="props.allowEdit"
                class="fcb-action-icon" 
                :data-tooltip="props.editItemLabel"
                @click.stop="onEditButtonClick(data)" 
              >
                <i class="fas fa-pen"></i>
              </a>
              <span v-if="props.trackDelivery">
                <!-- we track delivery on campaign (delivered and not) and session lore lists -->
                <!-- this is a delivered one -->
                <a 
                  v-if="data.delivered"
                  class="fcb-action-icon" 
                  :data-tooltip="localize('tooltips.unmarkDelivered')"
                  @click.stop="emit('unmarkItemDelivered', data.uuid)" 
                >
                  <i class="fas fa-circle-xmark"></i>
                </a>
                <!-- this is a undelivered session one -->
                <a 
                  v-if="props.showMoveToCampaign && !data.delivered"
                  class="fcb-action-icon" 
                  :data-tooltip="localize('tooltips.moveToCampaign')"
                  @click.stop="emit('moveToCampaign', data.uuid)" 
                >
                  <i class="fas fa-arrow-up"></i>
                </a>
                <!-- this is a undelivered campaign one -->
                <a 
                  v-if="!props.showMoveToCampaign && !data.delivered"
                  class="fcb-action-icon" 
                  :data-tooltip="localize('tooltips.moveToNextSession')"
                  @click.stop="emit('moveToNextSession', data.uuid)" 
                >
                  <i class="fas fa-share"></i>
                </a>
              </span>
            </div>
          </div>

          <!-- DRAG HANDLE -->
          <div v-else-if="field === 'drag'">
            <div 
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <div 
                class="fcb-drag-handle" 
                draggable="true"
                @dragstart="onDragstart($event, data.uuid)"
              >
                <i class="fas fa-bars"></i>
              </div>
            </div>
          </div>

          <!-- EDITABLE TEXT -->
          <div v-else-if="col.editable && col.type !== 'boolean'">
            <div 
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <!-- we're editing this row -->
              <div 
                v-if="editingRow === data.uuid" 
                class="fcb-table-body-text"
              >                
                <Textarea 
                  v-if="!col.smallEditBox"
                  v-model="editingRowData[field]"
                  style="width: 100%; font-size: inherit;"
                  :id="`${data.uuid}-${field}`" 
                  rows="2"
                  @keydown.enter="saveCurrentlyEditingRow" 
                  @keydown.esc.stop="cancelEdit"
                />
                <InputText 
                  v-if="col.smallEditBox"
                  v-model="editingRowData[field]"
                  style="width: 100%; font-size: inherit;"
                  :id="`${data.uuid}-${field}`" 
                  @keydown.enter.stop="saveCurrentlyEditingRow" 
                  @keydown.esc.stop="cancelEdit"
                />
              </div>
              <!-- not editing this row but need to put a click event on it -->
              <div 
                v-else
                class="fcb-table-body-text"
                @click.stop="onClickEditableCell(data.uuid)"
              >
                <!-- we're not editing this row, but need to put a click event on columns that are editable -->
                {{ data[field] }} &nbsp;
              </div>
            </div>
          </div>

          <!-- EDITABLE BOOLEAN -->
          <div v-else-if="col.editable && col.type === 'boolean'">
            <div 
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <Checkbox 
                :model-value="data[field]" 
                :binary="true" 
                @update:model-value="onCheckboxChange(data, field, $event)"
              />
            </div>
          </div>

          <!-- CLICKABLE -->
          <div v-else-if="col.clickable">
            <div 
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '']"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <div
                :class="['fcb-table-body-text', 'clickable']"
                @click.stop="emit('cellClick', data, field)"
              >
                {{ data[field] }}
              </div>
            </div>
          </div>

          <!-- STANDARD -->
          <div v-else>
            <div 
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
                      col.onClick ? 'clickable' : '']"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <div
                :class="['fcb-table-body-text']"
                @click.stop="col.onClick && col.onClick($event, data.uuid)"
              >
                <span :style="col.onClick ? 'text-decoration: underline;' : ''">
                  {{ data[field] }}               
                </span>
                &nbsp; <!-- nbsp because otherwise the cell will have 0 width and the mouse events won't work; here so it doesn't get underlined -->
              </div>
            </div>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, computed, reactive, nextTick } from 'vue';
  import { FilterMatchMode } from '@primevue/core/api';

  // local imports
  import { localize } from '@/utils/game';

  // library components
  import Button from 'primevue/button';
  import DataTable, {
    DataTableRowContextMenuEvent,
    DataTableRowSelectEvent,
    type DataTableCellEditCompleteEvent,
    type DataTableFilterMetaData,
  } from 'primevue/datatable';
  import Column from 'primevue/column';
  import InputText from 'primevue/inputtext';
  import Textarea from 'primevue/textarea';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';
  import Checkbox from 'primevue/checkbox';

  // types
  import { TablePagination, BaseTableGridRow } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    showAddButton: { 
      type: Boolean, 
      default: false,
    },
    showFilter: { 
      type: Boolean, 
      default: true,
    },
    addButtonLabel: { 
      type: String, 
      default: '',
    },
    /** used for campaign/session tracking */
    trackDelivery: {
      type: Boolean,
      default: false,
    },
    /** displays as text next to the add button (even if no button) */
    extraAddText: {   
      type: String, 
      default: '',
    },
    /** allow dropping on a row (i.e. as an edit action) */
    allowDropRow: {   
      type: Boolean,
      default: false,
    },
    canReorder: {
      type: Boolean,
      default: false,
    },
    /** list of column names you can filter on */
    filterFields: {
      type: Array as PropType<string[]>,   
      default: [],
    },
    rows: {
      type: Array as PropType<BaseTableGridRow[]>,
      required: true,
    },
    columns: {
      type: Array as PropType<any[]>,
      required: true,
    },
    /** show the edit action icon */
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
    showMoveToCampaign: {
      type: Boolean,
      default: false,
    },
    draggableRows: {
      type: Boolean,
      required: false,
      default: false,
    },
    // displays an info icon with this tooltip
    helpText: {   
      type: String,
      default: '',
    },
    // clicking the icon opens this link
    helpLink: {   
      type: String,
      default: '',
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'rowSelect', originalEvent: DataTableRowSelectEvent): void;
    (e: 'editItem', data: BaseTableGridRow): void;
    (e: 'deleteItem', uuid: string): void;
    (e: 'addItem'): void;
    (e: 'rowContextMenu', originalEvent: DataTableRowContextMenuEvent): void;
    (e: 'cellEditComplete', originalEvent: DataTableCellEditCompleteEvent): void;
    (e: 'markItemDelivered', uuid: string): void;
    (e: 'unmarkItemDelivered', uuid: string): void;
    (e: 'moveToNextSession', uuid: string): void;
    (e: 'moveToCampaign', uuid: string): void;
    (e: 'dragstart', event: DragEvent, uuid: string): void;
    (e: 'dragoverNew', event: DragEvent): void;
    (e: 'dragoverRow', event: DragEvent, uuid: string): void;
    (e: 'dropRow', event: DragEvent, uuid: string): void;
    (e: 'dropNew', event: DragEvent): void;
    (e: 'setEditingRow', uuid: string): void;
    (e: 'reorder', reorderedRows: BaseTableGridRow[]): void;
    (e: 'cellClick', data: any, field: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const pagination = reactive<TablePagination>({
    sortField: 'name',
    sortOrder: 1,
    first: 0,
    page: 1,
    rowsPerPage: 10,
    filters: {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      ...props.filterFields.reduce((acc, field): Record<string, DataTableFilterMetaData> => {
        acc[field] = { value: null, matchMode: FilterMatchMode.CONTAINS };
        return acc;
      }, {} as Record<string, DataTableFilterMetaData>),
    },
  });

  /** are we editing and row, and which one (uuid) */
  const editingRow = ref<string | null>(null);
  const editingRowData = ref<any>({});

  /** track if a valid drag is currently over the drop zone */
  const isDragHover = ref<boolean>(false);

  /** track if a valid drag is currently over a row - value is row uuid */
  const isDragHoverRow = ref<string | null>(null);

  ////////////////////////////////
  // computed data
  /** Check if any columns are editable */
  const hasEditableColumns = computed(() => {
    return props.columns.some((col) => col.editable);
  });

  const sortOrder = computed(() => props.canReorder ? 1 : pagination.sortOrder);
  const sortField = computed(() => props.canReorder ? 'sortOrder' : pagination.sortField);

  ////////////////////////////////
  // methods
  /**
   * Sets a specific row to edit mode
   * @param uuid The UUID of the row to edit
   */
  const setEditingRow = (uuid: string) => {
    const data = props.rows.find((row) => row.uuid === uuid);
    if (!data) return;

    editingRowData.value = { ...data };
    editingRow.value = uuid;

    // Find the index of the row
    const rowIndex = props.rows.findIndex((row) => row.uuid === uuid);

    if (rowIndex !== -1) {
      // Calculate the page number (0-based)
      const page = Math.floor(rowIndex / 10);

      // Set the paginator's 'first' property
      pagination.first = page * 10;

      // wait for the next tick to ensure the input is rendered
      nextTick(() => {
        // find the first editable column and set the focus on it
        const firstEditableColumn = props.columns.find((col) => col.editable && col.type!=='boolean');
        if (firstEditableColumn) {
          const id = `${uuid}-${firstEditableColumn.field}`;
          const input = document.getElementById(id) as HTMLInputElement;
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    }

    emit('setEditingRow', uuid);
  };

  const cancelEdit = () => {
    editingRow.value = null;
    editingRowData.value = {};
  };

  /**
   * Saves the currently editing row by extracting values from input fields
   * and emitting cellEditComplete events for each changed field
   */
  const saveCurrentlyEditingRow = () => {
    // If we're not editing a row, do nothing
    if (!editingRow.value) return;

    // Find the row data
    const originalRowData = props.rows.find((row) => row.uuid === editingRow.value);
    if (originalRowData) {
      // Emit the cellEditComplete event for each changed field
      for (const col of props.columns) {
        if (col.editable) {
          const id = `${editingRow.value}-${col.field}`;
          const input = document.getElementById(id) as HTMLInputElement;          
          if (input && originalRowData[col.field] !== input.value) {
            // pull the value from the input and fire an event to save it
            emit('cellEditComplete', {
              originalEvent: new Event('change'),
              data: originalRowData,
              newData: {...editingRowData.value, [col.field]: input.value},
              value: originalRowData[col.field],
              newValue: input.value,
              // newValue: editingRowData.value[col.field],
              field: col.field,
              index: props.rows.findIndex((r) => r.uuid === editingRow.value),
              type: 'enter',
            });
          }
        }
      }
    }

    // Turn off editing mode
    cancelEdit();
  };

  // Expose the setEditingRow method to parent components
  defineExpose({
    setEditingRow
  });

  ////////////////////////////////
  // event handlers
  const onCheckboxChange = (rowData: any, field: string, newValue: boolean) => {
    const event = {
      data: rowData,
      field: field,
      newValue: newValue,
      originalEvent: new Event('change'),
      value: rowData[field],
      index: props.rows.findIndex((r) => r.uuid === rowData.uuid),
      type: 'edit',
    };
    emit('cellEditComplete', event);
  };

  const onClickEditableCell = (uuid: string) => {
    // if we were already editing a row, save it first
    saveCurrentlyEditingRow();

    // set the new row
    setEditingRow(uuid);
  };
  
  const onDragstart = (event: DragEvent, uuid: string) => {
    if (!event.target || !uuid) return;

    // Emit the dragstart event with the uuid
    // This lets the parent component handle the drag data
    emit('dragstart', event, uuid);
  };

  const onDragoverNew = (event: DragEvent) => {
    // First, call the parent's dragover handler
    emit('dragoverNew', event);

    // Check if this is a valid drag (has text/plain data)
    if (event.dataTransfer && event.dataTransfer.types.includes('text/plain')) {
      isDragHover.value = true;
    } else {
      isDragHover.value = false;
    }
  }

  const onDragoverRow = (event: DragEvent, uuid: string) => {
    if (props.allowDropRow) {
      // First, call the parent's dragover handler
      emit('dragoverRow', event, uuid);

      // Check if this is a valid drag (has text/plain data)
      if (event.dataTransfer && event.dataTransfer.types.includes('text/plain')) {
        isDragHoverRow.value = uuid;
      } else {
        isDragHoverRow.value = null;
      }
    }
  }

  const onDragLeaveNew = () => {
    // Reset the valid drag state when the drag leaves the drop zone
    isDragHover.value = false;
  }

  const onDragLeaveRow = (uuid: string) => {
    // Reset the valid drag state when the drag leaves the drop zone
    if (isDragHoverRow.value===uuid)
      isDragHoverRow.value = null;
  }

  const onDropNew = (event: DragEvent) => {
    // Reset the valid drag state
    isDragHover.value = false;
    
    // Call the parent's drop handler
    emit('dropNew', event);
  }

  const onDropRow = (event: DragEvent, uuid: string) => {
    if (props.allowDropRow) {
      // Reset the valid drag state
      if (isDragHoverRow.value===uuid)
        isDragHoverRow.value = null;
    
      // Call the parent's drop handler
      emit('dropRow', event, uuid);
    }
  }

  const onRowReorder = (event: any) => {
    if (!props.canReorder) return;

    const { dragIndex, dropIndex } = event;
    const reorderedRows = [...props.rows];
    const movedItem = reorderedRows.splice(dragIndex, 1)[0];
    reorderedRows.splice(dropIndex, 0, movedItem);

    // Update sortOrder for all rows
    reorderedRows.forEach((row, index) => {
      row.sortOrder = index;
    });

    emit('reorder', reorderedRows);
  }

  const onEditButtonClick = (data: BaseTableGridRow) => {
    // Check if there are any editable columns
    if (hasEditableColumns.value) {
      // If we were already editing a row, save it first
      saveCurrentlyEditingRow();
      
      // If there are editable columns, put the row in edit mode
      setEditingRow(data.uuid);
    } else {
      // If no editable columns, emit the editItem event as before
      emit('editItem', data);
    }
  }

  const onHelpIconClick = () => {
    if (props.helpLink) {
      window.open(props.helpLink, '_blank');
    }
  }

  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
    .fcb-action-icon {
    cursor: pointer;
    margin-right: 3px;
  }
  
  .fcb-drag-handle {
    cursor: grab;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    color: var(--color-text-dark-secondary);
    
    &:hover {
      color: var(--color-text-hyperlink);
    }
  }

  // make links bold on hover
  .fcb-table-body-text {
    &.clickable {
      cursor: pointer;

      &:hover {
        font-weight: bold;
      }
    }
  }

  .fcb-row-wrapper {
    &.valid-drag-hover {
      color: var(--color-text-accent);
      border-color: var(--color-text-accent);
    }
  }

  .fcb-table-new-drop-box {
    line-height:var(--input-height); 
    color: var(--color-text-primary); 
    margin-left: 0.75rem; 
    margin-top: -2px;
    border: var(--color-text-primary) 1px dashed; 
    padding: 0 2px 0 2px;
    transition: all 0.2s ease;
    
    &.valid-drag-hover {
      color: var(--color-text-accent);
      border-color: var(--color-text-accent);
    }
  }

  .fcb-table-help-icon {
    margin-left: 8px;
    margin-right: 8px;
    // display: flex;
    // align-items: center;
  }

</style>
