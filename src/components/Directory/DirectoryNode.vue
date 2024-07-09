<template>
  <DirectoryNodeWithChildren 
    v-if="props.node.children.length" 
    :node="props.node"
    :expanded="props.node.expanded"
    :top="props.top"
    @itemClicked="onSubItemClick"
  />
  <li
    v-else
    :class="(props.top ? 'top' : '')"
    @click="onDirectoryItemClick($event, props.node)"
  >
    {{ props.node.name }}
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType } from 'vue';

  // local imports

  // library components

  // local components
  import DirectoryNodeWithChildren from './DirectoryNodeWithChildren.vue';

  // types
  import { DirectoryNode } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    node: { 
      type: Object as PropType<DirectoryNode>,
      required: true,
    },
    expanded: { 
      type: Boolean,
      required: true,
    },
    top: {    // applies special class to top level
      type: Boolean,
      required: true,
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'itemClicked', node: DirectoryNode, ctrlKey: boolean): void,
  }>();

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
  const onDirectoryItemClick = (event: JQuery.ClickEvent, node: DirectoryNode) => {
    event.preventDefault();  // stop from expanding
    event.stopPropagation();

    emit('itemClicked', node, event.ctrlKey);
  };

  const onSubItemClick = (node: DirectoryNode, ctrlKey: boolean) => {
    emit('itemClicked', node, ctrlKey);
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">

</style>