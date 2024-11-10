<template>
  <ul class="fwb-directory-tree">
    <DirectoryGroupedType
      v-for="type in props.topic.loadedTypes"
      :key="type.id"
      :type="type"
      :world-id="props.worldId"
      :topic="props.topic"
    />
  </ul>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, } from 'vue';

  // local imports

  // library components

  // local components
  import DirectoryGroupedType from './DirectoryGroupedType.vue';

  // types
  import { DirectoryTopicNode, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    topic: {
      type: Object as PropType<DirectoryTopicNode>,
      required: true,
    }, 
    worldId: {
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