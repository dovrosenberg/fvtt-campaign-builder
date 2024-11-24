<template>
  <div v-if="loading">
    <ProgressSpinner v-show="loading" />
  </div>
  <div v-else>
    <Dialog 
      v-model:visible="show" 
      style="min-width: 350px;"
      dismissable-mask
      block-scroll
      @hide="onClose"
    >
      <template #header>
        <div class="text-h6">
          {{ topicDetails[props.topic].title }}
        </div>
      </template>

      <div 
        v-if="selectItems.length>0"
        class="flexcol"
      >
        <AutoComplete 
          ref="nameSelectRef"
          v-model="entry"
          :dropdown="true"
          :typeahead="true"
          :force-selection="true"
          :suggestions="options"
          :placeholder="topicDetails[props.topic].title"
          option-label="name"
          data-key="uuid"
          variant="outlined"
          show-clear
          @complete="onSearch"
          @keydown.enter.stop="onAddClick"
        />
        <InputGroup 
          v-for="field in extraFields"
          :key="field.field"
        >
          <FloatLabel>
            <InputText 
              :id="field.field"
              v-model="extraFieldValues[field.field]"
              variant="outlined"
            />
            <label :for="field.field">{{ field.header }}</label>
          </FloatLabel>
        </InputGroup>
      </div>
      <div v-else>
        All possible related items are already connected.
      </div>
      <template #footer>
        <Button 
          label="Cancel"
          text
          severity="secondary"
          autofocus
          @click="show=false;"
        />
        <Button
          :label="topicDetails[props.topic].buttonTitle" 
          :disable="!isAddFormValid"
          text
          severity="secondary"
          autofocus
          @click="onAddClick"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, nextTick, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useRelationshipStore, useEntryStore, } from '@/applications/stores';

  // library components
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button';
  import ProgressSpinner from 'primevue/progressspinner';
  import AutoComplete from 'primevue/autocomplete';
  import InputText from 'primevue/inputtext';
  import InputGroup from 'primevue/inputgroup';
  import FloatLabel from 'primevue/floatlabel';

  // local components

  // types
  import { Topic, ValidTopic, } from '@/types';
  import { Entry } from '@/documents';

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
  const entryStore = useEntryStore();
  const mainStore = useMainStore();
  const { currentEntry, currentEntryTopic } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const loading = ref(false);
  const show = ref(props.modelValue);
  const entry = ref<Entry | null>(null);  // the selected item from the dropdown
  const extraFieldValues = ref<Record<string, string>>({});
  const topicDetails = {
    [Topic.Event]: {
      title: 'Add an event',
      buttonTitle: 'Add event',
    },
    [Topic.Character]: {
      title: 'Add a character',
      buttonTitle: 'Add character',
    },
    [Topic.Location]: {
      title: 'Add a location',
      buttonTitle: 'Add location',
    },
    [Topic.Organization]: {
      title: 'Add an organization',
      buttonTitle: 'Add organization',
    },
  } as Record<ValidTopic, { title: string; buttonTitle: string }>;
  const selectItems = ref<Entry[]>([]);
  const options = ref<Entry[]>([]);
  const extraFields = ref<{field:string; header:string}[]>([]);
  const nameSelectRef = ref<typeof AutoComplete | null>(null);

  ////////////////////////////////
  // computed data
  const isAddFormValid = computed((): boolean => {
    return (!!entry.value);
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    entry.value = null;
    extraFieldValues.value = {};
    show.value = false;
    emit('update:modelValue', false);
  };

  ////////////////////////////////
  // event handlers
  const onSearch = (event: {query: string}) => {
    const { query } = event;

    if (query === '') {
      options.value = selectItems.value;
    }
    else {
      const needle = query.toLowerCase();
      options.value = selectItems.value.filter((item) => (item.name.toLowerCase().indexOf(needle) > -1));
    }
  };

  const onAddClick = async function() {
    loading.value = true;

    if (entry.value) {
      // replace nulls with empty strings
      const extraFieldsToSend = extraFields.value.reduce((acc, field) => {
        acc[field.field] = extraFieldValues.value[field.field] || '';
        return acc;
      }, {} as Record<string, string>);

      await relationshipStore.addRelationship(entry.value, extraFieldsToSend);
    }

    resetDialog();

    loading.value = false;
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

    if (newValue) {
      if (!currentEntry.value || !currentEntryTopic.value)
        throw new Error('Trying to show AddRelatedItemDialog without a current entry');

      selectItems.value = await entryStore.getEntriesForTopic(props.topic, true);
      extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];

      // focus on the input
      await nextTick();
      nameSelectRef.value?.$el?.querySelector('input')?.focus();
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
</style>
