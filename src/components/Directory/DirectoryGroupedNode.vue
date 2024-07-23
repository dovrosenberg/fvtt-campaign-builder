<template>
  <li v-if="filterNodes[props.packId].includes(props.node.id)">
    <div 
      :class="`${props.node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick($event)"
      @dragstart="onDragStart($event)"
      @drop="()=>false"
      @contextmenu="onEntryContextMenu($event)"
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
  import { useDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
  import { PackFlagKey, PackFlags } from '@/settings/PackFlags';
  import { localize } from '@/utils/game';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

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
    },
    packId: {
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
  const directoryStore = useDirectoryStore();
  const { currentEntryId, currentWorldId } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(directoryStore);

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

    const topic = PackFlags.get(packElement.dataset.packId, PackFlagKey.topic);

    const dragData = { 
      topic: topic,
      typeName: props.typeName,
      id: props.node.id,
    } as { topic: Topic; typeName: string; id: string};

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onEntryContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.directoryEntry.delete'), 
          onClick: async () => {
            await directoryStore.deleteEntry(props.node.id);
          }
        },
      ]
    });
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>