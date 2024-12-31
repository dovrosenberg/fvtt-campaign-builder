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
      :class="`${props.node.id===currentEntry?.uuid ? 'fwb-current-directory-entry' : ''}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick"
      @dragstart="onDragStart"
      @drop="onDrop"
      @contextmenu="onEntryContextMenu"
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
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { hasHierarchy, validParentItems } from '@/utils/hierarchy';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import TopicDirectoryNodeWithChildren from './TopicDirectoryNodeWithChildren.vue';

  // types
  import { ValidTopic } from '@/types';
  import { DirectoryEntryNode, Entry, WBWorld } from '@/classes';

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
  const onDragStart = (event: DragEvent): void => {
    if (!currentWorld.value) { 
      event.preventDefault();
      return;
    }

    const dragData = { 
      topic:  props.topic,
      childId: props.node.id,
    } as { topic: ValidTopic; childId: string};

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onDrop = async (event: DragEvent): Promise<boolean> => {
    const topicFolder = currentWorld.value?.topicFolders[props.topic];

    if (event.dataTransfer?.types[0]==='text/plain') {
      if (!currentWorld.value)
        return false;

      let data;
      try {
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
      }
      catch (err) {
        return false;
      }

      // make sure it's not the same item
      const parentId = props.node.id;
      if (data.childId===parentId)
        return false;

      // if the types don't match or don't have hierarchy, can't drop
      if (data.topic!==props.topic || !hasHierarchy(props.topic))
        return false;

      // is this a legal parent?
      const childEntry = await Entry.fromUuid(data.childId, topicFolder);

      if (!childEntry)
        return false;

      if (!(validParentItems(currentWorld.value as WBWorld, topicFolder, childEntry)).find(e=>e.id===parentId))
        return false;

      // add the dropped item as a child on the other  (will also refresh the tree)
      await topicDirectoryStore.setNodeParent(topicFolder, data.childId, parentId);

      return true;
    } else {
      return false;
    }
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
          icon: 'fa-atlas',
          iconFontClass: 'fas',
          label: localize(`contextMenus.topicFolder.create.${props.topic}`) + ' as child', 

          onClick: async () => {
            if (!currentWorld.value)
              return;

            const topicFolder = currentWorld.value.topicFolders[props.topic];

            // get the right folder
            const worldFolder = game.folders?.find((f)=>f.uuid===props.worldId) as globalThis.Folder;

            if (!worldFolder || !topicFolder)
              throw new Error('Invalid header in TopicDirectoryNode.onEntryContextMenu.onClick');

            const entry = await topicDirectoryStore.createEntry(topicFolder, { parentId: props.node.id} );

            if (entry) {
              await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.directoryEntry.delete'), 
          onClick: async () => {
            await topicDirectoryStore.deleteEntry(props.topic, props.node.id);
          }
        },
      ].filter((item)=>(hasHierarchy(props.topic) || item.icon!=='fa-atlas'))

      // the line above is to remove the "add child" option from entries that don't have hierarchy
      // not really ideal but a bit cleaner than having two separate arrays and concatening
    });
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
</style>