<template>
  <DirectoryNodeWithChildren 
    v-if="props.node.children.length" 
    :node="props.node"
    :expanded="props.node.expanded"
    :top="props.top"
    @itemClicked="onSubItemClick"
  />
  <li v-else>
    <div 
      :class="`${props.node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
      draggable="true"
      @click="onDirectoryItemClick($event, props.node)"
      @dragstart="onDragStart($event, node.id)"
      @drop="onDrop($event, node.id)"
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
  import { getGame } from '@/utils/game';
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
  import { hasHierarchy, validParentItems } from '@/utils/hierarchy';

  // library components

  // local components
  import DirectoryNodeWithChildren from './DirectoryNodeWithChildren.vue';

  // types
  import { DirectoryNode, Topic } from '@/types';

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
  const itemClicked = async (node: DirectoryNode, ctrlKey: boolean): Promise<void> => {
    // TODO - in a perfect world, clicking the +/- would toggle but not open the entry
    // for now, only open the entry when we're expanding, not when we're closing
    if (!node.expanded) {
      await navigationStore.openEntry(node.id, {newTab: ctrlKey});
    }

    await directoryStore.toggleEntry(node);
  };

  ////////////////////////////////
  // event handlers
  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryNode) => {
    event.preventDefault();  // stop from expanding
    event.stopPropagation();

    await itemClicked(node, event.ctrlKey);
  };

  const onSubItemClick = async (node: DirectoryNode, ctrlKey: boolean) => {
    await itemClicked(node, ctrlKey);
  };

  // handle an entry dragging to another to nest
  const onDragStart = (event: DragEvent, id: string): void => {
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
      childId: id,
    } as { topic: Topic, childId: string};

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onDrop = async (event: DragEvent, parentId: string): Promise<boolean> => {
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

    // add the dropped item as a child on the other
    await directoryStore.setNodeParent(pack, data.childId, parentId);

    await directoryStore.refreshCurrentTree();

    return true;
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
</style>