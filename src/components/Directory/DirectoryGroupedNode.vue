<template>
  <li>
    <div 
      :class="`${props.node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick($event, props.node)"
      @dragstart="onDragStart($event, props.node.id)"
      @drop="onDrop($event, props.node.id)"
    >
      {{ props.node.name }}
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useNavigationStore } from '@/applications/stores';

  // library components

  // local components

  // types
  import { DirectoryEntryNode, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    node: {
      type: Object as PropType<DirectoryEntryNode>,
      required: true,
    },
  });
  
  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentEntryId } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryEntryNode) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(node.id, {newTab: event.ctrlKey});
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>