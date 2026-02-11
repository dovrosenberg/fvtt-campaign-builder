<template>
  <div class="primevue-only fcb-table-wrapper" style="display: flex">
    <DataTable
      data-key="uuid"
      v-bind="dataTableSortBindings"
      :value="transformedData"
      :row-group-mode="props.grouped ? 'subheader' : undefined"
      :group-rows-by="props.grouped ? 'groupId' : undefined"
      :expandable-row-groups="props.grouped"
      v-model:expanded-row-groups="expandedRowGroups"
      size="small"
      scrollable
      scroll-height="flex"
      :total-records="transformedData.length"
      :global-filter-fields="effectiveFilterFields"
      :filters="pagination.filters"
      :pt="{
        header: { style: 'border: none' },
        table: { style: 'margin: 0px; table-layout: fixed;' },
        thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
        row: {
          style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
        },
        rowGroupHeader: {
          style: 'background-color: var(--fcb-primary); color: var(--fcb-text-on-primary); cursor: pointer;',
          colspan: totalColumnCount
        },
        rowGroupHeaderCell: {
          colspan: totalColumnCount
        }
      }"

      @row-contextmenu="emit('rowContextMenu', $event)"
      @row-reorder="onRowReorder"    >
    <!-- These need to be set if we want pagination back -->
    <!-- <DataTable
      paginator-position="bottom"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      current-page-report-template="{first} to {last} of {totalRecords}"
      :first="pagination.first"
      :global-filter-fields="effectiveFilterFields"
      :filters="pagination.filters"
      :pt="{
        pcPaginator: { 
          // these are needed to override the foundry button styling
          first: {
            style: 'width: auto', 
          },
          root: { style: 'background: inherit', }
        },
      }"
    > -->
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <div style="display: flex">
            <Button
              v-if="props.grouped"
              unstyled
              data-testid="table-add-group-button"
              style="flex: initial; width: auto; margin-right: 0.5rem;"
              @click="addNewGroup"
            >
              <template #icon>
                <i class="fas fa-folder-plus"></i>
              </template>
            </Button>
            <Button
              v-if="props.showAddButton"
              unstyled
              data-testid="table-add-button"
              :label="props.addButtonLabel" 
              style="flex: initial; width: auto;"
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
              data-testid="table-filter-input"
              unstyled
              style="font-size: var(--fcb-font-size-large); padding-left: 2rem;"
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

      <!-- Group header template for grouped mode -->
      <template #groupheader="slotProps" v-if="props.grouped">
        <div 
          class="fcb-group-header-actions"
          style="display:inline-block" 
        >
          <div 
            :class="['fcb-row-wrapper']"
            @dragover="onDragoverRow($event, slotProps.data.groupId)"
            @dragleave="onDragLeaveRow(slotProps.data.groupId)"
            @drop="onDropRow($event, slotProps.data.groupId)"
          >
            <div 
              class="fcb-drag-handle" 
              draggable="true"
              @dragstart="onDragstart($event, slotProps.data.groupId)"
            >
              <i class="fas fa-bars"></i>
            </div>
          </div>
          <div>
            <a
              v-if="slotProps.data.groupId !== 'ungrouped'"
              class="fcb-action-icon"
              data-tooltip="Edit"
              @click.stop="setEditingGroup(slotProps.data.groupId)"
            >
              <i class="fas fa-edit"></i>
            </a>
            <a
              v-if="slotProps.data.groupId !== 'ungrouped'"
              class="fcb-action-icon"
              data-tooltip="Delete"
              @click.stop="deleteGroup(slotProps.data.groupId)"
            >
              <i class="fas fa-trash"></i>
            </a>
          </div>
        </div>
        <div 
          :class="['fcb-group-header', editingGroupId === slotProps.data.groupId ? 'editing' : '']"
          style="display:inline-block"
          @dragstart="onGroupDragStart($event, slotProps.data.groupId)"
          @dragover="onGroupDragOver($event)"
          @drop="onGroupDrop($event, slotProps.data.groupId)"
          @dragend="onGroupDragEnd"
        >
          <!-- Edit mode -->
          <div v-if="editingGroupId === slotProps.data.groupId" class="fcb-group-edit">
            <InputText 
              v-model="editingGroupName"
              ref="groupEditInput"
              unstyled
              class="fcb-group-input"
              @keydown.enter.stop="saveEditingGroup"
              @keydown.esc.stop="cancelEditGroup"
            />
          </div>
          <!-- Display mode -->
          <div 
            v-else 
            class="fcb-group-display"
            @click.stop="setEditingGroup(slotProps.data.groupId)"
          >
            {{ slotProps.data.name }}
          </div>
        </div>
      </template>

      <Column
        v-if="props.canReorder"
        :row-reorder="true"
        row-reorder-icon="fas fa-grip-vertical"
        header-style="width: 10px; whitespace: nowrap;"
        :reorderable-column="false"
      />

      <Column 
        v-for="col of props.columns" 
        :key="col.field" 
        :field="col.field" 
        :header="col.header" 
        :header-style="col.style"
        :sortable="props.canReorder ? false : col.sortable"
      >
        <template #body="{ data, field }">
          <!-- Skip rendering for group rows in grouped mode -->
          <div v-if="props.grouped && data.isGroup">
            <!-- Group content is rendered in groupheader template -->
          </div>
          
          <!-- ACTIONS -->
          <div v-else-if="field === 'actions'">
            <div 
              :class="[
                'fcb-row-wrapper', 
                isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <template
                v-for="(action, index) in actions"
                :key="index"
              >
                <a
                  v-if="!action.display || action.display(data)"
                  class="fcb-action-icon" 
                  :data-testid="`table-action-${index}-${data.uuid}`"
                  :data-tooltip="action.tooltip"
                  @click.stop="onActionButtonClick(data, action)" 
                >
                  <i :class="`fas ${action.icon}`"></i>
                </a>
              </template>
            </div>
          </div>

          <!-- DRAG HANDLE (FOR DRAGGING ELSEWHERE) -->
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
                <AdvancedTextArea 
                  v-if="!col.smallEditBox"
                  v-model="editingRowData[field]"
                  :id="`${data.uuid}-${field}`" 
                  :data-testid="`table-textarea-${field}`"
                  :setting-id="currentSetting?.uuid"
                  :enable-entity-linking="true"
                  :edit-mode="true"
                  :rows="2"
                  class="fcb-table-textarea"
                  @keydown.enter="onEnterKeyInTextArea" 
                  @keydown.esc.stop="cancelEdit"
                />
                <InputText 
                  v-if="col.smallEditBox"
                  v-model="editingRowData[field]"
                  style="width: 100%; font-size: inherit;"
                  :id="`${data.uuid}-${field}`" 
                  :data-testid="`table-input-${field}`"
                  unstyled
                  @keydown.enter.stop="saveCurrentlyEditingRow" 
                  @keydown.esc.stop="cancelEdit"
                />
              </div>
              <!-- not editing this row but need to put a click event on it to trigger editing -->
              <div 
                v-else
                class="fcb-table-body-text"
                @click="onClickEditableCell($event, data.uuid)"
              >
                <!-- Use AdvancedTextArea in display mode for enriched content -->
                <AdvancedTextArea 
                  v-if="!col.smallEditBox && data[field]"
                  :model-value="data[field]"
                  :setting-id="currentSetting?.uuid"
                  :edit-mode="false"
                  class="fcb-table-display-text"
                />
                <span v-else>
                  {{ data[field] }} &nbsp;
                </span>
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
                :data-testid="`table-checkbox-${field}`"
                @update:model-value="onCheckboxChange(data, field, $event)"
              />
            </div>
          </div>

          <!-- CLICKABLE -->
          <div v-else-if="col.onClick">
            <div 
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '']"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <div
                class="fcb-table-body-text clickable"
                @click.stop="col.onClick($event, data.uuid)"
              >
                <span style="text-decoration: underline;">
                  {{ data[field] }}               
                </span>
                &nbsp; <!-- nbsp because otherwise the cell will have 0 width and the mouse events won't work; here so it doesn't get underlined -->
              </div>
            </div>
          </div>

          <!-- STANDARD -->
          <div v-else>
            <div 
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '']"
              @dragover="onDragoverRow($event, data.uuid)"
              @dragleave="onDragLeaveRow(data.uuid)"
              @drop="onDropRow($event, data.uuid)"
            >
              <div
              >
                <span>
                  {{ data[field] }}               
                </span>
                &nbsp; <!-- nbsp because otherwise the cell will have 0 width and the mouse events won't work -->
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
  import { ref, PropType, computed, reactive, nextTick, watch } from 'vue';
  import { FilterMatchMode } from '@primevue/core/api';

  // local imports
  import { localize } from '@/utils/game';
  import { useMainStore } from '@/applications/stores';
  import { storeToRefs } from 'pinia';
  import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
  import { extractUUIDs, compareUUIDs } from '@/utils/uuidExtraction';
  import { replaceEntityReferences } from '@/utils/entityLinking';

  // library components
  import Button from 'primevue/button';
  import DataTable, {
    DataTableRowContextMenuEvent,
    DataTableRowSelectEvent,
    type DataTableFilterMetaData,
  } from 'primevue/datatable';
  import Column from 'primevue/column';
  import InputText from 'primevue/inputtext';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';
  import Checkbox from 'primevue/checkbox';

  // local components
  import AdvancedTextArea from '@/components/AdvancedTextArea.vue';

  // types
  import { 
    TablePagination, BaseTableGridRow, ActionButtonDefinition, 
    CellEditCompleteEvent, RowEditCompleteEvent, 
    BaseTableColumn, TableGroup, GroupedTableGridRow
  } from '@/types';


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
      default: true,
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
      type: Array as PropType<BaseTableColumn[]>,
      required: true,
    },
    actions: {
      type: Array as PropType<ActionButtonDefinition[]>,
      default: [],
    },
    // can a row be dragged to the canvas/other places in Foundry
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
    // if true, track UUIDs in editable columns and emit relatedEntriesChanged events
    enableRelatedEntriesTracking: {
      type: Boolean,
      default: false,
    },
    // enable grouping mode with groups
    grouped: {
      type: Boolean,
      required: false,
      default: false,
    },
    // array of groups for grouped mode
    groups: {
      type: Array as PropType<TableGroup[]>,
      required: false,
      default: () => [],
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'rowSelect', originalEvent: DataTableRowSelectEvent): void;
    (e: 'addItem'): void;
    (e: 'rowContextMenu', originalEvent: DataTableRowContextMenuEvent): void;
    (e: 'cellEditInit'): void;
    (e: 'cellEditComplete', originalEvent: CellEditCompleteEvent): void;
    (e: 'rowEditComplete', originalEvent: RowEditCompleteEvent): void;
    (e: 'markItemDelivered', uuid: string): void;
    (e: 'unmarkItemDelivered', uuid: string): void;
    (e: 'moveToNextSession', uuid: string): void;
    (e: 'dragstart', event: DragEvent, uuid: string): void;
    (e: 'dragoverNew', event: DragEvent): void;
    (e: 'dragoverRow', event: DragEvent, uuid: string): void;
    (e: 'dropRow', event: DragEvent, uuid: string): void;
    (e: 'dropNew', event: DragEvent): void;
    (e: 'setEditingRow', uuid: string): void;
    (e: 'reorder', reorderedRows: BaseTableGridRow[], dragIndex: number, dropIndex: number): void;
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
    (e: 'groupDelete', groupId: string): void;
    (e: 'groupEdit', groupId: string, newName: string): void;
    (e: 'groupAdd'): void;
    (e: 'update:expandedRowGroups', value: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentSetting } = storeToRefs(mainStore);

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
      ...deriveFilterFields().reduce((acc, field): Record<string, DataTableFilterMetaData> => {
        acc[field] = { value: null, matchMode: FilterMatchMode.CONTAINS };
        return acc;
      }, {} as Record<string, DataTableFilterMetaData>),
    },
  });

  /** which groups are currently expanded, they all start expanded */
  const expandedRowGroups = ref<string[]>(props.groups.map(g => g.groupId));

  /** are we editing and row, and which one (uuid) */
  const editingRow = ref<string | null>(null);
  const editingRowData = ref<any>({});

  /** track if a valid drag is currently over the drop zone */
  const isDragHover = ref<boolean>(false);

  /** track if a valid drag is currently over a row - value is row uuid */
  const isDragHoverRow = ref<string | null>(null);

  /** track initial UUIDs when a row enters edit mode */
  const initialRowUUIDs = ref<string[]>([]);

  /** track if we're editing a group */
  const editingGroupId = ref<string | null>(null);
  const editingGroupName = ref<string>('');

  /** store collapse state during group drag */
  const groupCollapseState = ref<string[]>([]);

  /** track if a group is being dragged */
  const isDraggingGroup = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const effectiveFilterFields = computed(() => deriveFilterFields());

  /** Check if any columns are editable */
  const hasEditableColumns = computed(() => {
    return props.columns.some((col) => col.editable);
  });

  /** Calculate total column count including reorder column if enabled */
  const totalColumnCount = computed(() => {
    return props.columns.length + (props.canReorder ? 1 : 0);
  });

  // PrimeVue disables row reordering when the table is sorted, so omit sort props entirely
  // when canReorder is enabled (array order becomes the displayed order).
  const dataTableSortBindings = computed(() => (
    props.canReorder
      ? {}
      : { sortField: pagination.sortField, sortOrder: pagination.sortOrder, defaultSortOrder: 1 }
  ));

  /** Transform data for grouped mode */
  const transformedData = computed(() => {
    if (!props.grouped) {
      return props.rows;
    }

    const result: (BaseTableGridRow & { isGroup?: boolean; groupId: string })[] = [];
    
    // Add groups and their rows in order
    for (const group of props.groups) {
      // Add group row
      result.push({
        isGroup: true,
        groupId: group.groupId,
        name: group.name,
        uuid: `group-${group.groupId}`, // Add uuid for PrimeVue
      });
      
      // Add data rows for this group
      const groupRows = props.rows.filter(row => 
        (row as GroupedTableGridRow).groupId === group.groupId
      );
      result.push(...groupRows);
    }
    
    return result;
  });

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

    // Track UUIDs if autoRelationships is enabled
    if (ModuleSettings.get(SettingKey.autoRelationships)) {
      initialRowUUIDs.value = getCurrentUUIDs();
    }

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
    emit('cellEditInit');
  };

  /**
   * Sets a group to edit mode
   * @param groupId The ID of the group to edit
   */
  const setEditingGroup = (groupId: string) => {
    if (groupId === 'ungrouped') return; // Can't edit the ungrouped group

    const group = props.groups.find(g => g.groupId === groupId);
    if (!group) return;
    
    editingGroupId.value = groupId;
    editingGroupName.value = group.name;
  };

  /**
   * Saves the currently editing group
   */
  const saveEditingGroup = () => {
    if (!editingGroupId.value) return;
  
    if (editingGroupId.value === 'ungrouped') return; // Can't edit the ungrouped group (should never happen)

    emit('groupEdit', editingGroupId.value, editingGroupName.value);
    editingGroupId.value = null;
    editingGroupName.value = '';
  };

  /**
   * Cancels group editing
   */
  const cancelEditGroup = () => {
    editingGroupId.value = null;
    editingGroupName.value = '';
  };

  /**
   * Deletes a group
   * @param groupId The ID of the group to delete
   */
  const deleteGroup = (groupId: string) => {
    emit('groupDelete', groupId);
  };

  /**
   * Adds a new group
   */
  const addNewGroup = () => {
    emit('groupAdd');
  };

  const cancelEdit = () => {
    // Clean up UUID tracking if canceling
    initialRowUUIDs.value = [];    
    editingRow.value = null;
    editingRowData.value = {};
  };

  const onEnterKeyInTextArea = (event: KeyboardEvent) => {
    if (event.shiftKey) 
      return;

    event.preventDefault();
    event.stopPropagation();
    saveCurrentlyEditingRow();
  };

  /**
   * Saves the currently editing row by extracting values from input fields
   * and emitting cellEditComplete events for each changed field
   * 
   */
  const saveCurrentlyEditingRow = () => {
    // If we're not editing a row, do nothing
    if (!editingRow.value) return;

    // Find the row data
    const originalRowData = props.rows.find((row) => row.uuid === editingRow.value);
    if (!originalRowData) {
      cancelEdit();
      return;
    }
    
    // Emit the cellEditComplete event for each changed field
    for (const col of props.columns) {
      if (col.editable) {
        const id = `${editingRow.value}-${col.field}`;
        const input = document.getElementById(id) as HTMLInputElement;          
        if (input && originalRowData[col.field] !== input.value) {
          // Apply entity linking for AdvancedTextArea columns (non-smallEditBox)
          let newValue = input.value;
          if (!col.smallEditBox) {
            newValue = replaceEntityReferences(newValue, '');

            // save it so we can use it later to check for uuid changes
            editingRowData.value[col.field] = newValue;
          }

          // pull the value from the input and fire an event to save it
          emit('cellEditComplete', {
            data: originalRowData,
            newData: editingRowData.value,
            value: originalRowData[col.field],
            newValue: newValue,
            field: col.field,
            index: props.rows.findIndex((r) => r.uuid === editingRow.value),
            type: 'enter',
          } as CellEditCompleteEvent);
        }
      }
    }

    // Check for UUID changes if autoRelationships is enabled
    if (ModuleSettings.get(SettingKey.autoRelationships)) {
      let uuidChanges: { added: string[]; removed: string[] } | null = null;
      const currentUUIDs = getCurrentUUIDs();
      
      uuidChanges = compareUUIDs(initialRowUUIDs.value, currentUUIDs);

      // Filter out self-references - the row's own UUID should never trigger add/remove prompts
      // This handles the case where notes reference the same entry the row is for
      const rowUuid = editingRow.value;
      const added = uuidChanges.added.filter(uuid => uuid !== rowUuid);
      const removed = uuidChanges.removed.filter(uuid => uuid !== rowUuid);

      if (uuidChanges && (added.length > 0 || removed.length > 0)) {
        emit('relatedEntriesChanged', added, removed);
      }
    }

    // Emit the row editing event for the whole row
    emit('rowEditComplete', {
      data: originalRowData,
      newData: editingRowData.value,
      index: props.rows.findIndex((r) => r.uuid === editingRow.value),
      type: 'enter',
    });

    // Turn off editing mode
    cancelEdit();
  };

  /** Extract UUIDs from all editable columns with editors
   * 
   */
  const getCurrentUUIDs = () => (getRowUUIDs(editingRowData.value));

  /**
   * Extract UUIDs from a specific row's editable columns
   * @param rowData The row data to extract UUIDs from
   */
  const getRowUUIDs = (rowData: BaseTableGridRow): string[] => (
    props.columns.reduce((acc: string[], col: BaseTableColumn) => {
      if (col.editable && !col.smallEditBox && rowData[col.field]) {
        const uuids = extractUUIDs(rowData[col.field] as string);
        acc.push(...uuids);
      }

      return acc;
    }, [] as string[])
  );

 /**
   * Derives the fields to use for global table filtering.
   * - If the caller provides `filterFields`, we use those.
   * - Otherwise, we default to the displayed column fields (excluding special UI-only columns).
   */
   function deriveFilterFields() {
    const NON_FILTERABLE_FIELDS = ['actions', 'drag'];

    if (props.filterFields.length > 0) 
      return props.filterFields;
    
    return props.columns
      .map((col) => col.field)
      .filter((field) => !NON_FILTERABLE_FIELDS.includes(field));
  };

  // Expose the setEditingRow method to parent components
  defineExpose({
    setEditingRow
  });

  ////////////////////////////////
  // event handlers
  const onActionButtonClick = (data: BaseTableGridRow, action: ActionButtonDefinition) => {
    if (action.isEdit) {
      onEditButtonClick(data, action.callback);
    } else if (action.icon === 'fa-trash' && props.enableRelatedEntriesTracking) {
      // Extract UUIDs from the row being deleted and pass to callback
      // Filter out self-references - the row's own UUID should not be included
      const rowUUIDs = getRowUUIDs(data).filter(uuid => uuid !== data.uuid);
      action.callback(data, rowUUIDs);
    } else {
      action.callback(data);
    }
  };

  const onCheckboxChange = (rowData: any, field: string, newValue: boolean) => {
    const event = {
      data: rowData,
      field: field,
      newValue: newValue,
      value: rowData[field],
      index: props.rows.findIndex((r) => r.uuid === rowData.uuid),
      type: 'edit',
    } as CellEditCompleteEvent<boolean>;
    emit('cellEditComplete', event);
  };

  const onClickEditableCell = (event: MouseEvent, uuid: string) => {
    // Check if the click was on a content link - if so, let it bubble up to the application handler
    const target = event.target as HTMLElement;
    if (target.closest('.fcb-content-link') || target.closest('.content-link')) {
      return;
    }

    // Stop propagation for non-link clicks to enter edit mode
    event.stopPropagation();

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

    const { value, dragIndex, dropIndex } = event;

    // In grouped mode, we need to handle cross-group moves
    if (props.grouped) {
      // Find which group the dropped row belongs to
      const droppedRow = value[dropIndex];
      const targetGroupId = (droppedRow as GroupedTableGridRow).groupId;
      
      // Update the row's groupId if it changed groups
      if (targetGroupId) {
        const draggedRow = transformedData.value[dragIndex];
        const originalGroupId = (draggedRow as GroupedTableGridRow).groupId;
        
        // Only update if this is a data row (not a group) and groupId changed
        if (!draggedRow.isGroup && originalGroupId !== targetGroupId) {
          // Find the actual row in props.rows and update its groupId
          const rowIndex = props.rows.findIndex(r => r.uuid === draggedRow.uuid);
          if (rowIndex !== -1) {
            const updatedRows = [...props.rows];
            updatedRows[rowIndex] = {
              ...updatedRows[rowIndex],
              groupId: targetGroupId,
            };
            
            // Reorder all rows based on the new arrangement
            const finalRows = reorderRowsFromTransformed(value);
            emit('reorder', finalRows, dragIndex, dropIndex);
            return;
          }
        }
      }
    }

    emit('reorder', value, dragIndex, dropIndex);
  }

  /**
   * Convert transformed data back to rows array format
   */
  const reorderRowsFromTransformed = (transformed: (BaseTableGridRow & { isGroup?: boolean })[]) => {
    const result: BaseTableGridRow[] = [];
    
    for (const item of transformed) {
      if (!item.isGroup) {
        result.push(item);
      }
    }
    
    return result;
  };

  const onEditButtonClick = (data: BaseTableGridRow, callback: (data: BaseTableGridRow) => void) => {
    // Check if there are any editable columns
    if (hasEditableColumns.value) {
      // If we were already editing a row, save it first
      saveCurrentlyEditingRow();
      
      // If there are editable columns, put the row in edit mode
      setEditingRow(data.uuid);
    } else {
      callback(data);
    }
  }

  const onHelpIconClick = () => {
    if (props.helpLink) {
      window.open(props.helpLink, '_blank');
    }
  }

  const onGroupToggle = (groupId: string) => {
    const newExpanded = [...props.expandedRowGroups];
    const index = newExpanded.indexOf(groupId);
    
    if (index > -1) {
      newExpanded.splice(index, 1);
    } else {
      newExpanded.push(groupId);
    }
    
    emit('update:expandedRowGroups', newExpanded);
  };

  const onGroupDragStart = (event: DragEvent, groupId: string) => {
    if (!event.dataTransfer) return;
    
    // Store the current collapse state
    groupCollapseState.value = [...props.expandedRowGroups];
    
    // Collapse all groups during drag
    emit('update:expandedRowGroups', []);
    
    // Set drag data
    event.dataTransfer.setData('text/plain', groupId);
    event.dataTransfer.effectAllowed = 'move';
    
    isDraggingGroup.value = true;
  };

  const onGroupDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  };

  const onGroupDrop = (event: DragEvent, targetGroupId: string) => {
    event.preventDefault();
    
    if (!event.dataTransfer || !isDraggingGroup.value) return;
    
    const draggedGroupId = event.dataTransfer.getData('text/plain');
    if (draggedGroupId === targetGroupId) return;
    
    // Find indices
    const draggedIndex = props.groups.findIndex(g => g.groupId === draggedGroupId);
    const targetIndex = props.groups.findIndex(g => g.groupId === targetGroupId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Create new groups array with reordered items
    const newGroups = [...props.groups];
    const [draggedGroup] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, draggedGroup);
    
    // Restore collapse state
    emit('update:expandedRowGroups', groupCollapseState.value);
    
    // Emit reorder event with both groups and reordered rows
    const reorderedRows = reorderRowsByGroups(newGroups);
    emit('reorder', reorderedRows, draggedIndex, targetIndex);
  };

  const onGroupDragEnd = () => {
    isDraggingGroup.value = false;
    groupCollapseState.value = [];
  };

  /**
   * Reorder rows based on new group order
   */
  const reorderRowsByGroups = (newGroups: TableGroup[]) => {
    const result: BaseTableGridRow[] = [];
    
    for (const group of newGroups) {
      const groupRows = props.rows.filter(row => 
        (row as GroupedTableGridRow).groupId === group.groupId
      );
      result.push(...groupRows);
    }
    
    return result;
  };

  ////////////////////////////////
  // watchers
  // reload when topic changes
  
  /** Watch for group edit mode to focus input */
  watch(editingGroupId, (newId) => {
    if (newId) {
      nextTick(() => {
        const input = document.querySelector('.fcb-group-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      });
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
  .fcb-table-wrapper {
    font-family: var(--fcb-font-family);
    font-size: var(--fcb-font-size);
  }

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
    color: var(--fcb-link);
    
    &:hover {
      color: var(--fcb-link-hover);
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
      color: var(--fcb-link-hover);
      border-color: var(--fcb-link-hover);
    }
  }

  .fcb-table-new-drop-box {
    line-height:var(--input-height); 
    color: var(--fcb-text); 
    margin-left: 0.75rem; 
    margin-top: -2px;
    border: var(--fcb-text) 1px dashed; 
    padding: 0 2px 0 2px;
    transition: all 0.2s ease;
    
    &.valid-drag-hover {
      color: var(--fcb-link-hover);
      border-color: var(--fcb-link-hover);
    }
  }

  .fcb-table-help-icon {
    margin-left: 8px;
    margin-right: 8px;
  }

  // Group header styles
  .fcb-group-header {
    background-color: var(--fcb-color-surface-200);
    font-weight: bold;
    
    &:hover {
      background-color: var(--fcb-color-surface-300);
    }
    
    &.editing {
      background-color: var(--fcb-color-surface-100);
    }
  }

  .fcb-group-header-actions {
    width: 60px;
    padding: 8px;
    text-align: center;
    border-right: 1px solid var(--fcb-color-border);
  }

  .fcb-group-edit {
    display: iline-block;
    align-items: center;
    height: 100%;
  }

  .fcb-group-input {
    width: 100%;
    font-size: inherit;
    font-family: inherit;
    background: var(--fcb-color-surface-50);
    border: 1px solid var(--fcb-color-border);
    border-radius: 4px;
    padding: 4px 8px;
    
    &:focus {
      outline: none;
      border-color: var(--fcb-link);
    }
  }

  .fcb-group-display {
    display: inline-block;
    align-items: center;
    height: 100%;
  }
</style>
