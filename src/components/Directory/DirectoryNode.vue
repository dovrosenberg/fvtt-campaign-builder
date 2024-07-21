<template>
  <DirectoryNodeWithChildren 
    v-if="props.node.children.length" 
    :node="props.node"
    :world-id="props.worldId"
    :topic="props.topic"
    :search-text="props.searchText"
    :top="props.top"
  />
  <li v-else>
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
    searchText: {
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

    // need to get the type so we can compare when dropping
    const packElement = (event.currentTarget as HTMLElement).closest('.fwb-topic-folder') as HTMLElement | null;
    if (!packElement || !packElement.dataset.packId) {
      event.preventDefault();
      return;
    }

    const topic = WorldFlags.get(currentWorldId.value, WorldFlagKey.packTopics)[packElement.dataset.packId];
    const dragData = { 
      topic:  topic,
      childId: props.node.id,
    } as { topic: Topic, childId: string};

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

    // get the type on the new item
    const packElement = (event.currentTarget as HTMLElement).closest('.fwb-topic-folder') as HTMLElement | null;
    if (!packElement || !packElement.dataset.packId) {
      return false;
    }

    const topic = WorldFlags.get(currentWorldId.value, WorldFlagKey.packTopics)[packElement.dataset.packId];

    // if the types don't match or don't have hierarchy, can't drop
    if (data.topic!==topic || !hasHierarchy(topic))
      return false;

    // get the pack
    const packId = WorldFlags.get(currentWorldId.value, WorldFlagKey.compendia)[topic];
    const pack = getGame().packs.get(packId);

    if (!pack)
      return false;

    // is this a legal parent?
    const childEntry = await fromUuid(data.childId) as JournalEntry | null;

    if (!childEntry)
      return false;

    if (!(await validParentItems(pack, childEntry)).includes(parentId))
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
            const worldFolder = getGame().folders?.find((f)=>f.uuid===props.worldId) as Folder;

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
            await directoryStore.deleteEntry(props.node.id)
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