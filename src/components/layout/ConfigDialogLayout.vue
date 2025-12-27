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
  <section class="config-dialog-layout">
    <header class="config-dialog-header">
      <slot name="header"></slot>
    </header>
    
    <main class="config-dialog-content">
      <slot name="scrollSection"></slot>
    </main>
    
    <footer class="config-dialog-footer">
      <slot name="footer"></slot>
    </footer>
  </section>
</template>

<script setup lang="ts">
  // library imports
  // none

  // local imports
  // none

  // library components
  // none

  // local components
  // none

  // types
  // none

  ////////////////////////////////
  // props
  // none

  ////////////////////////////////
  // emits
  // none

  ////////////////////////////////
  // store
  // none

  ////////////////////////////////
  // data
  // none

  ////////////////////////////////
  // computed data
  // none

  ////////////////////////////////
  // methods
  // none

  ////////////////////////////////
  // event handlers
  // none

  ////////////////////////////////
  // watchers
  // none

  ////////////////////////////////
  // lifecycle hooks
  // none
</script>

<style lang="scss" scoped>
.config-dialog-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-dialog-header {
  flex: 0 0 auto;
  padding: 0.5rem 0;
}

.config-dialog-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 0.75rem 0.75rem 0.75rem;
}

.config-dialog-footer {
  flex: 0 0 auto;
  padding: 0.75rem 0.75rem 0.75rem 0.75rem;
  background-color: var(--fcb-surface);
  border-top: 1px solid var(--color-border-light);
}
</style>
