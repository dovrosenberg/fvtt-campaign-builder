<template>
  <Dialog 
    v-model="show" 
    style="min-width: 350px;"
  >
    <template #header>
      <div class="text-h6">
        {{ itemTypeDetails[props.topic].title }}
      </div>
    </template>

    <div 
      v-if="selectItems.length>0"
      class="q-pt-none q-gutter-sm"
    >
      <!-- <q-select v-model="itemId"
        ref="nameSelectRef"
        :options="options"
        label="Name"
        outlined 
        fill-input
        use-input
        input-debounce="0"
        hide-selected
        clearable
        @filter="filterFnAutoselect"
        @keydown.enter.stop="onAddClick"
      />
      <q-input 
        v-for="field in extraFields"
        :key="field.name"
        v-model="extraFieldValues[field.name]"
        :label="field.label"
        outlined
      /> -->
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
        @click="emit('update:modelValue', false);"
      />
      <Button
        :label="itemTypeDetails[props.topic].buttonTitle" 
        :disable="!isAddFormValid"
        text
        severity="secondary"
        autofocus
        @click="onAddClick"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, onMounted, nextTick } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useRelationshipStore, useEntryStore, } from '@/applications/stores';

  // library components
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button';

  // local components

  // types
  import { Topic, ValidTopic, } from '@/types';

  type ItemTypeDetail = {
    title: string;
    buttonTitle: string;
  };

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
  const emit = defineEmits(['itemAdded', 'update:modelValue', 'closeDialog']);

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const entryStore = useEntryStore();
  const mainStore = useMainStore();
  const { currentEntry, currentEntryTopic } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const itemId = ref<{ label: string, value: string } | null>(null);  // the selected item from the dropdown
  const options = ref<{ label: string, value: string }[]>([]);
  const extraFieldValues = ref<Record<string, string>>({});
  const itemTypeDetails = {
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
  } as Record<ValidTopic, ItemTypeDetail>;
  const selectItems = ref<JournalEntry[]>([]);
  const extraFields = ref<{field:string, header:string}[]>([]);
  const nameSelectRef = ref<QSelect | null>(null);

  ////////////////////////////////
  // computed data
  const isAddFormValid = computed((): boolean => {
    return (!!itemId.value);
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    itemId.value = null;
    extraFieldValues.value = {};
    show.value = false;
    emit('update:modelValue', false);
  }

  const filterFnAutoselect = function(value: string, update: (callbackFn: () => void, afterFn?: ((ref: QSelect) => void) | undefined) => void, /*abort*/) {
    // call abort() at any time if you can't retrieve data somehow

    setTimeout(() => {
      update(
        () => {
          if (value === '') {
            options.value = selectItems.value;
          }
          else {
            const needle = value.toLowerCase()
            options.value = selectItems.value.filter((item) => (item.label.toLowerCase().indexOf(needle) > -1));
          }
        },

        // "ref" is the Vue reference to the QSelect
        (ref: QSelect) => {
          if (value !== '' && ref.options?.length && ref.options.length > 0 && ref.getOptionIndex() === -1) {
            ref.moveOptionSelection(1, true) // focus the first selectable option and do not update the input-value
            ref.toggleOption(ref.options[ ref.getOptionIndex() ], true) // toggle the focused option
          }
        }
      )
    }, 200)
  };

  ////////////////////////////////
  // event handlers
  const onAddClick = async function() {
    Loading.show({group: 'AddRelatedItemDialog.onAddClick'});

    // note that this naming is a bit backward - topic is the type of the related table, so it's not the current item
    let result = false;

    if (itemId.value) {
      // replace nulls with empty strings
      const extraFieldsToSend = extraFields.value.reduce((acc, field) => {
        acc[field.name] = extraFieldValues.value[field.name] || '';
        return acc;
      }, {} as Record<string, string>);

      result = await relationshipStore.addRelatedItem(props.topic, itemId.value.value, extraFieldsToSend);
    }

    if (result) {
      emit('itemAdded');
      resetDialog();
    }

    Loading.hide('AddRelatedItemDialog.onAddClick');
  }
  
  const onAddCancelClick = function() {
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the addDialog changes state, alert parent (so v-model works)
  watch(() => show,  async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal value
  watch(() => props.modelValue,  async (newValue) => {
    show.value = newValue; 

    if (newValue) {
      // focus on the input
      await nextTick();
      nameSelectRef.value?.focus();
    }
  });

  // when the item type changes, reload it 
  watch(() => props.topic,  async () => {
    // get the list of items for the dropdown
    if (!currentEntry.value || !currentEntryTopic.value || currentEntryTopic.value===Topic.None)
      return;

    selectItems.value = await entryStore.getEntriesForTopic(props.topic, true);
    extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];
  });


  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // get the list of items for the dropdown
    if (!currentEntry.value || !currentEntryTopic.value || currentEntryTopic.value===Topic.None)
      return;

    selectItems.value = await entryStore.getEntriesForTopic(props.topic, true);
    extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];

    await nextTick();
    nameSelectRef.value?.focus();
  });

</script>

<style lang="scss" scoped>
</style>
