<template>
  <TopicDirectoryNodeWithChildren 
    v-if="props.node.children.length && filterNodes[props.topic]?.includes(props.node.id)" 
    :node="props.node"
    :world-id="props.worldId"
    :topic="props.topic"
    :top="props.top"
  />
  <li v-else-if="filterNodes[props.topic]?.includes(props.node.id)">
    <div 
      :class="`${props.node.id===currentEntry?.uuid ? 'fcb-current-directory-entry' : 'fcb-directory-entry'}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick"
      @dragstart="onDragStart($event, props.node.id, props.node.name)"
      @drop="onDrop"
      @dragover="onDragover"
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
  import { hasHierarchy, validParentItems } from '@/utils/hierarchy';
  import { getValidatedData } from '@/utils/dragdrop';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import TopicDirectoryNodeWithChildren from './TopicDirectoryNodeWithChildren.vue';
  
  // types
  import { ValidTopic } from '@/types';
  import { DirectoryEntryNode, Entry, WBWorld, TopicFolder } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    worldId: {
      type: String,
      required: true
    },
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true
    },
    node: { 
      type: Object as PropType<DirectoryEntryNode>,
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
  const topicDirectoryStore = useTopicDirectoryStore();
  const mainStore = useMainStore();
  const { currentWorld, currentEntry, } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(topicDirectoryStore);
  
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

  // handle an entry dragging to another to nest
  const onDragStart = (event: DragEvent, id: string, name: string): void => {
    event.stopPropagation();
    
    if (!currentWorld.value) { 
      event.preventDefault();
      return;
    }

    const dragData = { 
      entryNode: true,
      topic: props.topic,
      name: name,
      childId: id,
    } as { topic: ValidTopic; name: string; childId: string};

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();  

    if (!currentWorld.value)
        return;

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    const topicFolder = currentWorld.value?.topicFolders[props.topic];

    // make sure it's not the same item
    const parentId = props.node.id;
    if (data.childId===parentId)
      return;

    // if the types don't match or don't have hierarchy, can't drop
    if (data.topic!==props.topic || !hasHierarchy(props.topic))
      return;

    // is this a legal parent?
    const childEntry = await Entry.fromUuid(data.childId, topicFolder as TopicFolder);

    if (!childEntry)
      return;

    if (!(validParentItems(currentWorld.value as WBWorld, childEntry)).find(e=>e.id===parentId))
      return;

    // add the dropped item as a child on the other  (will also refresh the tree)
    await topicDirectoryStore.setNodeParent(topicFolder as TopicFolder, data.childId, parentId);
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
      items: topicDirectoryStore.getTopicNodeContextMenuItems(
        props.topic, 
        props.node.id
      )
    });
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
</style>