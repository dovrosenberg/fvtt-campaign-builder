<!--
ConfigDialogLayout: A reusable layout component for configuration dialogs

Purpose
- Provides a consistent 3-section layout for dialogs with header, scrollable content, and footer

Responsibilities
- Manages flex layout to keep footer at bottom
- Makes scrollSection scrollable when content overflows
- Handles proper spacing and sizing

Props
- None

Emits
- None

Slots
- header: Contains dialog header content (tabs, selectors, etc.)
- scrollSection: Contains the main scrollable content
- footer: Contains action buttons (save, reset, etc.)

Dependencies
- None

-->

<template>
  <section class="standard-form config-dialog-layout">
    <div ref="rootEl" class="fcb-sheet-subtab-container">
      <div class="fcb-subtab-wrapper">
        <header class="config-dialog-header">
          <slot name="header"></slot>
        </header>
        
          <main class="config-dialog-content">
            <slot name="scrollSection"></slot>
        </main>
      </div>
    </div>

    <footer class="config-dialog-footer">
      <footer class="form-footer" data-application-part="footer">
        <slot name="footer"></slot>
      </footer>
    </footer>
  </section>
</template>

<script setup lang="ts">
  // library imports
  import { ref } from 'vue';

  // local imports

  // library components

  // local components

  // types

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const rootEl = ref<HTMLElement>();

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks

  // Expose contentRef to parent
  defineExpose({
    rootEl
  });
</script>

<style lang="scss" scoped>
.config-dialog-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0; /* ensures children can shrink in some environments */
}

/* These wrappers must become the "flex:1" region between header/footer
  and must allow descendants to shrink. */
.fcb-sheet-subtab-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.fcb-subtab-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 10px;
}

.config-dialog-header {
  flex: 0 0 auto;
}

.config-dialog-content {
  flex: 1 1 auto;
  min-height: 0;     /* critical for scrolling flex children */
  overflow: auto;    /* only main scrolls */
  padding-bottom: 0.75rem;
}

.config-dialog-footer {
  flex: 0 0 auto;
  padding: 0.75rem;
  background-color: var(--fcb-surface);
  border-top: 1px solid var(--color-border-light);
}

/* Remove padding when window-content directly wraps config-dialog-layout */
:global(.window-content:has(> .config-dialog-layout)) {
  padding: 0;
}
</style>
