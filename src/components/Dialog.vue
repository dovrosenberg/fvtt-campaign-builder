<template>
  <div
    v-if="show"
    class="application window-app fcb-dialog themed"
    ref="dialogRef"
    role="dialog"
    :style="style"
    tabindex="-1"
  >
    <header 
      class="fcb-window-header window-header flexrow draggable"
      @mousedown="onStartDrag"
    >
      <div class="fcb-window-title">{{ title }}</div>
      <a 
        class="header-button control close"
        data-testid="dialog-close-button"
        @click="() => { show = false; emit('update:modelValue', false); emit('cancel'); }"
      >
        <i class="fas fa-times"></i>
        <span class="close-text">{{ localize('labels.close') }}</span>
      </a>
    </header>
    <section class="window-content">
      <div class="fcb-dialog-content-wrapper">
        <div id="fcb-dialog-content">
          <slot />
        </div>
        <div class="fcb-dialog-buttons">
          <button
            v-for="(btn, key) in props.buttons"
            :key="key"
            type="button"
            :disabled="btn.disable"
            :style="btn.hidden ? {display:'none'} : {}"
            :class="`fcb-dialog-button ${btn.default ? 'default' : ''}`"
            :data-testid="`dialog-button-${btn.label.toLowerCase().replace(/\s+/g, '-')}`"
            @click="onButtonClick(btn)"
          >
            <i v-if="btn.icon" :class="`fas ${btn.icon}`"></i>
            <span>{{ btn.label }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { defineProps, computed, ref, PropType, watch, reactive, onBeforeUnmount, nextTick } from 'vue'

  // local imports
  import { localize } from '@/utils/game';

  // library components

  // local components

  // types
  interface ButtonProp {
    label: string;
    close?: boolean;  // close after clicking
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
      required: false,
      default: '',
    },
    /** desired width in px */
    width: {
      type: Number,
      required: false,
      default: 500,
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
  // Use a very high z-index to ensure the dialog stays on top of everything
  //    ... but! the z-index of the primevue sel ect dropdown is 1001 and it 
  //    gets put in the body, so we need to keep this below that
  const style = computed(() => ({
    "z-index": `1000`,
    width: `${props.width}px`,
    left: `${position.left}px`,
    top: `${position.top}px`,
  }));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDocumentKeydown = (e: KeyboardEvent) => {
    // Only handle "plain Enter" (no modifiers) and only when the focus/target is within this dialog.
    if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented || e.repeat)
      return;

    if (!dialogRef.value)
      return;

    // In some environments keyboard events are retargeted (e.g. `target` becomes <body>).
    // `composedPath` is a more reliable way to see where the event originated.
    const activeEl = document.activeElement;
    const isInThisDialog = dialogRef.value.contains(activeEl);

    // Only handle Enter when focus (or the event path) is inside this dialog.
    if (!isInThisDialog)
      return;

    // Don't hijack Enter for multiline editing.
    if (activeEl instanceof HTMLTextAreaElement || (activeEl instanceof HTMLElement && activeEl.isContentEditable))
      return;

    // If the user is focused on one of this dialog's buttons, explicitly click it.
    // (In Foundry/Electron environments, Enter does not reliably translate to click.)
    if (activeEl instanceof HTMLButtonElement && activeEl.classList.contains('fcb-dialog-button')) {
      e.preventDefault();
      e.stopPropagation();
      activeEl.click();
      return;
    }

    const defaultBtn = props.buttons.find((btn) => btn.default && !btn.disable && !btn.hidden);
    if (!defaultBtn)
      return;

    // Prevent other handlers from also treating Enter as a submit-like action.
    e.preventDefault();
    e.stopPropagation();
    onButtonClick(defaultBtn);
  };

  const focusDefaultAction = async () => {
    // Wait until the DOM is updated so `dialogRef` and buttons/inputs exist.
    await nextTick();
    if (!dialogRef.value)
      return;

    // First priority: an explicit autofocus target in the dialog content.
    const contentRoot = dialogRef.value.querySelector<HTMLElement>('#fcb-dialog-content');
    const explicitAutofocus = contentRoot?.querySelector<HTMLElement>('[data-dialog-autofocus], [autofocus]');
    if (explicitAutofocus && !explicitAutofocus.hasAttribute('disabled')) {
      explicitAutofocus.focus();
      return;
    }

    // Second priority: if there's a standard input in the content, focus it (better UX for input dialogs).
    const firstField = contentRoot?.querySelector<HTMLElement>(
      'input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"]'
    );
    if (firstField) {
      firstField.focus();
      return;
    }

    // Prefer focusing the enabled default button.
    const defaultButtonEl = dialogRef.value.querySelector<HTMLButtonElement>('.fcb-dialog-button.default:not(:disabled)');
    if (defaultButtonEl) {
      defaultButtonEl.focus();
      return;
    }

    // Otherwise focus the first sensible focus target.
    const firstFocusable = dialogRef.value.querySelector<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
      return;
    }

    // As a last resort, focus the dialog container itself.
    dialogRef.value.focus();
  };

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

  watch(show, (newValue) => {
    if (newValue) {
      document.addEventListener('keydown', onDocumentKeydown, true);
      void focusDefaultAction();
    } else {
      document.removeEventListener('keydown', onDocumentKeydown, true);
    }
  }, { immediate: true });

  ////////////////////////////////
  // lifecycle events
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onDocumentKeydown, true);
  });

</script>

<style lang="scss">

  .window-content:has(.fcb-dialog) {
    // this causes all sorts of problems when in dark mode, so let's turn it off
    backdrop-filter: unset;
  }

  .fcb-dialog {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    font-size: var(--fcb-font-size-large);
    width: 550px;
    max-width: 90%;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    overflow: visible;

    .fcb-window-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 0 0 36px;
      gap: 0;
      padding: 0 10px;

      .header-button.close {
        flex: 0 0 auto;
        text-align: right;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border-radius: 4px;
        transition: all 0.2s ease;

        i {
          font-size: var(--fcb-font-size-large);
        }

        .close-text {
          font-size: var(--fcb-font-size-large);
        }
      }

      .fcb-window-title {
        margin: 0;
        font-weight: 600;
      }
    }

    .window-content {
      display: flex;
      flex-direction: column;
      padding: 0px 8px 5px 8px;
      gap: 16px;
      overflow: visible;
      background-color: var(--fcb-surface);

      // this is an ID so that we get css priority
      #fcb-dialog-content {
        font-size: var(--fcb-font-size-large);
        width: 100%;
        overflow: visible !important; // allow typeaheads to come out

        input, textarea {
          font-size: var(--fcb-font-size-large) !important;
        }

        @include style-base-components;
      }

      .fcb-dialog-buttons {
        margin: 0;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 10px;
        padding-bottom: 3px;

        .fcb-dialog-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 100px;
          font-size: var(--fcb-font-size-large);
          color: var(--fcb-button-color);
          background: var(--fcb-button-bg);
          border-radius: 3px;
          padding: 1px 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          border: 2px groove solid var(--fcb-button-border);

            &:hover:not(:disabled) {
              border-color: var(--fcb-button-border-hover);
              box-shadow: 0 0 5px var(--fcb-accent);
              background: var(--fcb-button-bg-hover);
              color: var(--fcb-button-color-hover);
            }

          &.default {
            background: var(--fcb-primary);
            border: 2px groove solid rgb(201, 199, 184);
            color: var(--fcb-text-on-primary);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          i {
            font-size: var(--fcb-font-size-large);
          }
        }
      }
    }
  }
</style>
