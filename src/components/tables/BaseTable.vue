<template>
  <div
    class="primevue-only fcb-table-wrapper"
    style="display: flex"
    @dragover="onTableDragover"
    @drop="onTableDrop"
    @dragleave="onTableDragleave"
  >
    <DataTable
      data-key="uuid"
      v-bind="dataTableSortBindings"
      :value="transformedData"
      :row-group-mode="props.grouped ? 'subheader' : undefined"
      :group-rows-by="props.grouped ? 'groupId' : undefined"
      :expandable-row-groups="props.grouped"
      v-model:expanded-row-groups="expandedRowGroups"
      :row-class="getRowClass"
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
          colspan: totalColumnCount
        },
        // the ones that are headers still need the left padding to push
        //   the collapse button and text past the actions
        rowGroupHeaderCell: {
          colspan: totalColumnCount,
          style: 'position: relative; padding-left: 70px !important;'
        },
        rowToggleButton: {
          style: 'color: var(--fcb-text-on-primary); z-index: 2;',
        }
      }"

      @row-contextmenu="emit('rowContextMenu', $event)"
    >
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
              @dragleave="onDragleaveNew"
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
        <!-- Full-cell drop target wrapper - fills entire td to capture all drop events -->
        <div
          class="fcb-group-header-drop-target"
          :class="{
            'reorder-drop-above': reorderDropTarget === slotProps.data.groupId && reorderDropPosition === 'above',
            'reorder-drop-below': reorderDropTarget === slotProps.data.groupId && reorderDropPosition === 'below'
          }"
          :data-group-id="slotProps.data.groupId"
          @dragover="onDragoverGroup($event, slotProps.data.groupId)"
          @dragleave="onDragleaveGroup($event, slotProps.data.groupId)"
          @drop="onDropGroup($event, slotProps.data.groupId)"
        >
          <!-- Invisible overlay to capture drag events in empty space -->
          <div class="fcb-group-header-drag-overlay"></div>
          <!-- Content wrapper positioned with padding to clear the actions -->
          <div class="fcb-group-header-content">
            <!-- Note: slotProps.data is the 1st row in the group -->
            <div
              v-if="slotProps.data.groupId && editingGroupId !== slotProps.data.groupId && slotProps.data.groupId !== UNGROUPED_GROUP_ID"
              class="fcb-group-header-actions"
            >
              <div 
                class="fcb-group-header-grip"
                draggable="true"
                @dragstart="onDragstartGroup($event, slotProps.data.groupId)"
                @dragend="onDragendGroup($event)"
              >
                <i class="fas fa-grip-vertical"></i>
              </div>
              <div>
                <a
                  class="fcb-action-icon"
                  data-tooltip="Edit"
                  @click.stop="setEditingGroup(slotProps.data.groupId)"
                >
                  <i class="fas fa-edit"></i>
                </a>
                <a
                  class="fcb-action-icon"
                  data-tooltip="Delete"
                  @click.stop="deleteGroup(slotProps.data.groupId)"
                >
                  <i class="fas fa-trash"></i>
                </a>
              </div>
            </div>

            <div class="fcb-group-header">
              <!-- Edit mode -->
              <div 
                v-if="slotProps.data.groupId && editingGroupId === slotProps.data.groupId"
                class="fcb-group-edit"
              >
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
                :class="{'fcb-group-display': true, editable: slotProps.data.groupId !== UNGROUPED_GROUP_ID}"
                @click.stop="setEditingGroup(slotProps.data.groupId)"
              >
                {{ groups.find(g => g.groupId === slotProps.data.groupId)?.name }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Custom reorder grip column -->
      <Column
        v-if="props.canReorder"
        header-style="width: 30px; max-width: 30px;"
        :reorderable-column="false"
      >
        <template #body="{ data }">
          <div
            class="fcb-cell-drop-target"
            @dragover="onDragoverRow($event, data.uuid)"
            @dragleave="onDragleaveRow(data.uuid)"
            @drop="onDropRow($event, data.uuid)"
          >
            <div
              v-if="!isPlaceholderRow(data.uuid)"
              class="fcb-drag-handle"
              draggable="true"
              @dragstart="onDragstartRow($event, data.uuid)"
              @dragend="onDragendRow()"
            >
              <i class="fas fa-grip-vertical"></i>
            </div>
          </div>
        </template>
      </Column>

      <Column 
        v-for="(col, colIndex) of props.columns" 
        :key="col.field" 
        :field="col.field" 
        :header="col.header" 
        :header-style="col.style"
        :sortable="props.canReorder ? false : col.sortable"
      >
        <template #body="{ data, field }">
          <div
            class="fcb-cell-drop-target"
            @dragover="onDragoverRow($event, data.uuid)"
            @dragleave="onDragleaveRow(data.uuid)"
            @drop="onDropRow($event, data.uuid)"
          >
          <!-- ACTIONS -->
          <div v-if="field === 'actions' && !isPlaceholderRow(data.uuid)">
            <div
              :class="[
                'fcb-row-wrapper',
                isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
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
              v-if="!isPlaceholderRow(data.uuid) && data.draggableId"
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
              :data-tooltip="data.dragTooltip"
            >
              <div 
                class="fcb-drag-handle" 
                draggable="true"
                @dragstart="onDragstart($event, data.draggableId)"
              >
                <i class="fas fa-bars"></i>
              </div>
            </div>
          </div>

          <!-- EDITABLE TEXT -->
          <div v-else-if="col.editable && col.type !== 'boolean' && !isPlaceholderRow(data.uuid)">
            <div
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '',
              ]"
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
          <div v-else-if="col.onClick && !isPlaceholderRow(data.uuid)">
            <div
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '']"
            >
              <div
                class="fcb-table-body-text clickable"
                @click.stop="col.onClick($event, data)"
              >
                <span style="text-decoration: underline;">
                  {{ data[field] }}               
                </span>
                &nbsp; <!-- nbsp because otherwise the cell will have 0 width and the mouse events won't work; here so it doesn't get underlined -->
              </div>
            </div>
          </div>

          <!-- PLACEHOLDER -->
          <div v-else-if="colIndex===placeholderColumnIndex && isPlaceholderRow(data.uuid)">
            <div
              class="fcb-row-wrapper"
            >
              <div>
                <span>
                  {{ localize('labels.noResults') }}
                </span>
              </div>
            </div>
          </div>

          <!-- STANDARD -->
          <div v-else>
            <div
              :class="['fcb-row-wrapper', isDragHoverRow===data.uuid ? 'valid-drag-hover' : '']"
            >
              <div>
                <span>
                  {{ data[field] }}               
                </span>
                &nbsp; <!-- nbsp because otherwise the cell will have 0 width and the mouse events won't work -->
              </div>
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
    BaseTableColumn, TableGroup, GroupedTableGridRow,
    UNGROUPED_GROUP_ID
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
    /** can rows be dragged around to reorder them (prevents sorting by column headers) */
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
    // array of groups for grouped mode (excluding ungrouped)
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

    /** Start of a drag into foundry */
    (e: 'dragstart', event: DragEvent, uuid: string): void;

    /** Dragging something external over a new drop zone */
    (e: 'dragoverNew', event: DragEvent): void;

    /** Dragging something external over a row */
    (e: 'dragoverRow', event: DragEvent, uuid: string): void;

    /** Dropping something external on a row */
    (e: 'dropRow', event: DragEvent, uuid: string): void;

    /** Dropping something external on a new drop zone */
    (e: 'dropNew', event: DragEvent): void;
    (e: 'setEditingRow', uuid: string): void;

    /** Rows were reordered; reorderedRow is rows in new order; drag/drop are relative to new order */
    (e: 'reorder', reorderedRows: BaseTableGridRow[], dragIndex: number, dropIndex: number): void;

    /** Groups were reordered; param is group IDs in new order */
    (e: 'reorderGroup', reorderedGroups: string[]): void;

    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
    (e: 'groupDelete', groupId: string): void;
    (e: 'groupEdit', groupId: string, newName: string): void;
    (e: 'groupAdd'): void;
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
  const expandedRowGroups = ref<string[]>([UNGROUPED_GROUP_ID, ...props.groups.map(g => g.groupId)]);

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
  const reorderDragGroupId = ref<string | null>(null);

  /** the row being dragged for reorder; we need this to track the uuid during dragover 
   * events (where the browser restricts access to event.data) */
  const reorderDragUuid = ref<string | null>(null);

  /** the row currently being hovered during reorder (uuid) */
  const reorderDropTarget = ref<string | null>(null);

  /** whether the drop would be above or below the target row */
  const reorderDropPosition = ref<'above' | 'below'>('below');

  /** Timer for delayed group expansion during row/external drag */
  const groupExpandTimer = ref<ReturnType<typeof setTimeout> | null>(null);

  /** The group that will be expanded after the timer */
  const pendingExpandGroupId = ref<string | null>(null);

  /** Helper to clear the group expand timer */
  const clearGroupExpandTimer = () => {
    if (groupExpandTimer.value) {
      clearTimeout(groupExpandTimer.value);
      groupExpandTimer.value = null;
      pendingExpandGroupId.value = null;
    }
  };

  ////////////////////////////////
  // computed data
  const effectiveFilterFields = computed(() => deriveFilterFields());

  // add the 'ungrouped' group to the groups list
  const groups = computed(() => {
    return [{ groupId: UNGROUPED_GROUP_ID, name: 'Ungrouped' }, ...props.groups];
  });
  
  /** Check if any columns are editable */
  const hasEditableColumns = computed(() => {
    return props.columns.some((col) => col.editable);
  });

  /**
   * Find the first text-based column index for placeholder rendering.
   * This is the first column that is not 'actions', 'drag', or a boolean type.
   * Used to display "No results" text in empty group placeholders.
   */
  const placeholderColumnIndex = computed(() => {
    return props.columns.findIndex((col) =>
      col.field !== 'actions' &&
      col.field !== 'drag' &&
      col.type !== 'boolean'
    );
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

  /** Returns CSS class for a row based on reorder drop target state */
  const getRowClass = (data: BaseTableGridRow) => {
    if (reorderDropTarget.value === data.uuid) {
      return reorderDropPosition.value === 'above' ? 'reorder-drop-above' : 'reorder-drop-below';
    }
    return '';
  };
  
  /** Transform data for grouped mode */
  const transformedData = computed(() => {
    if (!props.grouped) {
      return props.rows;
    }

    let result: GroupedTableGridRow[] = [];

    // rows with an invalid group - set to ungrouped
    const cleanedRows = (props.rows as GroupedTableGridRow[])
      .map((row: GroupedTableGridRow): GroupedTableGridRow => {
        if (row.groupId && groups.value.some(g => g.groupId === row.groupId)) {
          return row;
        }
        
        return { ...row, groupId: UNGROUPED_GROUP_ID };
      });

    // groups with no rows (but not the empty one) - add placeholders
    props.groups
      .filter(g => !cleanedRows.some(r => r.groupId === g.groupId))
      .forEach((g: TableGroup) => {
        cleanedRows.push({
          groupId: g.groupId,
          uuid: `placeholder|${g.groupId}`
        })
      });
    
    // Add groups and their rows in order
    for (const group of groups.value) {
      // Add data rows for this group
      const groupRows = cleanedRows
        .filter((row: GroupedTableGridRow) => 
          (row.groupId === group.groupId) || (group.groupId===UNGROUPED_GROUP_ID && !row.groupId)
        )
      result.push(...groupRows);
    };
    
    return result;
  });

  ////////////////////////////////
  // methods
  /** 
   * Determine if a row is a placeholder for an empty group 
   */
  const isPlaceholderRow = (uuid: string) => {
    return uuid.startsWith('placeholder|');
  };

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
    if (!groupId || groupId===UNGROUPED_GROUP_ID) return; // Can't edit the ungrouped group

    const group = groups.value.find(g => g.groupId === groupId);
    if (!group) return;
    
    editingGroupId.value = groupId;
    editingGroupName.value = group.name;
  };

  /**
   * Saves the currently editing group
   */
  const saveEditingGroup = () => {
    if (!editingGroupId.value) return;
  
    if (editingGroupId.value===UNGROUPED_GROUP_ID) return; // Can't edit the ungrouped group (should never happen)

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
  
  /** For dragging a row into Foundry */
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

  const onDragleaveNew = () => {
    // Reset the valid drag state when the drag leaves the drop zone
    isDragHover.value = false;
  }

  const onDropNew = (event: DragEvent) => {
    // Reset the valid drag state
    isDragHover.value = false;
    
    // Call the parent's drop handler
    emit('dropNew', event);
  }

  const onDragstartRow = (event: DragEvent, uuid: string) => {
    if (!event.dataTransfer)
      return;

    reorderDragUuid.value = uuid;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', uuid);
  };

  const onDragendRow = () => {
    if (!reorderDragUuid.value) return;
    
    // Clear the expand timer if it's running
    clearGroupExpandTimer();
    
    // Clear drag data
    reorderDragUuid.value = null;
  };


  const onDragstartGroup = (event: DragEvent, groupId: string) => {
    if (!event.dataTransfer) return;
    
    // Store the current collapse state
    groupCollapseState.value = [...expandedRowGroups.value];
    
    // Set drag data
    event.dataTransfer.setData('text/plain', groupId);
    event.dataTransfer.effectAllowed = 'move';

    // Store which group is being dragged
    reorderDragGroupId.value = groupId;
    
    // Defer collapsing groups to avoid blocking the drag operation
    setTimeout(() => {
      expandedRowGroups.value = [];
    }, 0);
  };

  const onDragendGroup = (_event: DragEvent) => {
    if (!reorderDragGroupId.value) return;
    
    // Reset the current collapse state
    expandedRowGroups.value = groupCollapseState.value;
        
    // Clear drop target and position
    reorderDropTarget.value = null;
    reorderDropPosition.value = 'below';
    
    // Clear drag data
    reorderDragGroupId.value = null;
  };

  const onDragoverRow = (event: DragEvent, uuid: string) => {
    // see if we're allowed to drop stuff on rows
    if (props.allowDropRow && !reorderDragUuid.value) {
      // First, call the parent's dragover handler
      emit('dragoverRow', event, uuid);

      // Check if this is a valid drag (has text/plain data)
      if (event.dataTransfer && event.dataTransfer.types.includes('text/plain')) {
        isDragHoverRow.value = uuid;
      } else {
        isDragHoverRow.value = null;
      }
    } else if (reorderDragUuid.value) {
      // check for reordering of rows
      if (reorderDragUuid.value === uuid) return;
      if (isPlaceholderRow(uuid)) return;

      event.preventDefault();
      event.dataTransfer!.dropEffect = 'move';

      // Determine above/below based on mouse position within the row
      const row = (event.currentTarget as HTMLElement).closest('tr');
      if (row) {
        const rect = row.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        reorderDropPosition.value = event.clientY < midpoint ? 'above' : 'below';
      }

      reorderDropTarget.value = uuid;
    }
  };

  const onDragoverGroup = (event: DragEvent, groupId: string) => {
    // Handle group reordering
    if (reorderDragGroupId.value) {
      if (reorderDragGroupId.value === groupId) return;

      event.preventDefault();
      event.dataTransfer!.dropEffect = 'move';

      // Determine above/below based on mouse position within the group header
      const groupHeader = (event.currentTarget as HTMLElement).closest('.p-datatable-row-group-header');
      if (groupHeader) {
        const rect = groupHeader.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        // Update the shared reorder tracking variables
        reorderDropTarget.value = groupId;
        
        // Prevent dropping above the 'ungrouped' group - only allow below
        if (groupId === UNGROUPED_GROUP_ID) {
          reorderDropPosition.value = 'below';
        } else {
          reorderDropPosition.value = event.clientY < midY ? 'above' : 'below';
        }
      }
    }
    // Handle row dragging over groups
    else if (reorderDragUuid.value) {
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'move';
      
      // Start timer to expand group after 600ms delay (only if not already expanded)
      if (groupId && pendingExpandGroupId.value !== groupId &&!expandedRowGroups.value.includes(groupId)) {
        // Clear any existing timer only when switching to a different group
        if (groupExpandTimer.value) {
          clearTimeout(groupExpandTimer.value);
        }
        
        pendingExpandGroupId.value = groupId;

        groupExpandTimer.value = setTimeout(() => {
          if (pendingExpandGroupId.value && !expandedRowGroups.value.includes(pendingExpandGroupId.value)) {
            expandedRowGroups.value.push(pendingExpandGroupId.value);
          }
          groupExpandTimer.value = null;
          pendingExpandGroupId.value = null;
        }, 600);
      }
    }
    // Handle external drops on group - not allowed
    else if (props.allowDropRow && event.dataTransfer && event.dataTransfer.types.includes('text/plain')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'none';
    }
  };

  /** 
   * Reset the drop target when the drag leaves the row
   */
  const onDragleaveRow = (uuid: string) => {
    // Reset the valid drag state when the drag leaves the drop zone
    if (isDragHoverRow.value===uuid)
      isDragHoverRow.value = null;

    // Reset the drop target if it was on this row
    if (reorderDropTarget.value === uuid)
      reorderDropTarget.value = null;
  };

  /**
   * Reset the drop target when the drag leaves the group
   */
  const onDragleaveGroup = (event: DragEvent, groupId: string) => {
    // Check if we're actually leaving the group header area
    const groupHeader = (event.currentTarget as HTMLElement).closest('.p-datatable-row-group-header');
    const relatedTarget = event.relatedTarget as Node;
    const isLeaving = groupHeader && !groupHeader.contains(relatedTarget);
    
    if (isLeaving) {
      // Reset the drop target if it was on this group
      if (reorderDropTarget.value === groupId || reorderDropTarget.value === `header:${groupId}`)
        reorderDropTarget.value = null;
      
      // Always clear the expand timer when leaving the group header
      clearGroupExpandTimer();
    }
  };

  /**
   * Handle the drop event on a row
   */
  const onDropRow = (event: DragEvent, uuid: string) => {
    // Clear the expand timer if it's running
    clearGroupExpandTimer();
    
    if (props.allowDropRow && !reorderDragUuid.value) {
      // Reset the valid drag state
      if (isDragHoverRow.value===uuid)
        isDragHoverRow.value = null;
     
      // Call the parent's drop handler
      emit('dropRow', event, uuid);
    } else if (reorderDragUuid.value) {
      event.preventDefault();

      // make sure there actually is a row being dragged and it's not the same one
      if (reorderDragUuid.value === uuid) {
        // same row - do nothing but clean up
        reorderDragUuid.value = null;
        reorderDropTarget.value = null;
        return;
      }

      // get the current rows
      const currentRows = [...transformedData.value];

      // get the index or row being dropped
      const dragIndex = currentRows.findIndex(r => r.uuid === reorderDragUuid.value);

      // index of the row being dropped on
      const rawDropIndex = currentRows.findIndex(r => r.uuid === uuid);

      // make sure we found both rows
      if (dragIndex === -1 || rawDropIndex === -1) {
        // Clean up
        reorderDragUuid.value = null;
        reorderDropTarget.value = null;
        return;
      }

      // Remove dragged row from old position
      const [removed] = currentRows.splice(dragIndex, 1);

      // Get target row data to check groupId
      const targetData = currentRows.find(r => r.uuid === uuid);
      
      // Update groupId if crossing groups in grouped mode
      const newGroupId = (targetData as GroupedTableGridRow)?.groupId;
      if (props.grouped && newGroupId) {
        (removed as GroupedTableGridRow).groupId = newGroupId;

        // placehodlers and group id will get adjusted when the parent resets the rows prop
      }

      // Calculate insertion index (adjust for the splice above)
      const adjustedDropIndex = dragIndex < rawDropIndex ? rawDropIndex - 1 : rawDropIndex;
      const insertIndex = reorderDropPosition.value === 'below' ? adjustedDropIndex + 1 : adjustedDropIndex;
      currentRows.splice(insertIndex, 0, removed);

      emit('reorder', currentRows.filter(r => !isPlaceholderRow(r.uuid)), dragIndex, insertIndex);

      // Clean up
      reorderDragUuid.value = null;
      reorderDropTarget.value = null;
    }
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

  const onDropGroup = (event: DragEvent, groupId: string) => {
    event.preventDefault();
    
    // Clear the expand timer if it's running
    clearGroupExpandTimer();
    
    // Handle group reordering
    if (reorderDragGroupId.value && event.dataTransfer) {
      const draggedGroupId = event.dataTransfer.getData('text/plain');
      if (draggedGroupId === groupId) {
        // Clean up without changes
        expandedRowGroups.value = groupCollapseState.value;
        reorderDragGroupId.value = null;
        reorderDropTarget.value = null;
        return;
      }
      
      // Find indices
      const draggedIndex = groups.value.findIndex(g => g.groupId === draggedGroupId);
      const targetIndex = groups.value.findIndex(g => g.groupId === groupId);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        // Clean up
        expandedRowGroups.value = groupCollapseState.value;
        reorderDragGroupId.value = null;
        reorderDropTarget.value = null;
        return;
      }
      
      // Create new groups array with reordered items
      const newGroups = [...groups.value];
      const [draggedGroup] = newGroups.splice(draggedIndex, 1);
      
      // Calculate insertion index (adjust for the splice above)
      const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const insertIndex = reorderDropPosition.value === 'below' ? adjustedTargetIndex + 1 : adjustedTargetIndex;
      newGroups.splice(insertIndex, 0, draggedGroup);
      
      // Restore collapse state
      expandedRowGroups.value = groupCollapseState.value;
      
      // Filter out the 'ungrouped' group and emit reorder event
      const reorderedGroupIds = newGroups
        .filter(g => g.groupId !== UNGROUPED_GROUP_ID)
        .map(g => g.groupId);
      
      emit('reorderGroup', reorderedGroupIds);
    }
    // Handle row being dropped on group
    else if (reorderDragUuid.value && groupId) {
      const currentRows = [...transformedData.value];
      const dragIndex = currentRows.findIndex(r => r.uuid === reorderDragUuid.value);
      
      if (dragIndex === -1) {
        reorderDragUuid.value = null;
        reorderDropTarget.value = null;
        return;
      }
      
      // Remove dragged row from old position
      const [removed] = currentRows.splice(dragIndex, 1);
      
      // Update the row's group
      (removed as GroupedTableGridRow).groupId = groupId;

      // drop index is the same as the 1st row of the group 
      const dropIndex = currentRows.findIndex(r => r.groupId === groupId);
      
      if (dropIndex !== -1) {
        currentRows.splice(dropIndex, 0, removed);
      } else {
        // Group is empty, just add the row
        currentRows.push(removed);
      }
      
      emit('reorder', currentRows.filter(r => !isPlaceholderRow(r.uuid)), dragIndex, dropIndex);
    }
    // Handle external drops on group - not allowed
    else if (props.allowDropRow && event.dataTransfer && event.dataTransfer.types.includes('text/plain')) {
    }
    
    // Clean up
    reorderDragGroupId.value = null;
    reorderDropTarget.value = null;
  };


  ////////////////////////////////
  // Table-level event handlers (for catching drops in gaps between rows)
  
  /**
   * Handle dragover at table level - finds the row under the cursor
   */
  const onTableDragover = (event: DragEvent) => {
    if (!reorderDragUuid.value) return;
    
    // Find the row element under the cursor
    const row = (event.target as HTMLElement).closest('tr');
    if (!row) return;
    
    // Get the uuid from the row's data attribute or find it in transformedData
    const rowIndex = row.getAttribute('data-p-index');
    if (rowIndex === null) return;
    
    const rowData = transformedData.value[parseInt(rowIndex)];
    if (!rowData || rowData.uuid === reorderDragUuid.value) return;
    if (isPlaceholderRow(rowData.uuid)) return;
    
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    
    // Determine above/below based on mouse position
    const rect = row.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    reorderDropPosition.value = event.clientY < midpoint ? 'above' : 'below';
    reorderDropTarget.value = rowData.uuid;
  };
  
  /**
   * Handle drop at table level - forwards to onDropRow
   */
  const onTableDrop = (event: DragEvent) => {
    if (!reorderDragUuid.value) return;
    
    // Find the row element under the cursor
    const row = (event.target as HTMLElement).closest('tr');
    if (!row) return;
    
    // Get the uuid from the row's data attribute
    const rowIndex = row.getAttribute('data-p-index');
    if (rowIndex === null) return;
    
    const rowData = transformedData.value[parseInt(rowIndex)];
    if (!rowData) return;
    
    // Forward to onDropRow
    onDropRow(event, rowData.uuid);
  };
  
  /**
   * Handle dragleave at table level
   */
  const onTableDragleave = (event: DragEvent) => {
    // Only clear if we're actually leaving the table wrapper
    const relatedTarget = event.relatedTarget as Node;
    const tableWrapper = (event.currentTarget as HTMLElement);
    
    if (relatedTarget && tableWrapper.contains(relatedTarget)) {
      return; // Still inside the table
    }
    
    // Clear drop target
    reorderDropTarget.value = null;
    clearGroupExpandTimer();
  };

  ////////////////////////////////
  // watchers
  // reload when topic changes
  
  /** Watch for group edit mode to focus input */
  watch(editingGroupId, (newId) => {
    if (newId && newId!==UNGROUPED_GROUP_ID) {
      nextTick(() => {
        const input = document.querySelector('.fcb-group-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      });
    }
  });

</script>

<style lang="scss" scoped>
  .fcb-table-wrapper {
    font-family: var(--fcb-font-family);
    font-size: var(--fcb-font-size);
  }

  // Remove td padding so the drop target wrapper fills the entire cell,
  // preventing dead zones at cell borders where drop events wouldn't fire
  :deep(.p-datatable.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0 !important;
  }

  .fcb-cell-drop-target {
    padding: 0.375rem 0.5rem;
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

  // Full-cell drop target that fills the entire td to capture all drop events
  // The td gets position:relative via :pt on rowGroupHeaderCell
  // pointer-events: none allows clicks to pass through to action buttons and toggle
  .fcb-group-header-drop-target {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-color: var(--fcb-primary); 
    color: var(--fcb-text-on-primary);

    &.reorder-drop-above {
      border-top: 2px solid var(--fcb-text-on-primary) !important;
    }

    &.reorder-drop-below {
      border-bottom: 2px solid var(--fcb-text-on-primary) !important;
    }
  }

  // Invisible overlay to capture drag events in empty space
  .fcb-group-header-drag-overlay {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: auto; // Capture drag events
    // No background - invisible
  }

  // Content wrapper positioned with padding to clear the actions area
  .fcb-group-header-content {
    position: relative;
    z-index: 1; // Above the overlay - clicks go here instead
    display: inline-block;
    padding-left: 70px; // Clear space for actions
    height: 100%;
    pointer-events: auto; // Ensure pointer events work on content
  }

  // Actions are absolutely positioned to the left of the content
  .fcb-group-header-actions {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    padding-left: 10px;
    display: flex;
    align-items: center;
    z-index: 2; // Above drop target for click events
    pointer-events: auto; // Ensure pointer events work on action buttons
  }

  .fcb-group-header-grip {
    color: var(--text-on-primary); 
    cursor: grab; 
    margin-right: 18px
  }

  .fcb-group-header {
    // display: inline-block;
    background-color: var(--fcb-color-surface-200);
    font-weight: bold;
    // vertical-align: super; // gets it close to middle
    height: 100%;
    display: flex;
    align-items: center;
    padding-left: 30px;

    &:hover {
      background-color: var(--fcb-color-surface-300);
    }

    .fcb-group-display.editable {
      cursor: pointer;
    }
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

  // Visual drop indicators for row reorder
  :deep(tr.reorder-drop-above) {
    border-top: 2px solid var(--fcb-link);
  }

  :deep(tr.reorder-drop-below) {
    border-bottom: 2px solid var(--fcb-link);
  }

</style>
