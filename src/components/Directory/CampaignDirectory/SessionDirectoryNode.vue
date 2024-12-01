<template>
  <!-- <li v-if="true /*filterNodes[props.node.topic]?.includes(props.node.id)*/"> -->

  <li>
    <div 
      :class="`${props.sessionNode.id===currentSession?.uuid ? 'fwb-current-directory-entry' : ''}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onSessionClick"
    >
      {{ props.sessionNode.name }}
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useNavigationStore, } from '@/applications/stores';
  
  // library components
  
  // local components

  // types
  import { DirectorySessionNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    sessionNode: { 
      type: Object as PropType<DirectorySessionNode>,
      required: true,
    },
    top: {    // applies special class to top level
      type: Boolean,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { currentSession, } = storeToRefs(mainStore);
  // const { filterNodes } = storeToRefs(topicDirectoryStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  // select an entry

  ////////////////////////////////
  // event handlers
  const onSessionClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    // await navigationStore.openEntry(props.sessionNode.id, {newTab: event.ctrlKey});
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
</style>