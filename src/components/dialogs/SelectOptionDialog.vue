<!--
SelectOptionDialog: Select Option Dialog

Purpose
- Displays a generic dialog for selecting an option from a dropdown list

Responsibilities
- Show a PrimeVue Select dropdown with options
- Allow user to select one or cancel
- Support generic option types with configurable label/value keys

Props
- modelValue: boolean, dialog visibility
- title: string, dialog title
- message: string, prompt message shown above dropdown
- options: array of options to select from
- optionLabel: string, property name to use for display (default: 'label')
- optionValue: string, property name to use as value (default: 'value')
- placeholder: string, placeholder text for dropdown

Emits
- update:modelValue: when dialog visibility changes
- result: when an option is selected (emits value) or cancelled (emits null)

Slots
- None

Dependencies
- PrimeVue Select

-->

<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      :title="title"
      :buttons="buttons"
      @cancel="onCancel"
    >
      <div>
        <p v-if="message">{{ message }}</p>
        <Select
          v-model="selectedValue"
          :options="options"
          optionLabel="label"
          optionValue="id"
          :placeholder="placeholder"
          class="fcb-select-dropdown"
          data-dialog-autofocus
          :pt="{
            root: { class: 'fcb-dropdown' },
            input: { class: 'fcb-dropdown-input' },
            panel: { class: 'fcb-dropdown-panel' },
            item: { class: 'fcb-dropdown-item' }
          }"
        />
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, computed, PropType } from 'vue';

  // library components
  import Select from 'primevue/select';

  // local imports
  import Dialog from './Dialog.vue';
  import { localize } from '@/utils/game';

  // types

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    options: {
      type: Array as PropType<{label: string, id: string}[]>,
      required: true,
    },
    placeholder: {
      type: String,
      default: '',
    },
  });

  ////////////////////////////////
  // emits

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'select', value: string | null): void;
  }>();

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const selectedValue = ref<any>(null);

  ////////////////////////////////
  // computed data
  const buttons = computed(() => [
    {
      label: localize('labels.cancel'),
      close: true,
      callback: () => onCancel(),
    },
    {
      label: localize('labels.ok'),
      close: true,
      default: true,
      callback: () => onOk(),
    },
  ]);

  ////////////////////////////////
  // methods
  function onOk() {
    emit('select', selectedValue.value);
    emit('update:modelValue', false);
  }

  function onCancel() {
    emit('select', null);
    emit('update:modelValue', false);
  }

  ////////////////////////////////
  // watchers
  watch(() => props.modelValue, (newValue) => {
    show.value = newValue;
    // Set selection to first option when dialog opens
    if (newValue) {
      selectedValue.value = props.options.length > 0 ? props.options[0].id : null;
    }
  });

  watch(show, (newValue) => {
    emit('update:modelValue', newValue);
  });
</script>

<style scoped>
.fcb-select-dropdown {
  width: 100%;
  margin-top: 10px;
}
</style>
