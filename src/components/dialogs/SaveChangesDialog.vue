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
  import { SaveChangesResult } from '@/dialogs/saveChanges';
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
  });
  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'result': [result: SaveChangesResult];
  }>();

  const show = ref(props.modelValue);

  const buttons = computed(() => [
    {
      label: localize('dialogs.saveChanges.cancel'),
      close: true,
      callback: () => onCancel(),
    },
    {
      label: localize('dialogs.saveChanges.discard'),
      close: true,
      callback: () => onDiscard(),
    },
    {
      label: localize('dialogs.saveChanges.save'),
      close: true,
      default: true,
      callback: () => onSave(),
    },
  ]);

  function onSave() {
    emit('result', SaveChangesResult.Save);
    emit('update:modelValue', false);
  }

  function onDiscard() {
    emit('result', SaveChangesResult.Discard);
    emit('update:modelValue', false);
  }

  function onCancel() {
    emit('result', SaveChangesResult.Cancel);
    emit('update:modelValue', false);
  }

  watch(() => props.modelValue, (newValue) => {
    show.value = newValue;
  });

  watch(show, (newValue) => {
    emit('update:modelValue', newValue);
  });
</script>
