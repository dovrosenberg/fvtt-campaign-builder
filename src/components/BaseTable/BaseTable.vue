<template>
  <div class="primevue-only">
    <DataTable
      data-key="uuid"
      :value="rows"
      size="small"
      paginator
      paginator-position="bottom"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      current-page-report-template="{first} to {last} of {totalRecords}"
      :editMode="props.columns.find(c=>c.editable) ? 'cell' : undefined"
      :sort-field="pagination.sortField"
      :sort-order="pagination.sortOrder"
      :default-sort-order="1"
      :total-records="rows.length"
      :global-filter-fields="props.filterFields"
      :rows="pagination.rowsPerPage"
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
      @cell-edit-complete="onCellEditComplete"
      @cell-edit-cancel="editingRow = null"
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

      <Column 
        v-for="col of props.columns" 
        :key="col.field" 
        :field="col.field" 
        :header="col.header" 
        :header-style="col.style"
        :body-style="col.style"
        :sortable="col.sortable"
      >
        <!-- actions column format-->
        <template
          v-if="col.field==='actions'"
          #body="{ data }"
        >
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
              @click.stop="emit('editItem', data)" 
            >
              <i class="fas fa-pen"></i>
            </a>
            <span v-if="props.trackDelivery">
              <!-- lockedToSessionId is a way to see if this is a seesion lore list or a campaign list for things that aren't delivered -->
              <a 
                v-if="!data.delivered  && !data.lockedToSessionId"
                class="fcb-action-icon" 
                :data-tooltip="localize('tooltips.markAsDelivered')"
                @click.stop="emit('markItemDelivered', data.uuid)" 
              >
                <i class="fas fa-check"></i>
              </a>
              <a 
                v-if="data.delivered && !data.lockedToSessionId"
                class="fcb-action-icon" 
                :data-tooltip="localize('tooltips.unmarkAsDelivered')"
                @click.stop="emit('unmarkItemDelivered', data.uuid)" 
              >
                <i class="fas fa-circle-xmark"></i>
              </a>
              <a 
                v-if="props.showMoveToCampaign && !data.delivered && !data.lockedToSessionId"
                class="fcb-action-icon" 
                :data-tooltip="localize('tooltips.moveToCampaign')"
                @click.stop="emit('moveToCampaign', data.uuid)" 
              >
                <i class="fas fa-reply"></i>
              </a>
              <a 
                v-if="!data.lockedToSessionId"
                class="fcb-action-icon" 
                :data-tooltip="localize('tooltips.moveToNextSession')"
                @click.stop="emit('moveToNextSession', data.uuid)" 
              >
                <i class="fas fa-share"></i>
              </a>
            </span>
          </div>
        </template>
        <template
          v-if="col.field==='drag'"
          #body="{ data }"
        >
          <div 
            :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
            ]"
            @dragover="onDragoverRow($event, data.uuid)"
            @dragleave="onDragLeaveRow(data.uuid)"
            @drop="onDropRow($event, data.uuid)"
          >
            <div 
              class="fcb-drag-handle"
              @dragstart="onRowDragStart($event, data.uuid)"
              :draggable="props.draggableRows"
              :data-tooltip="data.dragTooltip || 'Drag'"
            >
              <i class="fas fa-bars"></i>
            </div>
          </div>
        </template>
        <template
          v-if="col.editable"
          #body="{ data }"
        >
          <div 
            :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
            ]"
            @dragover="onDragoverRow($event, data.uuid)"
            @dragleave="onDragLeaveRow(data.uuid)"
            @drop="onDropRow($event, data.uuid)"
          >
            <div  
              v-if="data.uuid===editingRow"
              @click.stop=""
            >
              <!-- we set the id so that we can pull the value when we change row -->
              <!-- TODO: do a debounce update on edit rather than waiting for the complete action -->
              <Textarea 
                v-model="data[col.field]"
                style="width: 100%; font-size: inherit;"
                :id="`${data.uuid}-${col.field}`" 
                rows="2"
              />
            </div>
            <div 
              v-if="data.uuid!==editingRow"
              @click.stop="onClickEditableCell(data.uuid)"
            >
              <!-- we're not editing this row, but need to put a click event on columns that are editable -->
              {{ data[col.field] }} &nbsp;
            </div>
          </div>
        </template>
        <!-- Standard column format -->
        <template
          v-if="!col.editable && col.field!=='actions' && col.field!=='drag'"
          #body="{ data }"
        >
          <div 
            :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
            ]"

            @dragover="onDragoverRow($event, data.uuid)"
            @dragleave="onDragLeaveRow(data.uuid)"
            @drop="onDropRow($event, data.uuid)"
          >
            <div 
              :class="[
                'fcb-table-body-text', 
                col.onClick ? 'clickable' : '',
              ]"
              @click.stop="col.onClick && col.onClick($event, data.uuid)"
            >
              {{ data[col.field] }}
            </div>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, } from 'vue';
  import { FilterMatchMode } from '@primevue/core/api';

  // local imports
  import { localize } from '@/utils/game';

  // library components
  import Button from 'primevue/button';
  import DataTable, { DataTableCellEditCompleteEvent, DataTableRowContextMenuEvent, DataTableRowSelectEvent, DataTableFilterMetaData } from 'primevue/datatable';
  import Column from 'primevue/column';
  import InputText from 'primevue/inputtext';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';
  import Textarea from 'primevue/textarea';

  // local components

  // types
  import { TablePagination,  } from '@/types';
  type BaseTableGridRow = { uuid: string; } & Record<string, any>;

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
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'rowSelect', originalEvent: DataTableRowSelectEvent): void;
    (e: 'editItem', uuid: string): void;
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
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const pagination = ref<TablePagination>({
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 1,
    rowsPerPage: 5, 
    filters: {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      ...props.filterFields.reduce((acc, field): Record<string, DataTableFilterMetaData> => {
        acc[field] = { value: null, matchMode: FilterMatchMode.CONTAINS };
        return acc;
      }, {} as Record<string, DataTableFilterMetaData>)
    }
  });

  /** are we editing and row, and which one (uuid) */
  const editingRow = ref<string | null>(null);
  
  /** track if a valid drag is currently over the drop zone */
  const isDragHover = ref<boolean>(false);

  /** track if a valid drag is currently over a row - value is row uuid */
  const isDragHoverRow = ref<string | null>(null);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  /**
   * Sets a specific row to edit mode
   * @param uuid The UUID of the row to edit
   */
  const setEditingRow = (uuid: string) => {
    editingRow.value = uuid;
    emit('setEditingRow', uuid);
  }

  // Expose the setEditingRow method to parent components
  defineExpose({
    setEditingRow
  });

  ////////////////////////////////
  // event handlers
  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent) => {
    // turn off editing mode
    editingRow.value = null;

    emit('cellEditComplete', event);
  }

  const onClickEditableCell = (uuid: string) => {
    // if we were already editing a row, fire off a complete event
    if (editingRow.value) {
      // loop over all the inputs
      for (const col of props.columns) {
        const id = `${editingRow.value}-${col.field}`;
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) {
          // pull the value from the input and fire an event to save it
          // TODO: change the event type because we're not firing a full event here
          emit('cellEditComplete', { data: { uuid: editingRow.value }, newValue: input.value, field: col.field, originalEvent: null } as unknown as  DataTableCellEditCompleteEvent );
        }
      }
    }

    // set the new row
    editingRow.value = uuid;
  }

  const onRowDragStart = (event: DragEvent, uuid: string) => {
    if (!event.target || !uuid) return;

    // Emit the dragstart event with the uuid
    // This lets the parent component handle the drag data
    emit('dragstart', event, uuid);
  }

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

</style>
