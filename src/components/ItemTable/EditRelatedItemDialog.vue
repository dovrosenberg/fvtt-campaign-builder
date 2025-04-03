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
        callback: onEditClick,
        icon: 'fa-save'
      }
    ]"
    @close="onClose"
  >
    <div
      v-if="props.extraFieldValues.length>0"
      class="edit-related-items-content"
    >
      <div class="fields-container">
        <div class="fields-grid">
          <div
            v-for="(field, index) in extraFieldValues"
            :key="field.field"
            class="field-wrapper"
          >
            <IftaLabel class="field-label">
              <InputText
                :id="field.field"
                v-model="extraFieldValues[index].value"
                variant="outlined"
                class="field-input"
              />
              <label :for="field.field">{{ field.header }}</label>
            </IftaLabel>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-fields-message">
      <i class="fas fa-info-circle"></i>
      <span>No additional fields to edit for this relationship.</span>
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
.edit-related-items-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  padding: 0.5rem 0;

  .fields-container {
    width: 100%;

    .fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;

      .field-wrapper {
        width: 100%;

        .field-label {
          width: 100%;

          :deep(label) {
            font-size: var(--font-size-12);
            color: var(--color-text-dark-secondary);
            margin-top: 0.25rem;
          }

          .field-input {
            width: 100%;
            font-size: var(--font-size-14);
            padding: 0.75rem;
            border-radius: 6px;
            background-color: var(--color-bg-field, rgba(0, 0, 0, 0.05));
            border: 1px solid var(--color-border-input, #666);
            color: var(--color-text-dark-primary);

            &:focus {
              box-shadow: 0 0 0 2px var(--color-shadow-primary, rgba(255, 165, 0, 0.25));
              border-color: var(--color-border-focus, #ffa500);
            }
          }
        }
      }
    }
  }
}

.no-fields-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
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
