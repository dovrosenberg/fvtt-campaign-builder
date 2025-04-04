<template>
  <div
    v-if="show"
    class="app window-app wcb-dialog themed theme-light"
    ref="dialogRef"
    role="dialog"
    :style="style"
  >
    <header 
      class="wcb-window-header window-header flexrow draggable"
      @mousedown="onStartDrag"
    >
      <div class="wcb-window-title">{{ title }}</div>
      <a 
        class="header-button control close"
        @click="() => { show = false; emit('cancel'); }"
      >
        <i class="fas fa-times"></i>
        <span class="close-text">Close</span>
      </a>
    </header>
    <section class="window-content">
      <div class="wcb-dialog-content">
        <slot />
      </div>
      <div class="wcb-dialog-buttons">
        <button
          v-for="(btn, key) in props.buttons"
          :key="key"
          type="button"
          :disabled="btn.disable"
          :class="`wcb-dialog-button ${btn.default ? 'default' : ''}`"
          @click="onButtonClick(btn)"
        >
          <i v-if="btn.icon" :class="`fas ${btn.icon}`"></i>
          <span>{{ btn.label }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { defineProps, computed, ref, PropType, watch, reactive } from 'vue'

  // local imports

  // library components

  // local components

  // types
  type ButtonProp = {
    label: string;
    close?: boolean;  // close after clicking
    default?: boolean;
    icon?: string;
    disable?: boolean;
    callback?: () => void;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    title: {
      type: String,
      required: false,
      default: '',
    },
    // buttons are an object with name as the key and a label and callback
    // also have ok and cancel props to 
    buttons: {
      type: Array as PropType<ButtonProp[]>,
      required: false,
      default: [{ label: 'OK', close: true, default: true }],
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['update:modelValue', 'cancel']);

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const dialogRef = ref<HTMLElement | null>(null)
  const position = reactive({ top: 100, left: window.innerWidth / 2 - 200 })
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };

  ////////////////////////////////
  // computed data
  const style = computed(() => ({
    "z-index": `106`,
    width: `500px`,
    left: `${position.left}px`,
    top: `${position.top}px`,
  }));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onStartDrag = (e: MouseEvent) => {
    if (!dialogRef.value) 
      return;

    dragging = true;
    dragOffset.x = e.clientX ;
    dragOffset.y = e.clientY ;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  }

  function onDrag(e: MouseEvent) {
    if (!dragging) 
      return;
    
    position.left += (e.clientX - dragOffset.x);
    position.top += (e.clientY - dragOffset.y);

    dragOffset.x = e.clientX;
    dragOffset.y = e.clientY;
  }

  function stopDrag() {
    dragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  }

  const onButtonClick = (btn: ButtonProp) => {
    if (btn.callback) {
      btn.callback();
    }
    
    if (btn.close) {
      show.value = false;
      emit('update:modelValue', false); 
    }
  }

  ////////////////////////////////
  // watchers
  watch(() => props.modelValue, async (newValue) => {
      show.value = newValue; 
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
  .wcb-dialog {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    font-size: var(--font-size-14);
    width: 550px;
    max-width: 90%;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    overflow: visible;

    .wcb-window-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 0 0 36px;
      gap: 0;
      border-bottom: 1px solid var(--color-border-window, #b5b3a4);
      font-size: var(--font-size-16);
      // background-color: var(--color-bg-header, #e0e0d0);
      padding: 0 10px;

      .header-button.close {
        flex: 0 0 auto;
        text-align: right;
        // color: var(--color-text-dark-secondary, #4b4a44);
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border-radius: 4px;
        transition: all 0.2s ease;

        i {
          font-size: 14px;
        }

        .close-text {
          font-size: 14px;
        }
      }

      .wcb-window-title {
        margin: 0;
        font-weight: 600;
      }
    }

    .window-content {
      padding: 0px 8px 5px 8px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: visible;

      .wcb-dialog-content {
        font-size: var(--font-size-14);
        width: 100%;
        overflow: visible !important; // allow typeaheads to come out

        input, textarea {
          font-size: var(--font-size-14) !important;
        }
      }

      .wcb-dialog-buttons {
        margin: 0;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 10px;
        padding-bottom: 3px;

        .wcb-dialog-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 100px;
          font-size: var(--font-size-14);
          border-radius: 3px;
          padding: 1px 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          background: rgba(0, 0, 0, 0.1);
          border: 2px groove solid rgb(240, 240, 224);
          color: #000000;

            &:hover:not(:disabled) {
              border-color: var(--color-border-button-secondary-hover, #a5a394);
              box-shadow: 0 0 5px var(--color-shadow-primary);
            }

          &.default {
            background: rgba(0, 0, 0, 0.05);
            border: 2px groove solid rgb(201, 199, 184);
            color: var(--color-text-dark-primary, #191813);

            &:hover:not(:disabled) {
              border-color: var(--color-border-button-secondary-hover, #a5a394);
              box-shadow: 0 0 5px var(--color-shadow-primary);
            }
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          i {
            font-size: 14px;
          }
        }
      }
    }
  }
</style>
