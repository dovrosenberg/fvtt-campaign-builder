<template>
  <DirectoryNodeWithChildren 
    v-if="props.node.children.length" 
    :node="props.node"
    :world-id="props.worldId"
    :topic="props.topic"
    :pack-id="props.packId"
    :top="props.top"
  />
  <li v-else-if="filterNodes[packId]?.includes(props.node.id)">
    <div 
      :class="`${props.node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick($event)"
      @dragstart="onDragStart($event)"
      @drop="onDrop($event)"
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
  import { useDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
  import { getGame, localize } from '@/utils/game';
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
  import { hasHierarchy, validParentItems } from '@/utils/hierarchy';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DirectoryNodeWithChildren from './DirectoryNodeWithChildren.vue';

  // types
  import { DirectoryNode, Topic } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    worldId: {
      type: String,
      required: true
    },
    topic: {
      type: Number as PropType<Topic>,
      required: true
    },
    packId: {
      type: String,
      required: true
    },
    node: { 
      type: Object as PropType<DirectoryNode>,
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
  const directoryStore = useDirectoryStore();
  const mainStore = useMainStore();
  const { currentWorldId, currentEntryId } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(directoryStore);
  
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
    if (!currentWorldId.value) { 
      event.preventDefault();
      return;
    }

    const dragData = { 
      topic:  props.topic,
      childId: props.node.id,
    } as { topic: Topic; childId: string};

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onDrop = async (event: DragEvent): Promise<boolean> => {
    if (!currentWorldId.value)
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

    // get the pack
    const packId = WorldFlags.get(currentWorldId.value, WorldFlagKey.compendia)[props.topic];
    const pack = getGame().packs?.get(packId);

    if (!pack)
      return false;

    // is this a legal parent?
    const childEntry = await globalThis.fromUuid(data.childId) as globalThis.JournalEntry | null;

    if (!childEntry)
      return false;

    if (!(await validParentItems(childEntry)).includes(parentId))
      return false;

    // add the dropped item as a child on the other  (will also refresh the tree)
    await directoryStore.setNodeParent(pack, data.childId, parentId);

    return true;
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
          label: localize(`fwb.contextMenus.topicFolder.create.${props.topic}`) + ' as child', 
          onClick: async () => {
            // get the right folder
            const worldFolder = getGame().folders?.find((f)=>f.uuid===props.worldId) as globalThis.Folder;

            if (!worldFolder || !props.topic)
              throw new Error('Invalid header in DirectoryNode.onEntryContextMenu.onClick');

            const entry = await directoryStore.createEntry(worldFolder, props.topic, { parentId: props.node.id} );

            if (entry) {
              await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.directoryEntry.delete'), 
          onClick: async () => {
            await directoryStore.deleteEntry(props.node.id);
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