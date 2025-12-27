<!--
FoundryColorPicker: Wrapper for Foundry's HTMLColorPickerElement

Purpose
- Provides a Vue wrapper for Foundry's native HTMLColorPickerElement.

Responsibilities
- Wraps Foundry's HTMLColorPickerElement for use in Vue components
- Handles v-model binding for color values
- Manages the lifecycle of the color picker element

Props
- modelValue: string, the current color value

Emits
- update:modelValue: string, emitted when color value changes

Slots
- None

Dependencies
- Stores: None
- Composables: None
- Services/API: None

-->

<template>
  <div ref="colorPickerRef" class="foundry-color-picker"></div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, watch, nextTick } from 'vue';

  // local imports

  // library components

  // local components

  // types

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: {
      type: String,
      default: '#000000'
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const colorPickerRef = ref<HTMLElement>();
  let colorPicker: HTMLElement | null = null;

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  /**
   * Create the Foundry color picker element and attach it to the DOM
   */
  const createColorPicker = () => {
    // Clear any existing element
    if (colorPicker && colorPickerRef.value) {
      colorPickerRef.value.removeChild(colorPicker);
    }

    // Create the Foundry color picker element
    colorPicker = foundry.applications.elements.HTMLColorPickerElement.create({
      value: props.modelValue,
      name: 'color'
    });

    if (colorPickerRef.value) {
      colorPickerRef.value.appendChild(colorPicker);

      // Listen for changes
      colorPicker.addEventListener('change', onColorChange);
    }
  };

  ////////////////////////////////
  // event handlers
  /**
   * Handle color change from the Foundry color picker
   */
  const onColorChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', target.value);
  };

  ////////////////////////////////
  // watchers
  /**
   * Watch for external model value changes and update the color picker
   */
  watch(() => props.modelValue, (newValue) => {
    if (colorPicker) {
      // Update the element's value when the prop changes
      const input = colorPicker.querySelector('input[type="color"]') as HTMLInputElement;
      if (input && input.value !== newValue) {
        input.value = newValue;
      }
    }
  });

  ////////////////////////////////
  // lifecycle hooks
  onMounted(async () => {
    await nextTick();
    createColorPicker();
  });
</script>

<style lang="scss" scoped>
.foundry-color-picker {
  width: 100%;
  
  :deep(input[type="color"]) {
    width: 100%;
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--color-border-light);
    cursor: pointer;
    background: var(--color-bg-input);
  }
}
</style>
