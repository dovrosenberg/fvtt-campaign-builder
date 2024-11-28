<template>
  <TopicDirectoryNodeWithChildren 
    v-if="props.node.children.length" 
    :node="props.node"
    :world-id="props.worldId"
    :topic="props.topic"
    :top="props.top"
  />
  <li v-else-if="filterNodes[props.topic]?.includes(props.node.id)">
    <div 
      :class="`${props.node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick($event)"
      @contextmenu="onEntryContextMenu($event)"
    >
      {{ props.node.name }}
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore, useCurrentEntryStore } from '@/applications/stores';
  
  // library components
  
  // local components

  // types
  import { ValidTopic } from '@/types';
  import { DirectoryEntryNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    worldId: {
      type: String,
      required: true
    },
    node: { 
      type: Object as PropType<SessionDirectoryNode>,
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
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const mainStore = useMainStore();
  const { currentEntryId, } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(campaignDirectoryStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  // select an entry

  ////////////////////////////////
  // event handlers
  const onDirectoryItemClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(props.node.id, {newTab: event.ctrlKey});
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
</style>