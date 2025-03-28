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
        @click="() => { show = false; emit('close'); }"
      >
        <i class="fas fa-times"></i>
        Close
      </a>
    </header>
    <section class="window-content" style="gap: 5px">
      <div class="wcb-dialog-content flexrow">
        <slot />
      </div>
      <div class="wcb-dialog-buttons flexrow">
        <button
          v-for="(btn, key) in props.buttons"
          :key="key"
          type="button"
          :disabled="btn.disable"
          :class="`wcb-dialog-button flex1 ${btn.default ? 'default' : ''}`"
          @click="onButtonClick(btn)"
        >
          <i v-if="btn.icon" :class="`fas ${btn.icon}`"></i>
          {{ btn.label }}
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
  const emit = defineEmits(['update:modelValue', 'close']);

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
      emit('close'); 
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
    background-color: rgba(0, 0, 0, 0);
    background: inherit;
    color: var(--color-text-light-highlight);
    border: unset;
    border-radius: 5px;
    font-size: var(--font-size-14);
    width: 400px;
    max-width: 90%;

    .wcb-window-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 0 0 30px;
      gap: 0;
      border-bottom: 2px groove rgb(48, 40, 49);
      font-size: var(--font-size-16);

      .header-button.close {
        flex: 0 1 80px;
        text-align: right;
      }

      .wcb-window-title {
        margin: 0;
      }
    }

    .window-content {
      padding: 8px;

      .wcb-dialog-content {
        // padding: 1em;
        // background: var(--color-body, #2a2a2a);
        // display: flex;
        // flex-direction: column;
        // flex: 1;
        font-size: var(--font-size-14);

        input, textarea { 
          font-size: inherit;
          padding: 1px 3px;
        }
      }

      .wcb-dialog-buttons {
        margin: 0;
        gap: 5px;
        // padding: 0.5em 1em;
        // display: flex;
        // justify-content: flex-end;
        // border-top: 1px solid var(--color-border, #555);
        // background: var(--color-footer, #444);

        .wcb-dialog-button {
          background: var(--button-background-color);
          border: 1px solid var(--button-border-color);
          color: var(--button-text-color);
          font-size: var(--font-size-14);
          border-radius: 4px;
          padding: 0 0.5rem;
          gap: 0.25rem;
          cursor: pointer;

          &:hover {
            background: var(--button-hover-background-color);
            border-color: var(--button-hover-border-color);
            color: var(--button-hover-text-color);
          }
        }
      }
    }
  }
</style>
