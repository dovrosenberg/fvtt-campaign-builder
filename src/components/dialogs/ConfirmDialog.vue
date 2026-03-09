<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      :title="title"
      :buttons="buttons"
      @cancel="onCancel"
    >
      <p>{{ message }}</p>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue';
  import Dialog from './Dialog.vue';
  import { localize } from '@/utils/game';

  interface Props {
    modelValue: boolean;
    title: string;
    message: string;
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'confirm': [];
    'cancel': [];
  }>();

  const show = ref(props.modelValue);

  const buttons = computed(() => [
    {
      label: localize('labels.no'),
      close: true,
      callback: () => onCancel(),
    },
    {
      label: localize('labels.yes'),
      close: true,
      default: true,
      callback: () => onConfirm(),
    },
  ]);

  function onConfirm() {
    emit('confirm');
    emit('update:modelValue', false);
  }

  function onCancel() {
    emit('cancel');
    emit('update:modelValue', false);
  }

  watch(() => props.modelValue, (newValue) => {
    show.value = newValue;
  });

  watch(show, (newValue) => {
    emit('update:modelValue', newValue);
  });
</script>
