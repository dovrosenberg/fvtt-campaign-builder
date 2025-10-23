<template>
  <Dialog
    v-model="show"
    :title="title"
    :buttons="buttons"
    @cancel="onCancel"
  >
    <div>
      <p>{{ message }}</p>
      <input
        id="response"
        v-model="inputValue"
        type="text"
        class="fcb-input"
        @keydown.enter="onOk"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue';
  import Dialog from './Dialog.vue';
  import { localize } from '@/utils/game';

  interface Props {
    modelValue: boolean;
    title: string;
    message: string;
    initialValue?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    initialValue: '',
  });

  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'result': [value: string | null];
  }>();

  const show = ref(props.modelValue);
  const inputValue = ref(props.initialValue);

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

  function onOk() {
    emit('result', inputValue.value);
    emit('update:modelValue', false);
  }

  function onCancel() {
    emit('result', null);
    emit('update:modelValue', false);
  }

  watch(() => props.modelValue, (newValue) => {
    show.value = newValue;
  });

  watch(show, (newValue) => {
    emit('update:modelValue', newValue);
  });
</script>

<style scoped>
  .fcb-input {
    width: 100%;
    margin-top: 10px;
    padding: 5px;
  }
</style>
