<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      :title="dialogTitle"
      :buttons="dialogButtons"
      @cancel="onCancel"
    >
      <div class="add-related-items-content flexcol">
        <div v-if="selectItems.length > 0">
          <TypeAhead 
            v-if="isEitherAddMode"
            ref="nameSelectRef"
            :initial-value="props.itemId || ''"
            :initial-list="selectItems" 
            :allow-new-items="false"
            @selection-made="onSelectionMade"
          />
          <div class="extra-fields-container" v-if="extraFields.length > 0">
            <h3 class="extra-fields-title">Additional Information</h3>
            <div class="extra-fields-group">
              <div
                v-for="field in extraFields"
                :key="field.field"
                class="field-wrapper"
              >
                <h6>
                  {{ field.header }}
                  <!-- <i class="fas fa-info-circle tooltip-icon" data-tooltip="If you create a new type, it will be added to the master list"></i> -->
                </h6>
                <InputText
                  :id="field.field"
                  v-model="extraFieldValuesObj[field.field]"
                  type="text"
                  class="field-input"
                  :pt="{ root: { style: { 'font-size': 'var(--font-size-14)' }}}"      
                />
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-items-message">
          <i class="fas fa-info-circle"></i>
          <span>All possible related items are already connected.</span>
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, nextTick } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useRelationshipStore, useSessionStore } from '@/applications/stores';
  import { FCBDialog } from '@/dialogs';

  // library components
  import InputText from 'primevue/inputtext';
  import TypeAhead from '@/components/TypeAhead.vue';
  
  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  import { Topics, ValidTopic, RelatedItemDialogModes } from '@/types';
  import { Entry, TopicFolder } from '@/classes';

  type ExtraFieldValue = {
    field: string;
    header: string;
    value: string;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    topic: { // this is the type of the item that we're adding/editing
      type: Number as PropType<ValidTopic>, 
      required: true,
    },
    mode: {
      type: String as PropType<RelatedItemDialogModes>,
      default: RelatedItemDialogModes.Add,
    },
    itemId: { 
      type: String as PropType<string>, 
      required: false,
      default: '',
    },
    itemName: { 
      type: String as PropType<string>, 
      required: false,
      default: '',
    },
    // Edit mode props
    extraFieldValues: { 
      type: Array as PropType<ExtraFieldValue[]>, 
      required: false,
      default: [],
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['update:modelValue']);

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const mainStore = useMainStore();
  const sessionStore = useSessionStore();
  const { currentEntry, currentWorld, currentEntryTopic, currentSession } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const entryToAdd = ref<string | null>(null);  // the selected item from the dropdown (uuid)
  const extraFieldValuesObj = ref<Record<string, string>>({});
  const selectItems = ref<{id: string; label: string}[]>([]);
  const extraFields = ref<{field:string; header:string}[]>([]);
  const nameSelectRef = ref<typeof TypeAhead | null>(null);

  const topicDetails = {
    [Topics.Character]: {
      title: 'Add a character',
      editTitle: 'Edit character',
      createButtonTitle: 'Create character',
      buttonTitle: 'Add relationship',
      editButtonTitle: 'Save character',
    },
    [Topics.Location]: {
      title: 'Add a location',
      editTitle: 'Edit location',
      createButtonTitle: 'Create location',
      buttonTitle: 'Add relationship',
      editButtonTitle: 'Save location',
    },
    [Topics.Organization]: {
      title: 'Add an organization',
      editTitle: 'Edit organization',
      createButtonTitle: 'Create organization',
      buttonTitle: 'Add relationship',
      editButtonTitle: 'Save organization',
    },
  } as Record<ValidTopic, { 
    title: string; 
    editTitle: string; 
    buttonTitle: string; 
    createButtonTitle: string;
    editButtonTitle: string 
  }>;

  ////////////////////////////////
  // computed data
  const dialogTitle = computed(() => {
    if (props.mode === RelatedItemDialogModes.Edit) {
      return `${topicDetails[props.topic].editTitle}: ${props.itemName}`;
    } else {
      return topicDetails[props.topic].title;
    }
  });

  const actionButtonLabel = computed(() => {
    switch (props.mode) {
      case RelatedItemDialogModes.Add:
        return topicDetails[props.topic].buttonTitle;
      case RelatedItemDialogModes.Session:
        return 'Add to session';
      case RelatedItemDialogModes.Edit:
        return topicDetails[props.topic].editButtonTitle;
    }
  });

  // add mode or session mode
  const isEitherAddMode  = computed(()=> ([RelatedItemDialogModes.Session, RelatedItemDialogModes.Add].includes(props.mode))); 

  const createButtonLabel = computed(() => {
    return topicDetails[props.topic].createButtonTitle;
  });

  const isAddFormValid = computed((): boolean => {
    return !!entryToAdd.value;
  });

  const dialogButtons = computed((): ButtonProp[] => {
    const buttons = [] as ButtonProp[];

    buttons.push({
      label: 'Cancel',
      default: false,
      close: true,
      callback: () => { show.value=false;}
    });

    if (isEitherAddMode.value) {
      buttons.push({
        label: createButtonLabel,
        default: false,
        close: true,
        callback: onCreateClick,
        icon: 'fa-plus'
      });
    }

    buttons.push({
      label: actionButtonLabel,
      disable: isEitherAddMode.value && !isAddFormValid,
      default: true,
      close: true,
      callback: onActionClick,
      icon: 'fa-save'
    });

    return buttons;
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    entryToAdd.value = null;
    extraFieldValuesObj.value = {};
    show.value = false;
    emit('update:modelValue', false);
  };

  const mapEntryToOption = function(entry: Entry) {
    return {
      id: entry.uuid,
      label: entry.type ? `${entry.name} (${entry.type})` : entry.name,
    };
  };

  ////////////////////////////////
  // event handlers
  const onSelectionMade = function(uuid: string) {
    entryToAdd.value = uuid || null;
  };

  const onActionClick = async function() {
    // replace nulls with empty strings
    const extraFieldsToSend = extraFields.value.reduce((acc, field) => {
      acc[field.field] = extraFieldValuesObj.value[field.field] || '';
      return acc;
    }, {} as Record<string, string>);

    switch (props.mode) {
      case RelatedItemDialogModes.Add:
        if (entryToAdd.value) {
          const fullEntry = await Entry.fromUuid(entryToAdd.value);

          if (fullEntry) {
            await relationshipStore.addRelationship(fullEntry, extraFieldsToSend);
          }
        };
        break;
      
      case RelatedItemDialogModes.Session:
        if (entryToAdd.value) {
          const fullEntry = await Entry.fromUuid(entryToAdd.value);

          if (fullEntry) {
            // Handle session-specific relationships
            if (props.topic === Topics.Character) {
              await sessionStore.addNPC(entryToAdd.value);
            } else if (props.topic === Topics.Location) {
              await sessionStore.addLocation(entryToAdd.value);
            } else {
              throw new Error('Trying to add invalid topic to session in RelatedItemDialog.onActionClick');
            }
          }
        };
        break;
      case RelatedItemDialogModes.Edit:
        await relationshipStore.editRelationship(props.itemId, extraFieldsToSend);
        break;
    }

    resetDialog();
  };
  
  const onCreateClick = async function() {
    // the simplest way to do this is do the create box first and then just pretend like we added it
    const newEntry = await FCBDialog.createEntryDialog(props.topic);

    if (newEntry) {
      entryToAdd.value = newEntry.uuid;
      await onActionClick();
    }

    resetDialog();
  }

  const onCancel = function() {
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the dialog changes state, alert parent (so v-model works)
  watch(() => show, async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal value
  watch(() => props.modelValue, async (newValue) => {
    show.value = newValue; 

    if (newValue) {
      if (!currentWorld.value)
        return;

      if (!currentSession.value && !(currentEntry.value && currentEntryTopic.value))
        throw new Error('Trying to show RelatedItemDialog without a current entry/session');
      
        selectItems.value = (await Entry.getEntriesForTopic(currentWorld.value.topicFolders[props.topic] as TopicFolder, currentEntry.value || undefined)).map(mapEntryToOption);
      
      if (isEitherAddMode.value) {

        extraFields.value = currentSession.value ? [] : relationshipStore.extraFields[currentEntryTopic.value][props.topic];
        extraFieldValuesObj.value = {};
        if (props.itemId)
          entryToAdd.value = props.itemId;  // assign starting value, if any

        // focus on the input
        await nextTick();
        // @ts-ignore - not sure why $el isn't found
        nameSelectRef.value?.$el?.querySelector('input')?.focus();
      } else {
        // Edit mode initialization
        extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];

        // map the prop to the obj
        extraFieldValuesObj.value = props.extraFieldValues.reduce((acc, extraFieldValue)=> ({
          ...acc,
          [extraFieldValue.field]: extraFieldValue.value
        }), {} as Record<string, string>);
      }
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
.add-related-items-content {
  gap: 1.5rem;
  width: 100%;
  padding: 0.5rem 0;

  h6 {
    margin-bottom: 2px;
    margin-top: 8px;
    display: flex;
    align-items: center;

    .tooltip-icon {
      margin-left: 5px;
      font-size: 12px;
      color: #888;
      cursor: help;

      &:hover {
        color: #555;
      }
    }
  }

  .extra-fields-container {
    width: 100%;
    margin-top: 20px;

    .extra-fields-title {
      font-size: var(--font-size-16);
      font-weight: 600;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 0.25rem;
      width: 80%;
    }
  }
}

.no-items-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  color: var(--color-text-dark-secondary);
  font-style: italic;
  gap: 0.75rem;

  i {
    font-size: 1.25rem;
    color: var(--color-text-dark-tertiary);
  }
}
</style>