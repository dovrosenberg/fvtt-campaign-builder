<template>
  <li>
    <TreeNodeWithChildren 
      v-if="props.node.children.length" 
      :node="props.node"
      @itemClicked="onSubItemClick"
    />
    <div v-else
      class="tree-item" 
      @click="onTreeItemClick($event, props.node.value)"
    >
      {{props.node.text}}
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType } from 'vue';

  // local imports

  // library components

  // local components
  import TreeNodeWithChildren from './TreeNodeWithChildren.vue';

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
  const onTreeItemClick = (event: MouseEvent, value: string) => {
    event.preventDefault();  // stop from expanding
    emit('itemClicked', value);
  }

  const onSubItemClick = (event: MouseEvent, value: string) => {
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