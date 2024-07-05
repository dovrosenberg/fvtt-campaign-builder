<template>
  <details 
    :open="props.node.expanded">
    <summary>      
      <div class="tree-item" 
        @click="onTreeItemClick($event, value)"
      >{{props.node.text}}</div>
    </summary>
    <ul>
      <TreeNodeComponent v-for="node in props.node.children"
        :node="node"
        @itemClicked="onSubItemClick"
      />
    </ul>
  </details>
</template>

<script setup lang="ts">
  // library imports
  import { PropType } from 'vue';
  // local imports

  // library components

  // local components
  import TreeNodeComponent from './TreeNode.vue';

  // types
  import { TreeNode } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    node: { 
      type: Object as PropType<TreeNode>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'itemClicked', value: string): void,
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
  const onTreeItemClick = (event: JQuery.ClickEvent, value: string) => {
    event.preventDefault();  // stop from expanding
    emit('itemClicked', value);
  }

  const onSubItemClick = (event: JQuery.ClickEvent, value: string) => {
    event.preventDefault();  // stop from expanding
    emit('itemClicked', value);
  }

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">

</style>