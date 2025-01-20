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
        No items found
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
  import { useMainStore, } from '@/applications/stores';

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
  const emit = defineEmits(['update:modelValue', 'itemPicked', ]);

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentWorld, } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const loading = ref(false);
  const show = ref(props.modelValue);
  const entry = ref<Entry | null>(null);  // the selected item from the dropdown
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
  const selectItems = ref<{uuid: string; name: string}[]>([]);
  const options = ref<{uuid: string; name: string}[]>([]);
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

  const mapEntryToOption = function(entry: Entry) {
    return {
      uuid: entry.uuid,
      name: entry.type ? `${entry.name} (${entry.type})` : entry.name,
    };
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

  const onAddClick = function() {
    // loading.value = true;

    if (entry.value) {
      emit('itemPicked', entry.value.uuid);
    }

    resetDialog();

    // loading.value = false;
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
      selectItems.value = (await Entry.getEntriesForTopic(currentWorld.value.topicFolders[props.topic] as TopicFolder)).map(mapEntryToOption);

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
</style>
