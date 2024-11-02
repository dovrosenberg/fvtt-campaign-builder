<template>
  <q-dialog v-model="show">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">
          {{ itemTypeDetails[props.itemType].title }}
        </div>
      </q-card-section>

      <q-card-section v-if="selectItems.length>0"
        class="q-pt-none q-gutter-sm"
      >
        <q-select v-model="itemId"
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
        <q-input v-for="field in extraFields"
          :key="field.name"
          v-model="extraFieldValues[field.name]"
          :label="field.label"
          outlined
        />
      </q-card-section>
      <q-card-section v-else>
        All possible related items are already connected.
      </q-card-section>
      <q-card-actions align="right" class="text-primary">
        <q-btn 
          v-close-popup 
          flat 
          label="Cancel" 
          @click="onAddCancelClick"
        />
        <q-btn 
          flat 
          :label="itemTypeDetails[props.itemType].buttonTitle" 
          :disable="!isAddFormValid"
          @click="onAddClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, onMounted, nextTick } from 'vue';

  // local imports

  // library components

  // local components

  // types
  import { FieldUsedIn, ItemFieldUsedIn, } from '@/types';
  import { useItemStore } from '@/stores/itemStore';
  import { Loading, QSelect } from 'quasar';
  type ItemTypeDetail = {
    title: string;
    buttonTitle: string;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    itemType: { // this is the type of the item that we're adding
      type: String as PropType<ItemFieldUsedIn>, 
      required: true,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['itemAdded', 'update:modelValue']);

  ////////////////////////////////
  // store
  const itemStore = useItemStore();

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const itemId = ref<{ label: string, value: string } | null>(null);  // the selected item from the dropdown
  const options = ref<{ label: string, value: string }[]>([]);
  const extraFieldValues = ref<Record<string, string>>({});
  const itemTypeDetails = {
    [FieldUsedIn.Event]: {
      title: 'Add an event',
      buttonTitle: 'Add event',
    },
    [FieldUsedIn.Character]: {
      title: 'Add a character',
      buttonTitle: 'Add character',
    },
    [FieldUsedIn.Location]: {
      title: 'Add a location',
      buttonTitle: 'Add location',
    },
    [FieldUsedIn.Organization]: {
      title: 'Add an organization',
      buttonTitle: 'Add organization',
    },
    [FieldUsedIn.Species]: {
      title: 'Add a species',
      buttonTitle: 'Add species',
    },
    [FieldUsedIn.Note]: {
      title: 'Add a note',
      buttonTitle: 'Add note',
    },
  } as Record<ItemFieldUsedIn, ItemTypeDetail>;
  const selectItems = ref<{ label: string, value: string }[]>([]);
  const extraFields = ref<{name:string, label:string}[]>([]);
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

    // note that this naming is a bit backward - itemType is the type of the related table, so it's not the current item
    let result = false;

    if (itemId.value) {
      // replace nulls with empty strings
      const extraFieldsToSend = extraFields.value.reduce((acc, field) => {
        acc[field.name] = extraFieldValues.value[field.name] || '';
        return acc;
      }, {} as Record<string, string>);

      result = await itemStore.addRelatedItem(props.itemType, itemId.value.value, extraFieldsToSend);
    }

    if (result) {
      emit('itemAdded');
      resetDialog();
    }

    Loading.hide('AddRelatedItemDialog.onAddClick');
  }
  
  const onAddCancelClick = function() {
    resetDialog();
  }
  
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
  watch(() => props.itemType,  async () => {
    // get the list of items for the dropdown
    selectItems.value = await itemStore.getItemList(props.itemType, true);
    extraFields.value = itemStore.getRelatedItemExtraFields(props.itemType);
  });


  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // get the list of items for the dropdown
    selectItems.value = await itemStore.getItemList(props.itemType, true);
    extraFields.value = itemStore.getRelatedItemExtraFields(props.itemType);

    await nextTick();
    nameSelectRef.value?.focus();
  });

</script>

<style lang="scss" scoped>
</style>
