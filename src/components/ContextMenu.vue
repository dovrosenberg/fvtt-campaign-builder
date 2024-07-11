<template>
  <div
    class="fixed h-1/3 z-50 context-menu"
    :style="{ top: y + 'px', left: x + 'px' }"
  >
    <div
      v-for="action in actions"
      :key="action.action"
      @click="emitAction(action.action)"
    >
      {{ action.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, defineProps, defineEmits } from 'vue';

  // local imports

  // library components

  // local components

  // types

  ////////////////////////////////
  // props
  const { actions, x, y } = defineProps(['actions', 'x', 'y']);

  ////////////////////////////////
  // emits
  const emit = defineEmits(['action-clicked']);

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const emitAction = (action) => {
    emit('action-clicked', action);
  };

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
  .context-menu {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    min-width: 150px;
  }

  .context-menu div {
    padding: 10px;
    cursor: pointer;
  }

  .context-menu div:hover {
    background-color: #f0f0f0;
  }
</style>