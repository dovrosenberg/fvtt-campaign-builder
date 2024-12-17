<template>
  <div class="primevue-only">
    <DataTable
      v-model:filters="pagination.filters"
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
      :global-filter-fields="filterFields"
      :rows="pagination.rowsPerPage"
      filter-display="row"
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
        table: { style: 'margin: 0px;'}
      }"
      @row-select="onRowSelect"
    >
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <Button
            color="primary" 
            :label="newItemLabel" 
            style="flex: initial; width:auto;"
            @click="onAddItemClick"
          >
            <template #icon>
              <!-- icon="o_add_circle"  -->
              <i class="fas fa-plus"></i>
            </template>
          </Button>
          <!-- <q-btn v-if="showGenerate"
            color="primary" 
            icon="psychology" 
            label="Generate" 
            @click=""
          /> -->
          <IconField icon-position="left">
            <InputIcon>
              <i class="fas fa-search"></i>
            </InputIcon>
            <InputText 
              v-model="pagination.filters.global.value"  
              placeholder="Keyword Search"
            />
          </IconField>
        </div>
      </template>
      <template #empty>
        {{ localize('fwb.labels.noResults') }} 
      </template>
      <template #loading>
        {{ localize('fwb.labels.loading') }}...
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
            class="" 
            :data-tooltip="localize('fwb.tooltips.deleteRelationship')"
            @click.stop="onDeleteItemClick(data.uuid)" 
          >
            <i class="fas fa-trash"></i>
          </a>
          <a 
            v-if="extraColumns.length>0"
            class="" 
            :data-tooltip="localize('fwb.tooltips.editRelationship')"
            @click.stop="onEditItemClick(data)" 
          >
            <i class="fas fa-pen"></i>
          </a>
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
          />
        </template> -->
      </Column>
    </DataTable>
  </div>


  <!-- <ItemTable 
    :pagination="(relationshipStore.relatedItemPagination[topic])"
    :filter="relationshipStore.relatedItemPagination[topic].filter"
    @pagination-changed="onPaginationChanged"
  /> -->

  <EditRelatedItemDialog 
    v-if="extraColumns.length>0"
    v-model="editDialogShow"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :extra-field-values="editItem.extraFields"
    :topic="props.topic"
  />
  <AddRelatedItemDialog 
    v-model="addDialogShow"
    :topic="props.topic"
  /> 
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType } from 'vue';
  import { clone } from 'lodash';
  import { storeToRefs } from 'pinia';
  import { FilterMatchMode } from '@primevue/core/api';

  // local imports
  import { useMainStore, useNavigationStore, useRelationshipStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import Button from 'primevue/button';
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import InputText from 'primevue/inputtext';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';

  // local components
  import AddRelatedItemDialog from './AddRelatedItemDialog.vue';
  import EditRelatedItemDialog from './EditRelatedItemDialog.vue';

  // types
  import { Topic, TablePagination, ValidTopic, RelatedItemDetails } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    topic: { 
      type:Number as PropType<ValidTopic>, 
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();

  const { currentEntryTopic } = storeToRefs(mainStore);
  const { relatedItemRows, } = storeToRefs(relationshipStore);
  const extraFields = relationshipStore.extraFields;

  ////////////////////////////////
  // data
  const addDialogShow = ref(false);   // should we pop up the add dialog?
  const editDialogShow = ref(false);   // should we pop up the edit dialog?
    
  ref<string>('');   // text to filter the table rows
  const editItem = ref({
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { itemId: string; itemName: string; extraFields: {field: string; header: string; value: string}[] });
  const pagination = ref<TablePagination>({
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 1,
    rowsPerPage: 5, 
    filters: {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { value: null, matchMode: FilterMatchMode.CONTAINS },
      type: { value: null, matchMode: FilterMatchMode.CONTAINS },
      role: { value: null, matchMode: FilterMatchMode.CONTAINS },  // TODO: support any extra columns
    },
  });

  ////////////////////////////////
  // computed data
  const filterFields = computed(() => {
    let base = ['name', 'type'];

    extraColumns.value.forEach((field) => {
      base = base.concat([field.field]);
    });

    return base;
  });

  const newItemLabel = computed(() => {
    const prefix = 'Add ';

    const labels = {
      [Topic.Event]: 'Event',
      [Topic.Character]: 'Character',
      [Topic.Location]: 'Location',
      [Topic.Organization]: 'Organization',
    } as Record<ValidTopic, string>;

    return prefix + labels[props.topic];
  });

  type GridRow = { uuid: string; name: string; type: string } & Record<string, string>;

  const rows = computed((): GridRow[] => 
    relatedItemRows.value.map((item: RelatedItemDetails<any, any>) => {
      const base = { uuid: item.uuid, name: item.name, type: item.type };

      extraColumns.value.forEach((field) => {
        base[field.field] = item.extraFields[field.field];
      });

      return base;
    })
  );

  // map the extra fields to columns, adding style and sortable if not present in the field
  const extraColumns = computed(() => {
    if (!extraFields || !extraFields[currentEntryTopic.value] || !extraFields[currentEntryTopic.value][props.topic])
      return [];

    return extraFields[currentEntryTopic.value][props.topic].map((field) => ({
      style: 'text-align: left',
      sortable: true,
      ...field,
    }));
  });

  const columns = computed((): any[] => {
    // they all have some standard columns
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true }; 
    const typeColumn = { field: 'type', style: 'text-align: left', header: 'Type', sortable: true }; 
    const dateColumn = { field: 'date', style: 'text-align: left', header: 'Date', format: (val: string) => (/*dateText(calendar.value, val)*/ val), sortable: true}; 

    const columns = {
      [Topic.Event]: [
        actionColumn,
        nameColumn,
        dateColumn,
      ],
      [Topic.Character]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
      [Topic.Location]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
      [Topic.Organization]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
    } as Record<ValidTopic, any[]>;

    if (extraColumns.value.length > 0) {
      // add the extra fields
      columns[props.topic] = (columns[props.topic] || []).concat(extraColumns.value.map((field) => ({
        field: field.field, 
        style: 'text-align:left',
        header: field.header, 
        sortable: true, 
      })
      ));
    }

    return columns[props.topic] || [];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onAddItemClick = () => {
    addDialogShow.value = true;
  };

  const onRowSelect = async function (event: { data: GridRow} ) { 
    // TODO - hold down control to open in a new tab
    await navigationStore.openEntry(event.data.uuid, { newTab: false });
  };

  // show the edit dialog
  const onEditItemClick = function(row: GridRow) {
    // assemble the extra field data
    const fieldsToAdd = extraColumns.value.reduce((accum, col) => {
      accum.push({
        field: col.field,
        header:col.header,
        value: row[col.field as keyof typeof row]
      });
      return accum;
    }, [] as {field: string; header: string; value: string}[]);

    // set up the parameter and open the dialog
    editItem.value = {
      itemId: row.uuid,
      itemName: row.name,
      extraFields: clone(fieldsToAdd),
    };
    editDialogShow.value = true;
  };

  // call mutation to remove item  from relationship
  const onDeleteItemClick = async function(_id: string) {
    // show the confirmation dialog 
    await Dialog.confirm({
      title: localize('fwb.dialogs.confirmDeleteRelationship.title'),
      content: localize('fwb.dialogs.confirmDeleteRelationship.message'),
      yes: () => { void relationshipStore.deleteRelationship(props.topic, _id); },
      no: () => {},
    });
  };
  
  const onPaginationChanged = async function (newPagination: TablePagination | { filter: string; pagination: TablePagination }) {
    // this gets called for filter changes and pagination changes, but with a different argument !?
    if (Object.keys(newPagination).includes('pagination')) {
      relationshipStore.relatedItemPagination[props.topic] = {
        ...(newPagination as {pagination: TablePagination}).pagination,
        filter: newPagination.filter,
      };
    } else {
      relationshipStore.relatedItemPagination[props.topic] = {
        ...(newPagination as TablePagination),
        filter: relationshipStore.relatedItemPagination[props.topic].filter,
      };
    }
  };

  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
  .action-icon {
    cursor: pointer;
  }
</style>
