<template>
  <!-- an entry node beneath a topic -- don't show children -->
  <li v-if="filterNodes[props.topic]?.includes(props.node.id)">
    <div 
      :class="`${props.node.id===currentEntry?.uuid ? 'fcb-current-directory-entry' : 'fcb-directory-entry'}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick"
      @dragstart="onDragStart"
      @contextmenu="onEntryContextMenu"
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
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { toTopic } from '@/utils/misc';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components

  // types
  import { ValidTopic } from '@/types';
  import { DirectoryTypeEntryNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    node: {
      type: Object as PropType<DirectoryTypeEntryNode>,
      required: true,
    },
    typeName: {
      type: String,
      required: true,
    },
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  const { currentEntry, currentWorld } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(topicDirectoryStore);

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
    event.stopPropagation();
    
    if (!currentWorld.value) { 
      event.preventDefault();
      return;
    }

    // need to get the type and topic so we can compare when dropping
    const topicElement = (event.currentTarget as HTMLElement).closest('.fcb-topic-folder') as HTMLElement | null;
    if (!topicElement || !topicElement.dataset.topic) {
      event.preventDefault();
      return;
    }

    const dragData = { 
      typeNode: true,
      topic: toTopic(topicElement.dataset.topic),
      name: props.typeName,
      id: props.node.id,
    } as { typeNode: true, topic: ValidTopic; name: string; id: string};

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onEntryContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.directoryEntry.delete'), 
          onClick: async () => {
            await topicDirectoryStore.deleteEntry(props.topic, props.node.id);
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