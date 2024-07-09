<template>
  <li>
    <details :open="props.expanded">
      <summary :class="(props.top ? 'top' : '')">      
        <div @click="onDirectoryItemClick($event, props.node)">
          {{ props.node.name }}
        </div>
      </summary>
      <ul>
        <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
        <div v-if="props.expanded">
          <NodeComponent 
            v-for="child in props.node.loadedChildren"
            :key="child.id"
            :node="child"
            :expanded="child.expanded"
            :top="false"
            @itemClicked="onSubItemClick"
          />
        </div>
      </ul>
    </details>
  </li>
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
    },
    top: {    // applies class to top level
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