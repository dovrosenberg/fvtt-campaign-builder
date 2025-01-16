<template>
  <BaseTable
    :rows="rows"
    :columns="columns"
    :showAddButton="true"
    :addButtonLabel="newItemLabel"
    :filterFields="filterFields"
    :allowEdit="true"
    :edit-item-label="localize('tooltips.editRelationship')"
    :delete-item-label="localize('tooltips.deleteRelationship')"

    @add-item="onAddItemClick"
    @delete-item="onDeleteItemClick"
    @edit-item="onEditItemClick"
    @row-select="onRowSelect"
  />

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

  // local imports
  import { useMainStore, useNavigationStore, useRelationshipStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components

  // local components
  import AddRelatedItemDialog from './AddRelatedItemDialog.vue';
  import EditRelatedItemDialog from './EditRelatedItemDialog.vue';
  import BaseTable from '@/components/BaseTable/BaseTable.vue';
  // types
  import { Topics, ValidTopic, RelatedItemDetails } from '@/types';
  
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
    
  const editItem = ref({
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { itemId: string; itemName: string; extraFields: {field: string; header: string; value: string}[] });
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
      [Topics.Event]: 'Event',
      [Topics.Character]: 'Character',
      [Topics.Location]: 'Location',
      [Topics.Organization]: 'Organization',
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
      [Topics.Event]: [
        actionColumn,
        nameColumn,
        dateColumn,
      ],
      [Topics.Character]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
      [Topics.Location]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
      [Topics.Organization]: [
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

  const onRowSelect = async function (event: { originalEvent: PointerEvent; data: GridRow} ) { 
    await navigationStore.openEntry(event.data.uuid, { newTab: event.originalEvent?.ctrlKey });
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
      title: localize('dialogs.confirmDeleteRelationship.title'),
      content: localize('dialogs.confirmDeleteRelationship.message'),
      yes: () => { void relationshipStore.deleteRelationship(props.topic, _id); },
      no: () => {},
    });
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
