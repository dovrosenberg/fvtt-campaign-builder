<template>
  <div ref="rangePickerContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

// types
interface Props {
  modelValue: number;
  name: string;
  min: number;
  max: number;
  step?: number;
}

interface Emits {
  (e: 'update:modelValue', value: number): void;
}

////////////////////////////////
// props
const props = withDefaults(defineProps<Props>(), {
  step: 1
});

////////////////////////////////
// emits
const emit = defineEmits<Emits>();

////////////////////////////////
// data
const rangePickerContainer = ref<HTMLElement | null>(null);
let rangePickerElement: HTMLElement | null = null;

////////////////////////////////
// methods
const createRangePicker = () => {
  if (!rangePickerContainer.value) return;

  // Clear any existing element
  if (rangePickerElement) {
    rangePickerContainer.value.removeChild(rangePickerElement);
  }

  // Create the Foundry range picker element
  rangePickerElement = foundry.applications.elements.HTMLRangePickerElement.create({
    name: props.name,
    value: props.modelValue,
    min: props.min,
    max: props.max,
    step: props.step
  });

  rangePickerContainer.value.appendChild(rangePickerElement);

  // Listen for changes
  rangePickerElement.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', Number(target.value));
  });
};

////////////////////////////////
// watchers
watch(() => props.modelValue, (newValue) => {
  if (rangePickerElement) {
    // Update the element's value when the prop changes
    const input = rangePickerElement.querySelector('input[type="range"]') as HTMLInputElement;
    const numberInput = rangePickerElement.querySelector('input[type="number"]') as HTMLInputElement;
    if (input) input.value = newValue.toString();
    if (numberInput) numberInput.value = newValue.toString();
  }
});

////////////////////////////////
// lifecycle events
onMounted(() => {
  createRangePicker();
});
</script>

<style lang="scss">
</style> 