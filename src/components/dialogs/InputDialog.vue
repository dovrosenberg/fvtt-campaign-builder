<template>
  <Teleport to="body">
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
          data-dialog-autofocus
        />
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue';
  import Dialog from './Dialog.vue';
  import { localize } from '@/utils/game';

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
      required: true,
    },
    initialValue: {
      type: String,
      required: false,
      default: '',
    },
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
    emit('result', inputValue.value.trim());
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
