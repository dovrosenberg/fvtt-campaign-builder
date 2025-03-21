<template>
  <!-- Used for editing the "extra fields" present on the relationships between two items (ex. the role for a character in an organization)-->
  <Dialog 
    v-model="show" 
    :title="`${topicDetails[props.topic].title}: ${props.itemName}`"
    :buttons="[
      {
        label: 'Cancel',
        default: false,
        close: true,
        callback: () => { show=false;}
      },
      {
        label: topicDetails[props.topic].buttonTitle,
        default: true,
        close: true,
        callback: onEditClick
      }
    ]"
    @close="onClose"
  >
    <div 
      v-if="props.extraFieldValues.length>0"
      class="flexcol"
    >
      <div class="flexrow">
        <InputGroup 
          v-for="(field, index) in extraFieldValues"
          :key="field.field"
        >
          <IftaLabel>
            <InputText 
              :id="field.field"
              v-model="extraFieldValues[index].value"
              variant="outlined"
            />
            <label :for="field.field">{{ field.header }}</label>
          </IftaLabel>
        </InputGroup>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, watch } from 'vue';
  
  // local imports
  import { useRelationshipStore } from '@/applications/stores';

  // library components
  import InputText from 'primevue/inputtext';
  import InputGroup from 'primevue/inputgroup';
  import IftaLabel from 'primevue/iftalabel';

  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  import { Topics, ValidTopic } from '@/types';
  
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
  const emit = defineEmits<{
    (e: 'update:modelValue', newValue: boolean): void;
  }>();

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const extraFieldValues = ref(foundry.utils.deepClone(props.extraFieldValues));
  const topicDetails = {
    [Topics.Character]: {
      title: 'Edit character',
      buttonTitle: 'Save character',
    },
    [Topics.Organization]: {
      title: 'Edit organization',
      buttonTitle: 'Save organization',
    },
    [Topics.Location]: {
      title: 'Edit location',
      buttonTitle: 'Save location',
    },
    [Topics.Event]: {
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
    // replace nulls with empty strings
    const extraFieldsToSend = props.extraFieldValues.reduce((acc, field, i) => {
      acc[field.field] = extraFieldValues.value[i].value || '';
      return acc;
    }, {} as Record<string, string>);

    await relationshipStore.editRelationship(props.itemId, extraFieldsToSend);
    
    resetDialog();
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
      extraFieldValues.value = foundry.utils.deepClone(props.extraFieldValues);
  });

  // make sure to update the 

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
</style>
