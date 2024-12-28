<template>
  <!-- this is just a <ul> wrapper around the a type node in the type-grouped tree-->
  <ul class="fwb-directory-tree">
    <TopicDirectoryGroupedType
      v-for="type in sortedTypes"
      :key="type.id"
      :type="type"
      :world-id="props.worldId"
      :topic="props.topicNode.topicFolder.topic"
    />
  </ul>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, } from 'vue';

  // local imports

  // library components

  // local components
  import TopicDirectoryGroupedType from './TopicDirectoryGroupedType.vue';

  // types
  import { DirectoryTopicNode, DirectoryTypeNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    topicNode: {
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
  const sortedTypes = computed((): DirectoryTypeNode[] => {
    const types = props.topicNode.loadedTypes;
    return types.sort((a, b) => a.name.localeCompare(b.name));
  });

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