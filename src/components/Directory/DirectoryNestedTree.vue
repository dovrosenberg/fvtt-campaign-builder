<template>
  <ul class="fwb-directory-tree">
    <NodeComponent 
      v-for="node in props.pack.loadedTopNodes"
      :key="node.id"
      :node="node" 
      :world-id="props.worldId"
      :topic="props.pack.topic"
      :search-text="props.searchText"
      :top="true"
      class="fwb-entry-item" 
      draggable="true"
    />
  </ul>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, } from 'vue';

  // local imports

  // library components

  // local components
  import NodeComponent from './DirectoryNode.vue';

  // types
  import { DirectoryPack, Topic, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    pack: {
      type: Object as PropType<DirectoryPack>,
      required: true,
    }, 
    worldId: {
      type: String,
      required: true
    },
    searchText: {
      type: String,
      required: true,
    },
  });
  
  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>