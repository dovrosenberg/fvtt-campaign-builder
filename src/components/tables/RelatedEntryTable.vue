<template>
  <BaseTable
    ref="baseTableRef"
    :rows="rows"
    :columns="columns"
    :show-add-button="true"
    :can-reorder="false"
    :extra-add-text="newItemDragLabel"
    :addButtonLabel="newItemLabel"
    :filterFields="filterFields"
    :actions="actions"
    :table-test-id="`${topicTabName}-table`"

    @add-item="onAddItemClick"
    @drop-new="onDropNew"
    @dragover="DragDropService.standardDragover"
    @dragstart="onDragstart"
    @cell-edit-complete="onCellEditComplete"
  />

  <RelatedEntryDialog
    v-if="extraColumns.length > 0"
    v-model="editDialogShow"
    :topic="props.topic"
    :mode="RelatedEntryDialogModes.Edit"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
  />
  <RelatedEntryDialog
    v-model="addDialogShow"
    :topic="props.topic"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :mode="RelatedEntryDialogModes.Add"
  />
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, inject } from 'vue';

  // local imports
  import { useNavigationStore, useRelationshipStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { ENTRY_DERIVED_STATE_KEY } from '@/composables/useEntryDerivedState';
  import { localize } from '@/utils/game';
  import { Entry } from '@/classes';
  import DragDropService from '@/utils/dragDrop';
  import { FCBDialog } from '@/dialogs';
  import { getTopicTextPlural } from '@/compendia';


  // library components

  // local components
  import RelatedEntryDialog from '@/components/dialogs/RelatedEntryDialog.vue';
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { BaseTableColumn,Topics, ValidTopic, RelatedEntryDetails, RelatedEntryDialogModes, EntryNodeDragData, ValidTopicRecord, ActionButtonDefinition, CellEditCompleteEvent } from '@/types';
  
  interface RelatedEntryGridRow extends Record<string, any> { 
    uuid: string; 
    name: string; 
    type: string;
    draggableId?: string;
    dragTooltip?: string;
  };

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
  const navigationStore = useNavigationStore();
  const { currentEntryTopic } = useContentState();
  const { relatedEntryRows } = inject(ENTRY_DERIVED_STATE_KEY)!;
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

  const actions = computed(() => {
    const actions: ActionButtonDefinition[] = [{ icon: 'fa-trash', callback: (data) => onDeleteItemClick(data.uuid), tooltip: localize('tooltips.deleteRelationship') }];

    if (extraColumns.value.length > 0)
      actions.push({ icon: 'fa-pen', isEdit: true, callback: async () => {}, tooltip: localize('tooltips.editRelationship') });

    return actions;
  });

  const newItemLabel = computed(() => {
    switch (props.topic) {
      case Topics.Character: return localize('labels.addTopic.character'); 
      case Topics.Location: return localize('labels.addTopic.location');
      case Topics.Organization: return localize('labels.addTopic.organization');
      case Topics.PC: return localize('labels.addTopic.pc');
    }
  });

  const topicTabName = computed(() => {
    return getTopicTextPlural(props.topic).toLowerCase();;
  });

  const newItemDragLabel = computed(() => {
    switch (props.topic) {
      case Topics.Character: return localize('labels.addTopicDrag.character'); 
      case Topics.Location: return localize('labels.addTopicDrag.location');
      case Topics.Organization: return localize('labels.addTopicDrag.organization');
      case Topics.PC: return localize('labels.addTopicDrag.pc');
    }
  });

  const rows = computed((): RelatedEntryGridRow[] => 
    relatedEntryRows.value.map((item: RelatedEntryDetails<any, any>) => {
      const base = { 
        uuid: item.uuid, 
        name: item.name, 
        type: item.type,
        draggableId: item.draggableId,
        dragTooltip: item.dragTooltip,
      };

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

  const columns = computed((): BaseTableColumn[] => {
    // they all have some standard columns
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const dragColumn = { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick }; 
    const typeColumn = { field: 'type', style: 'text-align: left', header: 'Type', sortable: true }; 
    // const dateColumn = { field: 'date', style: 'text-align: left', header: 'Date', format: (val: string) => (/*dateText(calendar.value, val)*/ val), sortable: true}; 

    const columns = {
      [Topics.Character]: [
        actionColumn,
        dragColumn,
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
      [Topics.PC]: [
        actionColumn,
        nameColumn,
        typeColumn,
      ],
    } as ValidTopicRecord<BaseTableColumn[]>;

    if (extraColumns.value.length > 0) {
      // add the extra fields
      columns[props.topic] = (columns[props.topic] || []).concat(extraColumns.value.map((field) => ({
        field: field.field, 
        style: 'text-align:left',
        header: field.header, 
        sortable: true,
        editable: true, // Make extra field columns editable
        smallEditBox: true, // Assuming extra fields are suitable for InputText
      })
      ));
    }

    return columns[props.topic] || [];
  });

  ////////////////////////////////
  // methods
  // when we click on a name, open the entry
  async function onNameClick (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) {
    navigationStore.openEntry(rowData.uuid, { newTab: event.ctrlKey, activate: true, panelIndex: event.altKey ? -1 : undefined });
  }

  ////////////////////////////////
  // event handlers
  const onDragstart = async (event: DragEvent, draggableId: string) => {
    // related entries only have actors as draggables
    await DragDropService.actorDragStart(event, draggableId);
  };

  const onAddItemClick = () => {
    addDialogShow.value = true;
  };

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();

    // parse the data - looking for entry
    let data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== DragDropService.FCBDragTypes.Entry)
      return;

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;

    // make sure it's the right format and topic matches
    if (!fcbData || fcbData.topic !== props.topic || !fcbData.childId) {
      return;
    }

    const fullEntry = await Entry.fromUuid(fcbData.childId);
    if (!fullEntry) {
      return;
    }

    // Check if there are any extra fields required for this relationship
    const requiredExtraFields = extraFields[currentEntryTopic.value][props.topic];
    
    if (!requiredExtraFields || requiredExtraFields.length === 0) {
      // No extra fields needed, add relationship directly
      await relationshipStore.addRelationship(fullEntry, {});
      return;
    }

    // Has extra fields, show dialog to collect them
    const extraFieldsToSend = requiredExtraFields.reduce((acc, field) => {
      acc[field.field] = '';
      return acc;
    }, {} as Record<string, string>);

    // open the dialog to complete
    editItem.value = {
      itemId: fullEntry.uuid,
      itemName: fullEntry.name,
      extraFields: extraFieldsToSend,
    };
    addDialogShow.value = true;
  }


  // call mutation to remove item  from relationship
  const onDeleteItemClick = async function(_id: string) {
    // show the confirmation dialog 
    const confirmed = await FCBDialog.confirmDialog(
      localize('dialogs.confirmDeleteRelationship.title'),
      localize('dialogs.confirmDeleteRelationship.message')
    );
    
    if (confirmed) {
      void relationshipStore.deleteRelationship(_id);
    }
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, field, newValue } = event;
    const uuid = data.uuid as string;

    const currentFullRow = relatedEntryRows.value.find(r => r.uuid === uuid);
    if (!currentFullRow) {
      throw new Error('Cannot find row in RelatedEntryTable.onCellEditComplete:' + uuid);
    }

    const relevantExtraFieldDefs = extraFields[currentEntryTopic.value]?.[props.topic] || [];
    if (!relevantExtraFieldDefs.length) {
      throw new Error('Call to RelatedEntryTable.onCellEditComplete without an extra field:' + uuid);
    }

    const extraFieldsToSave: Record<string, string> = { ...currentFullRow.extraFields }; // Start with existing extra fields

    // Update the changed field
    extraFieldsToSave[field] = newValue as string;
    
    // Ensure all defined extra fields are present, defaulting to empty string if not set
    relevantExtraFieldDefs.forEach(def => {
      if (!(def.field in extraFieldsToSave)) {
        extraFieldsToSave[def.field] = ''; 
      }
    });

    await relationshipStore.editRelationship(uuid, extraFieldsToSave);
  };

  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
