<template>
  <ul class="fwb-directory-tree">
    <TopicDirectoryGroupedType
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
  import TopicDirectoryGroupedType from './TopicDirectoryGroupedType.vue';

  // types
  import { DirectoryTopicNode, } from '@/classes';
  
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