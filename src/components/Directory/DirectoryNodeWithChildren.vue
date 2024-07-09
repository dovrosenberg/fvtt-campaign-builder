<template>
  <details :open="props.expanded">
    <summary>      
      <div 
        class="directory-item" 
        @click="onDirectoryItemClick($event, props.node.id)"
      >
        {{ props.node.name }}
      </div>
    </summary>
    <ul>
      <NodeComponent 
        v-for="child in props.node.loadedChildren"
        :key="child.id"
        :node="child"
        :expanded="child.expanded"
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
  import NodeComponent from './DirectoryNode.vue';

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