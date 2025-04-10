<template>
  <!-- a table for use in sessions - handles items that can be moved to the next session, marked done, etc. -->
  <div class="primevue-only">
    <DataTable
      data-key="uuid"
      :value="rows"
      size="small"
      paginator
      paginator-position="bottom"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      current-page-report-template="{first} to {last} of {totalRecords}"
      :editMode="columns.find(c=>c.editable) ? 'cell' : undefined"
      :sort-field="pagination.sortField"
      :sort-order="pagination.sortOrder"
      :default-sort-order="1"
      :total-records="rows.length"
      :rows="pagination.rowsPerPage"
      selection-mode="single"
      :pt="{
        header: { style: 'border: none' },
        thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
        bodyRow: {
          style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
        },
        pcPaginator: {
          // these are needed to override the foundry button styling
          first: {
            style: 'width: auto',
          },
          root: { style: 'background: inherit', }
        },
        table: { style: 'margin: 0px;'},
      }"

      @row-select="emit('rowSelect', $event)"
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
            <div style="line-height:var(--input-height); color: var(--color-text-primary); margin-left: 0.75rem;">
              {{ props.extraAddText}}
            </div>
          </div>
          <!-- <q-btn v-if="showGenerate"
            color="primary" 
            icon="psychology" 
            label="Generate" 
            @click=""
          /> -->
        </div>
      </template>
      <template #empty>
        {{ localize('labels.noResults') }} 
      </template>
      <template #loading>
        {{ localize('labels.loading') }}...
      </template>

      <Column 
        v-for="col of columns" 
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
            @click.stop="emit('editItem', data.uuid)" 
          >
            <i class="fas fa-pen"></i>
          </a>
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
            v-if="!data.lockedToSessionId"
            class="fcb-action-icon" 
            :data-tooltip="localize('tooltips.moveToNextSession')"
            @click.stop="emit('moveToNextSession', data.uuid)" 
          >
            <i class="fas fa-share"></i>
          </a>
        </template>
        <!-- Drag column format -->
        <template
          v-if="col.field==='drag'"
          #body="{ data }"
        >
          <div 
            class="fcb-drag-handle"
            @dragstart="onRowDragStart($event, data.uuid)"
            :draggable="props.draggableRows"
            :data-tooltip="data.dragTooltip || 'Drag'"
          >
            <i class="fas fa-bars"></i>
          </div>
        </template>
        <template
          v-if="col.editable"
          #body="{ data }"
        >
          <div  
            v-if="data.uuid===editingRow"
            @click.stop=""
          >
            <!-- we set the id so that we can pull the value when we change row -->
            <!-- TODO: do a debounce update on edit rather than waiting for the complete action -->
            <Textarea 
              v-model="data[col.field]"
              style="width: 100%"
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
        </template>
        <!-- Standard column format -->
        <template
          v-if="!col.editable && col.field!=='actions' && col.field!=='drag'"
          #body="{ data }"
        >
          <div>
            {{ data[col.field] }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, computed } from 'vue';

  // local imports
  import { localize } from '@/utils/game';

  // library components
  import Button from 'primevue/button';
  import DataTable, { DataTableCellEditCompleteEvent, DataTableRowContextMenuEvent, DataTableRowSelectEvent } from 'primevue/datatable';
  import Column from 'primevue/column';
  import Textarea from 'primevue/textarea';

  // local components

  // types
  import { TablePagination, } from '@/types';
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
    filters: {},
  });
  
  /** are we editing and row, and which one (uuid) */
  const editingRow = ref<string | null>(null);

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
          emit('cellEditComplete', { data: { uuid: editingRow.value }, newValue: input.value, field: col.field, originalEvent: null });
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
</style>
