<template>
  <Dialog
    v-model="show"
    :title="dialogTitle"
    :buttons="[
      {
        label: 'Cancel',
        default: false,
        close: true,
        callback: () => { show=false;}
      },
      {
        label: actionButtonLabel,
        disable: isAddMode && !isAddFormValid,
        default: true,
        close: true,
        callback: onActionClick,
        icon: isAddMode ? 'fa-plus' : 'fa-save'
      }
    ]"
    @cancel="onCancel"
  >
    <!-- Add Mode Content -->
    <div
      v-if="isAddMode"
      class="add-related-items-content flexcol"
    >
      <div v-if="selectItems.length > 0">
        <TypeAhead 
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
                v-model="extraFieldValues[field.field]"
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

    <!-- Edit Mode Content -->
    <div
      v-else
      class="add-related-items-content"
    >
      <div v-if="extraFieldValuesArray.length > 0">
        <div class="extra-fields-container">
          <h3 class="extra-fields-title">Additional Information</h3>
          <div class="extra-fields-grid">
            <div
              v-for="(field, index) in extraFieldValuesArray"
              :key="field.field"
              class="field-wrapper"
            >
              <h6>{{ field.header }}</h6>
              <InputText
                :id="field.field"
                v-model="extraFieldValuesArray[index].value"
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
        <span>No additional fields to edit for this relationship.</span>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, nextTick } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useRelationshipStore } from '@/applications/stores';

  // library components
  import InputText from 'primevue/inputtext';
  import TypeAhead from '@/components/TypeAhead.vue';
  
  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  import { Topics, ValidTopic } from '@/types';
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
      type: String as PropType<'add' | 'edit'>,
      default: 'add',
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
      default: () => ([]),
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['update:modelValue']);

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const mainStore = useMainStore();
  const { currentEntry, currentWorld, currentEntryTopic } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const entryToAdd = ref<string | null>(null);  // the selected item from the dropdown (uuid)
  const extraFieldValuesObj = ref<Record<string, string>>({});
  const extraFieldValuesArray = ref<ExtraFieldValue[]>([]);
  const selectItems = ref<{id: string; label: string}[]>([]);
  const extraFields = ref<{field:string; header:string}[]>([]);
  const nameSelectRef = ref<typeof TypeAhead | null>(null);

  const topicDetails = {
    [Topics.Event]: {
      title: 'Add an event',
      editTitle: 'Edit event',
      buttonTitle: 'Add event',
      editButtonTitle: 'Save event',
    },
    [Topics.Character]: {
      title: 'Add a character',
      editTitle: 'Edit character',
      buttonTitle: 'Add character',
      editButtonTitle: 'Save character',
    },
    [Topics.Location]: {
      title: 'Add a location',
      editTitle: 'Edit location',
      buttonTitle: 'Add location',
      editButtonTitle: 'Save location',
    },
    [Topics.Organization]: {
      title: 'Add an organization',
      editTitle: 'Edit organization',
      buttonTitle: 'Add organization',
      editButtonTitle: 'Save organization',
    },
  } as Record<ValidTopic, { title: string; editTitle: string; buttonTitle: string; editButtonTitle: string }>;

  ////////////////////////////////
  // computed data
  const isAddMode = computed(() => props.mode === 'add');

  const dialogTitle = computed(() => {
    if (isAddMode.value) {
      return topicDetails[props.topic].title;
    } else {
      return `${topicDetails[props.topic].editTitle}: ${props.itemName}`;
    }
  });

  const actionButtonLabel = computed(() => {
    if (isAddMode.value) {
      return topicDetails[props.topic].buttonTitle;
    } else {
      return topicDetails[props.topic].editButtonTitle;
    }
  });

  const isAddFormValid = computed((): boolean => {
    return !!entryToAdd.value;
  });

  const extraFieldValues = computed(() => {
    return extraFieldValuesObj.value;
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    entryToAdd.value = null;
    extraFieldValuesObj.value = {};
    extraFieldValuesArray.value = [];
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

    if (isAddMode.value) {
      if (entryToAdd.value) {
        const fullEntry = await Entry.fromUuid(entryToAdd.value);
        if (fullEntry)
          await relationshipStore.addRelationship(fullEntry, extraFieldsToSend);
      }
    } else {
      await relationshipStore.editRelationship(props.itemId, extraFieldsToSend);
    }

    resetDialog();
  };
  
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
      if (isAddMode.value) {
        // Add mode initialization
        if (!currentWorld.value)
          return;

        if (!currentEntry.value || !currentEntryTopic.value)
          throw new Error('Trying to show RelatedItemDialog without a current entry');

        selectItems.value = (await Entry.getEntriesForTopic(currentWorld.value.topicFolders[props.topic] as TopicFolder, currentEntry.value)).map(mapEntryToOption);
        extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];
        extraFieldValuesObj.value = {};
        if (props.itemId)
          entryToAdd.value = props.itemId;  // assign starting value, if any

        // focus on the input
        await nextTick();
        // @ts-ignore - not sure why $el isn't found
        nameSelectRef.value?.$el?.querySelector('input')?.focus();
      } else {
        // Edit mode initialization
        extraFieldValuesArray.value = foundry.utils.deepClone(props.extraFieldValues);
      }
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
.add-related-items-content {
  display: flex;
  flex-direction: column;
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
      border-bottom: 1px solid var(--color-underline-header, rgba(255, 255, 255, 0.1));
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
  background-color: var(--color-bg-notice, rgba(0, 0, 0, 0.05));
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