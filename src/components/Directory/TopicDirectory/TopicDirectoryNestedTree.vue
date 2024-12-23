<template>
  <ul class="fwb-directory-tree">
    <NodeComponent 
      v-for="node in sortedChildren"
      :key="node.id"
      :node="node" 
      :world-id="props.worldId"
      :topic="props.topic.topic"
      :pack-id="props.topic.id"
      :top="true"
      class="fwb-entry-item" 
      draggable="true"
    />
  </ul>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, } from 'vue';

  // local imports

  // library components

  // local components
  import NodeComponent from './TopicDirectoryNode.vue';

  // types
  import { DirectoryEntryNode, DirectoryTopicNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    topic: {
      type: Object as PropType<DirectoryTopicNode>,
      required: true,
    }, 
    worldId: {
      type: String,
      required: true
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
  const sortedChildren = computed((): DirectoryEntryNode[] => {
    const children = (props.topic).loadedChildren;
    return children.sort((a, b) => a.name.localeCompare(b.name));
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