Need to think this through more - there should be a generate button on related item 
tables - that's to do something from scratch... but how does it deal with things
like parent?

Or can we only generate from the entry dscription screen?  But then you have to create the entry, edit the name and
stuff there and then generate?

Or should it be a right click on a directory topic to generate from there?

Can we create a dialog to handle all those cases?

<template>
  <!-- used to generate a description for an entry-->
  <Dialog 
    v-model="show"
    :title="topicDetails[props.topic].title"
    :buttons="[
      {
        label: 'Cancel',
        default: false,
        close: true,
        callback: () => { show=false; }
      },
      {
        label: 'Generate',
        default: false,
        close: true,
        disable: !isFormValid,
        callback: onGenerate
      },
      {
        label: 'Accept',
        default: false,
        close: true,
        callback: onAccept
      },
    ]"
    @close="onClose"
  >
  <div 
      v-if="selectItems.length>0"
      class="flexcol"
      style="gap: 5px;"
    >
      So - in here, we want the controls for all the inputs - some things we can
      pull from the entry (like parent, etc.).  We then show an area - maybe a text 
      area that's disabled? - for the output
      There should be a generate button, an accept button, and a cancel button
      <div class="flexrow">
        Type AutoComplete
        Species Autocomplete
        brief description
        
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
      </div>
      <div class="flexrow">
        <InputGroup 
          v-for="field in extraFields"
          :key="field.field"
        >
          <IftaLabel>
            <InputText 
              :id="field.field"
              v-model="extraFieldValues[field.field]"
              variant="outlined"
            />
            <label :for="field.field">{{ field.header }}</label>
          </IftaLabel>
        </InputGroup>
      </div>
    </div>
    <div v-else>
      All possible related items are already connected.
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
  import InputGroup from 'primevue/inputgroup';
  import IftaLabel from 'primevue/iftalabel';

  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  import { Entry, TopicFolder, } from '@/classes';
  import { Topics, } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
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
  const entry = ref<{uuid: string; name: string} | null>(null);  // the selected item from the dropdown

  ////////////////////////////////
  // computed data
  const isFormValid = computed((): boolean => {
    // need to see which fields are required and make sure they're filled in
    return false;
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
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

  const onAddClick = async function() {
    if (entry.value) {
      // replace nulls with empty strings
      const extraFieldsToSend = extraFields.value.reduce((acc, field) => {
        acc[field.field] = extraFieldValues.value[field.field] || '';
        return acc;
      }, {} as Record<string, string>);

      const fullEntry = await Entry.fromUuid(entry.value.uuid);
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
      if (!currentEntry.value || currentEntryTopic.value !== Topics.Organization)
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
</style>
