<template>
  <ul class="fcb-directory-tree">
    <NodeComponent 
      v-for="node in sortedChildren"
      :key="node.id"
      :node="node" 
      :world-id="props.worldId"
      :topic="props.topicNode.topicFolder.topic"
      :pack-id="props.topicNode.topicFolder.uuid"
      :top="true"
      class="fcb-entry-item" 
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
  import NodeComponent from './SettingDirectoryNode.vue';

  // types
  import { DirectoryEntryNode, DirectoryTopicNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    topicNode: {
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
    const children = (props.topicNode).loadedChildren;
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