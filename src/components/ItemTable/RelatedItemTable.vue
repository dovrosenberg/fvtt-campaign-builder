<template>
  <BaseTable
    :rows="rows"
    :columns="columns"
    :showAddButton="true"
    :extra-add-text="newItemDragLabel"
    :addButtonLabel="newItemLabel"
    :filterFields="filterFields"
    :allowEdit="true"
    :edit-item-label="localize('tooltips.editRelationship')"
    :delete-item-label="localize('tooltips.deleteRelationship')"

    @add-item="onAddItemClick"
    @delete-item="onDeleteItemClick"
    @edit-item="onEditItemClick"
    @row-select="onRowSelect"
    @drop="onDrop"
    @dragover="onDragover"
  />

  <RelatedItemDialog
    v-if="extraColumns.length > 0"
    v-model="editDialogShow"
    :topic="props.topic"
    mode="edit"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :extra-field-values="editItem.extraFields"
  />
  <RelatedItemDialog
    v-model="addDialogShow"
    :topic="props.topic"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    mode="add"
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
  import { Entry } from '@/classes';
  import { getValidatedData } from '@/utils/dragdrop';

  // library components

  // local components
  import RelatedItemDialog from './RelatedItemDialog.vue';
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  // types
  import { Topics, ValidTopic, RelatedItemDetails, } from '@/types';
  
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
    switch (props.topic) {
      case Topics.Event: return localize('labels.addTopic.event');
      case Topics.Character: return localize('labels.addTopic.character'); 
      case Topics.Location: return localize('labels.addTopic.location');
      case Topics.Organization: return localize('labels.addTopic.organization');
    }
  });

  const newItemDragLabel = computed(() => {
    switch (props.topic) {
      case Topics.Event: return localize('labels.addTopicDrag.event');
      case Topics.Character: return localize('labels.addTopicDrag.character'); 
      case Topics.Location: return localize('labels.addTopicDrag.location');
      case Topics.Organization: return localize('labels.addTopicDrag.organization');
    }
  });

  type RelatedItemGridRow = { uuid: string; name: string; type: string } & Record<string, any>;

  const rows = computed((): RelatedItemGridRow[] => 
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

  const onRowSelect = async function (event: { originalEvent: PointerEvent; data: RelatedItemGridRow} ) { 
    await navigationStore.openEntry(event.data.uuid, { newTab: event.originalEvent?.ctrlKey });
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();

    // parse the data
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format and topic matches
    if (data.topic !== props.topic || !data.childId) {
      return;
    }

    const fullEntry = await Entry.fromUuid(data.childId);

    // add the item to the relationship
    // make the extra fields blank, if there are any
    const extraFieldsToSend = extraFields[currentEntryTopic.value][props.topic].reduce((acc, field) => {
      acc[field.field] = '';
      return acc;
    }, {} as Record<string, string>);

    // open the dialog to complete
    editItem.value = {
      itemId: fullEntry?.uuid || '',
      itemName: fullEntry?.name || '',
      extraFields: extraFieldsToSend,
    };
    addDialogShow.value = true;
  }

  // show the edit dialog
  const onEditItemClick = function(row: RelatedItemGridRow) {
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
</style>
