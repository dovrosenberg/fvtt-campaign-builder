<template>
  <div>
    <q-table 
      ref="tableRef"
      v-model:pagination="localPagination"
      title="Events"
      :rows="props.rows"
      :columns="columns"
      row-key="id"
      :loading="loadingTable"
      :filter="filter"
      binary-state-sort
      @update:pagination="onPaginationChanged"
      @request="onPaginationChanged"
      @row-click="onRowClick"
    >
      <template #top-left>
        <div class="row q-gutter-sm">
          <q-btn 
            color="primary" 
            icon="o_add_circle" 
            :label="newItemLabel" 
            @click="emit('addItemClick')"
          />
          <q-btn 
            v-if="showGenerate"
            color="primary" 
            icon="psychology" 
            label="Generate" 
            @click="emit('generateItemClick')"
          />
        </div>
      </template>
      
      <template #body-cell-actions="cellProps">
        <q-td :auto-width="true">
          <q-icon
            class="action-icon"
            name="delete" 
            size="xs" 
            @click.stop="onDeleteItemClick(cellProps.row._id)"
          />
          <q-icon 
            v-if="!props.globalMode && props.extraColumns.length>0"
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
    </q-table>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { watch, ref, computed, PropType } from 'vue';
  import { QTableProps, useQuasar } from 'quasar';
  import { QTable } from 'quasar';

  // local imports

  // library components

  // local components

  // types
  import { ValidTopic, TablePagination } from '@/types';

  type ExtraColumn = { name: string; label: string };
  type ItemRow = Record<string, string>;

  ////////////////////////////////
  // props
  const props = defineProps({
    topic: { 
      type: Number as PropType<ValidTopic>, 
      required: true,
    },
    globalMode: {
      type: Boolean,
      required: false,
      default: true,
    },
    rows: {
      type: Array as PropType<ItemRow[]>,
      required: false,
      default: () => [],
    },
    pagination : {
      type: Object as PropType<TablePagination>,
      required: true,
    },
    filter: {
      type: String,
      required: true,
    },
    extraColumns: {
      type: Array as PropType<ExtraColumn[]>,
      required: false,
      default: () => [],
    },
    showGenerate: {  // should we show the generate button?
      type: Boolean,
      required: false,
      default: false,
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['deleteItemClick', 'paginationChanged', 'filterChanged', 'addItemClick', 'generateItemClick', 'editItemClick']);

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const tableRef = ref<InstanceType<typeof QTable> | null>(null);
  const loadingTable = ref(false);  // are we currently loading data?
  const quasar = useQuasar();
  const filter = ref(props.filter);
  const localPagination = ref(props.pagination);

  ////////////////////////////////
  // computed data
  const newItemLabel = computed(() => {
    const prefix = props.globalMode ? 'New ' : 'Add ';

    const labels = {
      [ValidTopic.Event]: 'Event',
      [ValidTopic.Character]: 'Character',
      [ValidTopic.Location]: 'Location',
      [ValidTopic.Organization]: 'Organization',
    } as Record<ValidTopic, string>;

    return prefix + labels[props.topic];
  });

  const columns = computed((): quasar.QTableColumn[] => {
    // they all have some standard columns
    const actionColumn = { name: 'actions', align: 'left', label: 'Actions', field: ''};
    const nameColumn = { name: 'name', align: 'left', label: 'Name', field: 'name', sortable: true }; 
    const typeColumn = { name: 'type', align: 'left', label: 'Type', field: 'type', sortable: true }; 
    const dateColumn = { name: 'date', align: 'left', label: 'Date', field: 'date', format: (val: string) => (dateText(calendar.value, val)), sortable: true}; 

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
    } as Record<ValidTopic, QTableProps['columns']>;

    if (props.extraColumns.length > 0) {
      // add the extra fields
      columns[props.topic] = (columns[props.topic] || []).concat(props.extraColumns.map((field) => ({
        name: field.name, 
        align: 'left', 
        label: field.label, 
        field: field.name, 
        sortable: true 
      })
      ));
    }

    return columns[props.topic] || [];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onRowClick = async function (_evt: unknown, row: { _id: string }) { 
    alert('do something when row is clicked');
    // await router.push({ name: 'ViewItem', params: { section: props.topic, itemId: row._id }});
  };

  // want to delete an item
  const onDeleteItemClick = async function(_id: string) {
    // show the confirmation dialog 
    quasar.dialog({
      title: props.globalMode ? 'Delete Item?': 'Remove from Relationship?',
      message: props.globalMode? 'Are you sure you want to delete this item?' : 'Are you sure you want to remove the relationship to this item?',
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      emit('deleteItemClick', _id);
    });
  };

  const onPaginationChanged = function (newPagination: TablePagination) {
    localPagination.value = {
      ...newPagination,
      rowsNumber: localPagination.value.rowsNumber
    };

    emit('paginationChanged', newPagination);
  };

  const onEditClick = function (row: Record<string, string>) {
    // assemble the extra field data
    const extraFields = props.extraColumns.reduce((accum, col) => {
      accum.push({
        name: col.name,
        label:col.label,
        value: row[col.name as keyof typeof row]
      });
      return accum;
    }, [] as {name: string; label: string; value: string}[]);

    emit('editItemClick', row._id, row.name, extraFields);
  };
  
  ////////////////////////////////
  // watchers
  // update local values when props change
  watch(() => props.filter, (newFilter) => {
    filter.value = newFilter;
  });
  
  watch(() => props.pagination, (newPagination) => {
    localPagination.value = newPagination;
  }, { deep: true });

  // pass up changes to filter
  watch(() => filter, (newFilter) => {
    emit('filterChanged', newFilter);
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
  .action-icon {
    cursor: pointer;
  }
</style>
