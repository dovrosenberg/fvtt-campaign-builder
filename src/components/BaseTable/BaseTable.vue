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
      :sort-field="pagination.sortField"
      :sort-order="pagination.sortOrder"
      :default-sort-order="1"
      :total-records="rows.length"
      :global-filter-fields="props.filterFields"
      :rows="pagination.rowsPerPage"
      :filters="pagination.filters"
      :filter-display="filterDisplay"
      selection-mode="single" 
      :pt="{
        header: { style: 'border: none' },
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
        table: { style: 'margin: 0px;'},
      }"

      @row-select="emit('rowSelect', $event)"
      @row-contextmenu="emit('rowContextMenu', $event)"
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
              {{ props.extraAddText }}
            </div>
          </div>
          <!-- <q-btn v-if="showGenerate"
            color="primary" 
            icon="psychology" 
            label="Generate" 
            @click=""
          /> -->
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
            @click.stop="emit('editItem', data)" 
          >
            <i class="fas fa-pen"></i>
          </a>
        </template>
        <template
          v-else
          #body="{ data }"
        >
          <div 
            @dragstart="onRowDragStart($event, data.uuid)"
            draggable="true"
            style="cursor: grab;"
          >
            {{ data[col.field] }}
          </div>
        </template>

        <!-- template to add the filter headers fof name/type/role columns -->
        <!-- <template 
          v-if="['name', 'type', 'role'].includes(col.field)"
          #filter="{ filterModel, filterCallback }"
        >
          <InputText 
            v-model="filterModel.value" 
            type="text" 
            :placeholder="`Search by ${col.header}`" 
            @input="filterCallback()" 
            unstyled
          />
        </template> -->
      </Column>
    </DataTable>
  </div>

</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, computed } from 'vue';
  import { FilterMatchMode } from '@primevue/core/api';

  // local imports
  import { localize } from '@/utils/game';

  // library components
  import Button from 'primevue/button';
  import DataTable, { DataTableFilterMetaData } from 'primevue/datatable';
  import Column from 'primevue/column';
  import InputText from 'primevue/inputtext';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';

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
    extraAddText: {   // displays as text next to the add button (even if no button)
      type: String, 
      default: '',
    },
    filterFields: {
      type: Array as PropType<string[]>,   // list of column names you can filter on
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
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'rowSelect', originalEvent: DataTableRowSelectEvent): void;
    (e: 'editItem', uuid: string): void;
    (e: 'deleteItem', uuid: string): void;
    (e: 'addItem'): void;
    (e: 'rowContextMenu', originalEvent: DataTableRowContextMenuEvent): void;
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
    filters: {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      ...props.filterFields.reduce((acc, field): Record<string, DataTableFilterMetaData> => {
        acc[field] = { value: null, matchMode: FilterMatchMode.CONTAINS };
        return acc;
      }, {} as Record<string, DataTableFilterMetaData>)
    }
  });

  ////////////////////////////////
  // computed data
  const filterDisplay = computed((): 'menu' | 'row' | undefined=> {
    // for now, let's not use the individual headers
    return undefined;

    // return props.filterFields.length === 0 ? undefined : 'row'
  })
  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
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
</style>
