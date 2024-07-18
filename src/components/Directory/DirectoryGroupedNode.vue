<template>
  <li>
    <div 
      :class="`${props.node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick($event)"
      @dragstart="onDragStart($event)"
      @drop="()=>false"
    >
      {{ props.node.name }}
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';

  // library components

  // local components

  // types
  import { DirectoryEntryNode, Topic, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    node: {
      type: Object as PropType<DirectoryEntryNode>,
      required: true,
    },
    typeName: {
      type: String,
      required: true,
    }
  });
  
  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentEntryId, currentWorldId } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  
  ////////////////////////////////
  // event handlers
  const onDirectoryItemClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(props.node.id, {newTab: event.ctrlKey});
  };

  const onDragStart = (event: DragEvent): void => {
    if (!currentWorldId.value) { 
      event.preventDefault();
      return;
    }

    // need to get the type and topic so we can compare when dropping
    const packElement = (event.currentTarget as HTMLElement).closest('.fwb-topic-folder') as HTMLElement | null;
    if (!packElement || !packElement.dataset.packId) {
      event.preventDefault();
      return;
    }

    const topic = WorldFlags.get(currentWorldId.value, WorldFlagKey.packTopics)[packElement.dataset.packId];

    const dragData = { 
      topic: topic,
      typeName: props.typeName,
      id: props.node.id,
    } as { topic: Topic, typeName: string, id: string};

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>