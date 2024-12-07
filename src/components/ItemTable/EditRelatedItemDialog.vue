<template>
  <!-- Used for editing the "extra fields" present on the relationships between two items (ex. the role for a character in an organization)-->
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
          {{ `${topicDetails[props.topic].title}: ${props.itemName}` }}
        </div>
      </template>

      <div 
        v-if="props.extraFieldValues.length>0"
        class="flexcol"
      >
        <InputGroup 
          v-for="field in extraFieldValues"
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
          text
          severity="secondary"
          autofocus
          @click="onEditClick"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, watch } from 'vue';
  
  // local imports
  import { useRelationshipStore } from '@/applications/stores';

  // library components
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button';
  import ProgressSpinner from 'primevue/progressspinner';
  import InputText from 'primevue/inputtext';
  import InputGroup from 'primevue/inputgroup';
  import FloatLabel from 'primevue/floatlabel';

  // local components

  // types
  import { Topic, ValidTopic } from '@/types';
  
  type ItemTypeDetail = {
    title: string;
    buttonTitle: string;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    // the type of item we're editing (ex. organization if we're editing the role of a character in an organization from the character's page)
    topic: { 
      type: Number as PropType<ValidTopic>, 
      required: true,
    },
    // the uuid of that item (ex. the organization)
    itemId: { 
      type: String as PropType<string>, 
      required: true,
    },
    // the name of that item (ex. the organization)
    itemName: { 
      type: String as PropType<string>, 
      required: true,
    },
    // values of extra (text) fields that we want to edit on the item (keyed by field name)
    extraFieldValues: { 
      type: Array as PropType<{field: string; header: string; value: string}[]>, 
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

  ////////////////////////////////
  // data
  const loading = ref(false);
  const show = ref(props.modelValue);
  const extraFieldValues = ref(globalThis.foundry.utils.deepClone(props.extraFieldValues));
  const topicDetails = {
    [Topic.Character]: {
      title: 'Edit character',
      buttonTitle: 'Save character',
    },
    [Topic.Organization]: {
      title: 'Edit organization',
      buttonTitle: 'Save organization',
    },
    [Topic.Location]: {
      title: 'Edit location',
      buttonTitle: 'Save location',
    },
    [Topic.Event]: {
      title: 'Edit event',
      buttonTitle: 'Save event',
    },
  } as Record<ValidTopic, ItemTypeDetail>;

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    show.value = false;
    emit('update:modelValue', false);
  };

  ////////////////////////////////
  // event handlers
  const onEditClick = async function() {
    loading.value = true;

    // replace nulls with empty strings
    const extraFieldsToSend = props.extraFieldValues.reduce((acc, field) => {
      acc[field.field] = extraFieldValues.value[field.field] || '';
      return acc;
    }, {} as Record<string, string>);

    await relationshipStore.editRelationship(props.itemId, extraFieldsToSend);
    
    resetDialog();

    loading.value = false;
  };
  
  const onClose = function() {
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the addDialog changes state, alert parent (so v-model works)
  watch(() => show,  async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal values
  watch(() => props.modelValue,  async (newValue) => {
    show.value = newValue;

    // if we're now visible, update the extra field values
    if (show.value)
      extraFieldValues.value = globalThis.foundry.utils.deepClone(props.extraFieldValues);
  });

  // make sure to update the 

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
</style>
