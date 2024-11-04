<template>
  <div class="primevue-only">
    <DataTable
      :value="props.rows"
      size="small"
      paginator
      paginator-position="bottom"
      lazy
      :sort-field="pagination.sortField"
      :sort-order="pagination.sortOrder"
      :default-sort-order="1"
      :total-records="pagination.totalRecords"
      :filters="pagination.filters"
      :rows="10"
      filter-display="row"
      :pt="{
        header: { style: 'border: none' },
        thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
        row: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
        pcPaginator: { 
          // these are needed to override the foundry button styling
          first: {
            style: 'width: auto', 
          }
        }
      }"
      @page="onTablePage($event)"
      @sort="onTableSort($event)"
      @filter="onTableFilter($event)"
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
              placeholder="Keyword Search"
            /> <!--v-model="filters['global'].value"  /> -->
          </IconField>
        </div>
      </template>
      <template #empty>
        Nothing here
      </template>
      <template #loading>
        Loading...
      </template>
        
      <Column 
        v-for="col of columns" 
        :key="col.field" 
        :field="col.field" 
        :header="col.header" 
        :body-style="col.style"
        :sortable="col.sortable"
      >
        <template
          v-if="!!col.format"
          #body="slotProps"
        >
          {{ col.format(slotProps.data[col.field as keyof typeof slotProps.data]) }}
        </template>
      </Column>
    </DataTable>
  </div>
<!-- 
  <template #top-left>
      </template>
      
      <template #body-cell-actions="cellProps">
        <q-td :auto-width="true">
          <q-icon
            class="action-icon"
            name="delete" 
            size="xs" 
            @click.stop="onDeleteItemClick(cellProps.row._id)"
          />
          <q-icon v-if="!props.globalMode && props.extraColumns.length>0"
            class="action-icon"
            name="edit" 
            size="xs" 
            @click.stop="onEditClick(cellProps.row)"
          />
        </q-td>
      </template>

      <template #top-right>
        <q-input 
          v-model="filter" 
          borderless 
          dense 
          debounce="300" 
          placeholder="Search"
        >
          <template #append>
            <q-icon name="search" />
          </template>
        </q-input>
      </template>
    </q-table> -->

  <!-- <ItemTable 
    :topic="topic"
    :global-mode="false"
    :rows="(relationshipStore.relatedItemRows[topic].rows as ItemRow[])"
    :pagination="(relationshipStore.relatedItemPagination[topic])"
    :filter="relationshipStore.relatedItemPagination[topic].filter"
    :extra-columns="extraColumns"
    @add-item-click="addDialogShow=true"
    @edit-item-click="onEditItemClick"
    @delete-item-click="onDeleteItemClick"
    @pagination-changed="onPaginationChanged"
  /> -->

  <!-- <EditRelatedItemDialog 
    v-if="extraColumns.length>0"
    v-model="editDialogShow"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :extra-field-values="editItem.extraFields"
    :topic="(topic as ValidTopic.Character | ValidTopic.Location | ValidTopic.Organization)"
    @item-edited="onItemEdited"
  />
  <AddRelatedItemDialog 
    v-model="addDialogShow"
    :topic="topic"
    @item-added="onItemAdded"
  /> -->
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, onMounted } from 'vue';
  import { clone } from 'lodash';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useRelationshipStore } from '@/applications/stores/relationshipStore';
  import { useMainStore } from '@/applications/stores';

  // library components
  import Button from 'primevue/button';
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import InputText from 'primevue/inputtext';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';

  // local components
  // import AddRelatedItemDialog from './AddRelatedItemDialog.vue';
  // import EditRelatedItemDialog from './EditRelatedItemDialog.vue';

  // types
  import { Topic, TablePagination, ValidTopic } from '@/types';
  
  type ItemRow = Record<string, any>;

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

  const { currentEntryTopic } = storeToRefs(mainStore);
  const { extraFields } = storeToRefs(relationshipStore);

  ////////////////////////////////
  // data
  const addDialogShow = ref(false);   // should we pop up the add dialog?
  const editDialogShow = ref(false);   // should we pop up the add dialog?
  const editItem = ref({
    topic: ValidTopic.Character,
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { topic: ValidTopic; itemId: string; itemName: string; extraFields: {name: string; label: string; value: string}[] });
  const pagination = ref<TablePagination>({
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 1,
    rowsPerPage: 10, 
    totalRecords: undefined, 
    filters: {},
  });


  ////////////////////////////////
  // computed data
  const newItemLabel = computed(() => {
    const prefix = 'Add ';

    const labels = {
      [ValidTopic.Event]: 'Event',
      [ValidTopic.Character]: 'Character',
      [ValidTopic.Location]: 'Location',
      [ValidTopic.Organization]: 'Organization',
    } as Record<ValidTopic, string>;

    return prefix + labels[props.topic];
  });

  const extraColumns = computed(() => {
    return extraFields.value[currentEntryTopic.value][props.topic];
  });

  const columns = computed((): any[] => {
    // they all have some standard columns
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true }; 
    const typeColumn = { field: 'type', style: 'text-align: left', header: 'Type', sortable: true }; 
    const dateColumn = { field: 'date', style: 'text-align: left', header: 'Date', format: (val: string) => (dateText(calendar.value, val)), sortable: true}; 

    const columns = {
      [ValidTopic.Event]: [
        actionColumn,
        nameColumn,
        dateColumn,
      ],
      [ValidTopic.Character]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
      [ValidTopic.Location]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
      [ValidTopic.Organization]: [
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
  const refreshQuery = async function() {
    if (!props.topic) {
      return;
    }
    
    // load the query
    await relationshipStore.refreshRelatedItems(props.topic);
  };

  ////////////////////////////////
  // event handlers
  const onAddItemClick = () => {
    debugger;
  }
  const onTablePage = async () => {
    await refreshQuery();
  }

  const onTableSort = async () => {
    await refreshQuery();
  }

  const onTableFilter = async () => {
    await refreshQuery();
  }

  const onRowClick = async function (_evt: unknown, row: { _id: string }) { 
    alert('do something when row is clicked');
    // await router.push({ name: 'ViewItem', params: { section: props.topic, itemId: row._id }});
  };

  // show the edit dialog
  const onEditItemClick = function(_id: string, name: string, fieldsToAdd: {name: string; label: string; value: string}[]) {
    editItem.value = {
      topic: props.topic,
      itemId: _id,
      itemName: name,
      extraFields: clone(fieldsToAdd),
    };
    editDialogShow.value = true;
  };

  // call mutation to remove item  from relationship
  const onDeleteItemClick = async function(_id: string) {
    // show the confirmation dialog 
    // quasar.dialog({
    //   title: props.globalMode ? 'Delete Item?': 'Remove from Relationship?',
    //   message: props.globalMode? 'Are you sure you want to delete this item?' : 'Are you sure you want to remove the relationship to this item?',
    //   cancel: true,
    //   persistent: true,
    // }).onOk(async () => {
    //   emit('deleteItemClick', _id);
    // });

    await relationshipStore.deleteRelationship(props.topic, _id); 

    // refresh the table
    await refreshQuery();
  };
  
  const onItemAdded = async function () { 
    await refreshQuery();
  };

  const onItemEdited = async function (_id: string) { 
    await refreshQuery();
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

    // refresh the table
    await refreshQuery();
  };

  const onEditClick = function (row: Record<string, string>) {
    // assemble the extra field data
    const fieldsToAdd = extraColumns.value.reduce((accum, col) => {
      accum.push({
        name: col.name,
        label:col.label,
        value: row[col.name as keyof typeof row]
      });
      return accum;
    }, [] as {name: string; label: string; value: string}[]);

    emit('editItemClick', row._id, row.name, fieldsToAdd);
  };

  ////////////////////////////////
  // watchers
  // reload when topic changes
  watch(() => [props.topic], async () => {
    await refreshQuery();
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    await refreshQuery();
  });


</script>

<style lang="scss" scoped>
  .action-icon {
    cursor: pointer;
  }
</style>
