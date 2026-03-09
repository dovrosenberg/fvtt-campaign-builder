<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      :title="props.title"
      :buttons="dialogButtons"
    >
      <div class="fcb-add-related-items-content flexcol">
        <div v-if="props.options.length > 0">
          <TypeAhead 
            ref="nameSelectRef"
            :initial-value="props.itemId || ''"
            :initial-list="props.options" 
            :allow-new-items="false"
            @selection-made="onSelectionMade"
          />

          <div 
            v-if="props.useOptions2 && options2.length > 0"
            style="margin-top: 0.5rem"
          >
            <Select 
              v-model="entryToAdd"
              :options="options2"
              optionLabel="label"
              optionValue="id"
              placeholder="Select an item..."
              style="width: 100%"
            />
          </div>

          <div class="extra-fields-container" v-if="props.extraFields.length > 0">
            <h3 class="extra-fields-title">{{ localize('dialogs.relatedEntries.additionalInformation') }}</h3>
            <div class="extra-fields-group">
              <div
                v-for="field in props.extraFields"
                :key="field.field"
                class="field-wrapper"
              >
                <div class='field-name'>
                  {{ field.header }}
                  <!-- <i class="fas fa-info-circle tooltip-icon" data-tooltip="If you create a new type, it will be added to the master list"></i> -->
                </div>
                <InputText
                  :id="field.field"
                  v-model="extraFieldValuesObj[field.field]"
                  type="text"
                  unstyled
                  class="field-input"
                  :pt="{ root: { style: { 'font-size': 'var(--fcb-font-size-large)' }}}"      
                />
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-items-message">
          <i class="fas fa-info-circle"></i>
          <span>{{ localize('dialogs.relatedEntries.allItemsConnected') }}</span>
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, nextTick, } from 'vue';

  // local imports
  import { localize } from '@/utils/game';

  // library components
  import InputText from 'primevue/inputtext';
  import Select from 'primevue/select';
  import TypeAhead from '@/components/TypeAhead.vue';
  
  // local components
  import Dialog from '@/components/dialogs/Dialog.vue';

  // types
  interface ButtonProp {
    label: string;
    close?: boolean;
    default?: boolean;
    icon?: string;
    disable?: boolean;
    hidden?: boolean;
    callback?: () => void;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog

    title: {
      type: String,
      required: true
    },
    mainButtonLabel: {
      type: String,
      required: true
    },
    createButtonLabel: {
      type: String,
      required: false,
      default: ''
    },
    options: {
      type: Array as PropType<{id: string; label: string}[]>,
      required: true
    },
    useOptions2: {
      type: Boolean,
      required: false,
      default: false
    },
    options2: {
      type: Function as PropType<(id: string) => Promise<{id: string; label: string}[]>>,
      required: false,
      default: () => []
    },
    extraFields: {
      type: Array as PropType<{field: string; header: string}[]>,
      required: false,
      default: () => []
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
    allowCreate: {
      type: Boolean,
      default: true,
    },
    /** when submitted will call this with selected id */
    callback: {
      type: Function as PropType<(selectedId: string) => Promise<void>>,
      required: false,
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void,
    (e: 'mainButtonClick', selectedItemId: string, extraFieldValues: Record<string, string>): void,
    (e: 'createClick'): void,
    (e: 'cancelClick'): void,
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const entryToAdd = ref<string | null>(null);  // the selected item from the dropdown (uuid)
  const extraFieldValuesObj = ref<Record<string, string>>({});
  const nameSelectRef = ref<typeof TypeAhead | null>(null);
  const options2 = ref<{id: string; label: string}[]>([]);
  const firstLevelSelected = ref<string | null>(null);  // track if first level is selected

  ////////////////////////////////
  // computed data
  const isAddFormValid = computed((): boolean => {
    // If using options2, require both first level selection and second level selection
    if (props.useOptions2) {
      return !!firstLevelSelected.value && !!entryToAdd.value;
    }
    // Otherwise, just require any selection
    return !!entryToAdd.value;
  });

  const dialogButtons = computed((): ButtonProp[] => {
    const buttons = [] as ButtonProp[];

    buttons.push({
      label: localize('labels.cancel'),
      default: false,
      close: true,
      callback: onCancel
    });

    if (props.allowCreate) {
      buttons.push({
        label: props.createButtonLabel,
        default: false,
        close: true,
        callback: onCreateClick,
        icon: 'fa-plus'
      });
    }

    buttons.push({
      label: props.mainButtonLabel,
      disable: !isAddFormValid.value,
      default: true,
      close: true,
      callback: onActionClick,
      icon: 'fa-save'
    });

    return buttons;
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    entryToAdd.value = null;
    firstLevelSelected.value = null;
    extraFieldValuesObj.value = {};
    show.value = false;
    emit('update:modelValue', false);
  };

  ////////////////////////////////
  // event handlers
  const onSelectionMade = async function(uuid: string) {
    if (props.useOptions2) {
      firstLevelSelected.value = uuid;
      options2.value = await props.options2(uuid);
      entryToAdd.value = null;  // Clear second level selection until user picks
    } else { 
      entryToAdd.value = uuid || null;
      options2.value = [];
    }
  };


  const onActionClick = async function() {
    // replace nulls with empty strings
    const extraFieldsToSend = props.extraFields.reduce((acc, field) => {
      acc[field.field] = extraFieldValuesObj.value[field.field] || '';
      return acc;
    }, {} as Record<string, string>);

    emit('mainButtonClick', entryToAdd.value || '', extraFieldsToSend);
    if (props.callback && entryToAdd.value)
      await props.callback(entryToAdd.value);

    resetDialog();
  };
  
  const onCreateClick = async function() {
    emit('createClick');
    resetDialog();
  }

  const onCancel = function() {
    emit('cancelClick');
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the dialog changes state, alert parent (so v-model works)
  watch(show, async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal value
  watch(() => props.modelValue, async (newValue) => {
    show.value = newValue; 

    if (newValue) {
      // clear fields
      extraFieldValuesObj.value = {};
      firstLevelSelected.value = null;
      options2.value = [];

      if (props.itemId)
        entryToAdd.value = props.itemId;  // assign starting value, if any

      // focus on the input
      await nextTick();
      // @ts-ignore - not sure why $el isn't found
      nameSelectRef.value?.$el?.querySelector('input')?.focus();
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
.application.fcb-related-item {
  // hide the wrapper window
  display:none;
}

.fcb-add-related-items-content {
  gap: 1.5rem;
  width: 100%;
  padding: 0.5rem 0;

  .extra-fields-container {
    width: 100%;
    margin-top: 20px;

    .extra-fields-title {
      font-size: var(--fcb-font-size-header);
      font-weight: 600;
      color: var(--fcb-text);
      margin-bottom: 0.75rem;
      margin-top: 2rem;
      border-bottom: 3px solid var(--fcb-control-border);
      padding-bottom: 0.25rem;
      width: fit-content;
    }

    .field-wrapper {
      .field-name {
        font: 350 var(--fcb-font-size-large) var(--fcb-font-family);
        color: var(--fcb-text);
        margin-bottom: 2px;
        margin-top: 8px;
        display: flex;
        align-items: center;

        .tooltip-icon {
          margin-left: 5px;
          font-size: var(--font-size-12);
          color: var(--fcb-text);
          cursor: help;
        }
      }

      input {
        color: var(--fcb-text);
      }
    }
  }
}

.no-items-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  color: var(--fcb-text);
  font-style: italic;
  gap: 0.75rem;

  i {
    font-size: 1.25rem;
    color: var(--fcb-text);
  }
}
</style>