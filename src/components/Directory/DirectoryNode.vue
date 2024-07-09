<template>
  <li>
    <DirectoryNodeWithChildren 
      v-if="props.node.children.length && props.node.expanded" 
      :node="props.node"
      @itemClicked="onSubItemClick"
    />
    <div 
      v-else
      class="directory-item" 
      @click="onDirectoryItemClick($event, props.node.id)"
    >
      {{ props.node.name }}
    </div>
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
  const onDirectoryItemClick = (event: JQuery.ClickEvent, value: string) => {
    event.preventDefault();  // stop from expanding
    emit('itemClicked', value);
  };

  const onSubItemClick = (value: string) => {
    emit('itemClicked', value);
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">

</style>