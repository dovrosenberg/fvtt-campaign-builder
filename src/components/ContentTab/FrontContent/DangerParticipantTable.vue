
<!-- This is different from related items because it allows characters, locations, orgs all at once-->
 <template> 
  <BaseTable
    ref="baseTableRef"
    :rows="rows"
    :columns="columns"
    :show-add-button="true"
    :extra-add-text="localize('labels.addParticipantDrag')"
    :add-button-label="localize('labels.addParticipant')"
    :filter-fields="filterFields"
    :actions="actions"

    @add-item="onAddItemClick"
    @drop-new="onDropNew"
    @dragover="onDragover"
    @cell-edit-complete="onCellEditComplete"
  />

  <!-- <RelatedItemDialog
    v-model="editDialogShow"
    :topic="props.topic"
    :mode="RelatedItemDialogModes.Edit"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :extra-field-values="editItem.extraFields"
  />
  <RelatedItemDialog
    v-model="addDialogShow"
    :topic="props.topic"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :mode="RelatedItemDialogModes.Add"
  /> -->
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType } from 'vue';

  // local imports
  import { useNavigationStore, useRelationshipStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { Entry } from '@/classes';
  import { getValidatedData } from '@/utils/dragdrop';
  import { FCBDialog } from '@/dialogs';

  // library components

  // local components
  import RelatedItemDialog from './RelatedItemDialog.vue';
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { RelatedItemDialogModes, EntryNodeDragData, Topics, } from '@/types';
  
  interface ParticipantGridRow { 
    uuid: string; 
    name: string; 
    type: string;
    role: string;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    participantRows: { 
      type: Array as PropType<ParticipantGridRow[]>, 
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const navigationStore = useNavigationStore();

  ////////////////////////////////
  // data
  const addDialogShow = ref(false);   // should we pop up the add dialog?
  const editDialogShow = ref(false);   // should we pop up the edit dialog?
  const baseTableRef = ref<typeof BaseTable | null>(null);

  const editItem = ref({
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { itemId: string; itemName: string; extraFields: {field: string; header: string; value: string}[] });

  const extraFields = [{field:'role', header:'Role'}];
 
  ////////////////////////////////
  // computed data
  const filterFields = computed(() => (['name', 'type', 'role']));

  const rows = computed((): ParticipantGridRow[] => props.participantRows);

  const columns = computed((): any[] => {
    // they all have some standard columns
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick }; 
    const typeColumn = { field: 'type', style: 'text-align: left', header: 'Type', sortable: true }; 
    const roleColumn  ={ field: 'role', style: 'text-align: left', header: 'Role', sortable: true, editable: true, smallEditBox: true };

    return [
      actionColumn,
      nameColumn,
      typeColumn,
      roleColumn,
    ];
  });

  const actions = computed(() => [
    { icon: 'fa-trash', callback: (data) => onDeleteItemClick(data.uuid), tooltip: localize('tooltips.deleteParticipant') },
    { icon: 'fa-pen', isEdit: true, callback: () => {}, tooltip: localize('tooltips.editParticipant') }
  ]);

  ////////////////////////////////
  // methods
  // when we click on a name, open the entry
  async function onNameClick (event: MouseEvent, uuid: string) {
    navigationStore.openEntry(uuid, { newTab: event.ctrlKey, activate: true });
  }

  ////////////////////////////////
  // event handlers
  const onAddItemClick = () => {
    addDialogShow.value = true;
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();

    // parse the data
    let data = getValidatedData(event) as unknown as EntryNodeDragData;
    if (!data || data.type !== 'fcb-entry')
      return;

    // make sure it's the right format and topic matches
    if (![Topics.Character, Topics.Location, Topics.Organization].includes(data.topic) || !data.childId) {
      return;
    }

    const fullEntry = await Entry.fromUuid(data.childId);
    if (!fullEntry) {
      return;
    }

    // Has extra fields, show dialog to collect them
    const extraFieldsToSend = [{ 
      field: 'role', 
      header: 'Role', 
      value: '' 
    }];

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
      localize('dialogs.confirmDeleteParticipant.title'),
      localize('dialogs.confirmDeleteParticipant.message')
    );
    
    if (confirmed) {
      throw new Error('TODO: implement delete participant')
      // void relationshipStore.deleteRelationship(props.topic, _id);
    }
  };

  const onCellEditComplete = async (event: { data: { uuid: string }; field: string; newValue: any; /* other PrimeVue event fields */ }) => {
    const uuid = event.data.uuid;
    const fieldChanged = event.field;
    const newFieldValue = event.newValue;

    const currentFullRow = props.participantRows.find(r => r.uuid === uuid);
    if (!currentFullRow) {
      throw new Error('Cannot find row in DangerParticipantTable.onCellEditComplete: ' + uuid);
    }

    const relevantExtraFieldDefs = extraFields;

    const extraFieldsToSave: Record<string, string> = { ...currentFullRow.extraFields }; // Start with existing extra fields

    // Update the changed field
    extraFieldsToSave[fieldChanged] = newFieldValue;
    
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
