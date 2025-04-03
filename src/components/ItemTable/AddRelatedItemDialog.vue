<template>
  <Dialog
    v-model="show"
    :title="topicDetails[props.topic].title"
    :buttons="[
      {
        label: 'Cancel',
        default: false,
        close: true,
        callback: () => { show=false;}
      },
      {
        label: topicDetails[props.topic].buttonTitle,
        disable: !isAddFormValid,
        default: true,
        close: true,
        callback: onAddClick,
        icon: 'fa-plus'
      }
    ]"
    @close="onClose"
  >
    <div
      v-if="selectItems.length>0"
      class="add-related-items-content flexcol"
    >
      <TypeAhead 
        ref="nameSelectRef"
        :initial-value="''"
        :initial-list="selectItems" 
        :allow-new-items="false"
        @selection-made="onSelectionMade"
      />
      <div class="extra-fields-container" v-if="extraFields.length > 0">
        <h3 class="extra-fields-title">Additional Information</h3>
        <div class="extra-fields-grid">
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
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, nextTick, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useRelationshipStore, } from '@/applications/stores';

  // library components
  import InputText from 'primevue/inputtext';
  import TypeAhead from '@/components/TypeAhead.vue';
  
  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  import { Topics, ValidTopic, } from '@/types';
  import { Entry, TopicFolder } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    topic: { // this is the type of the item that we're adding
      type: Number as PropType<ValidTopic>, 
      required: true,
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
  const extraFieldValues = ref<Record<string, string>>({});
  const topicDetails = {
    [Topics.Event]: {
      title: 'Add an event',
      buttonTitle: 'Add event',
    },
    [Topics.Character]: {
      title: 'Add a character',
      buttonTitle: 'Add character',
    },
    [Topics.Location]: {
      title: 'Add a location',
      buttonTitle: 'Add location',
    },
    [Topics.Organization]: {
      title: 'Add an organization',
      buttonTitle: 'Add organization',
    },
  } as Record<ValidTopic, { title: string; buttonTitle: string }>;
  const selectItems = ref<{id: string; label: string}[]>([]);
  const extraFields = ref<{field:string; header:string}[]>([]);
  const nameSelectRef = ref<typeof TypeAhead | null>(null);

  ////////////////////////////////
  // computed data
  const isAddFormValid = computed((): boolean => {
    return (!!entryToAdd.value);
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    entryToAdd.value = null;
    extraFieldValues.value = {};
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

  const onAddClick = async function() {
    if (entryToAdd.value) {
      // replace nulls with empty strings
      const extraFieldsToSend = extraFields.value.reduce((acc, field) => {
        acc[field.field] = extraFieldValues.value[field.field] || '';
        return acc;
      }, {} as Record<string, string>);

      const fullEntry = await Entry.fromUuid(entryToAdd.value);
      if (fullEntry)
        await relationshipStore.addRelationship(fullEntry, extraFieldsToSend);
    }

    resetDialog();
  };
  
  const onClose = function() {
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the addDialog changes state, alert parent (so v-model works)
  watch(() => show, async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal value
  watch(() => props.modelValue, async (newValue) => {
    show.value = newValue; 

    if (!currentWorld.value)
      return;

    if (newValue) {
      if (!currentEntry.value || !currentEntryTopic.value)
        throw new Error('Trying to show AddRelatedItemDialog without a current entry');

      selectItems.value = (await Entry.getEntriesForTopic(currentWorld.value.topicFolders[props.topic] as TopicFolder, currentEntry.value)).map(mapEntryToOption);
      extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];

      // focus on the input
      await nextTick();
      // @ts-ignore - not sure why $el isn't found
      nameSelectRef.value?.$el?.querySelector('input')?.focus();
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

    .extra-fields-title {
      font-size: var(--font-size-16);
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: var(--color-text-dark-highlight);
      border-bottom: 1px solid var(--color-border-light, rgba(255, 255, 255, 0.1));
      padding-bottom: 0.5rem;
      width: 80%;
    }

    .extra-fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
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
