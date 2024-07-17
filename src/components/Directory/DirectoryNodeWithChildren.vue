<template>
  <li>
    <div 
      class="details"
      :open="currentNode.expanded"
    >
      <div :class="'summary ' + (props.top ? 'top' : '')">      
        <div 
          class="fwb-directory-expand-button"
          @click="onEntryToggleClick"
        >
          <span v-if="currentNode.expanded">-</span><span v-else>+</span>
        </div>
        <div 
          :class="`${currentNode.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
          draggable="true"
          @click="onDirectoryItemClick($event, currentNode)"
          @dragstart="onDragStart($event, currentNode.id)"
          @drop="onDrop($event, currentNode.id)"
        >
          {{ currentNode.name }}
        </div>
      </div>
      <ul>
        <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
        <div v-if="currentNode.expanded">
          <DirectoryNodeComponent 
            v-for="child in currentNode.loadedChildren"
            :key="child.id"
            :node="child"
            :top="false"
          />
        </div>
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
  import { hasHierarchy, validParentItems } from '@/utils/hierarchy';
  import { getGame } from '@/utils/game';
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';

  // library components

  // local components
  import DirectoryNodeComponent from './DirectoryNode.vue';

  // types
  import { DirectoryNode, Topic } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    node: { 
      type: Object as PropType<DirectoryNode>,
      required: true,
    },
    top: {    // applies class to top level
      type: Boolean,
      required: true,
    }
  });

  ////////////////////////////////
  // emits
  
  ////////////////////////////////
  // store
  const directoryStore = useDirectoryStore();
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorldId, currentEntryId } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleEntry we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryNode>(props.node);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onEntryToggleClick = async (event: MouseEvent) => {
    // get the pack id
    const packId = event.target?.closest('.fwb-topic-folder').dataset.packId;

    currentNode.value = await directoryStore.toggleEntry(packId, currentNode.value, !currentNode.value.expanded);
  };

  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryNode) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(node.id, {newTab: event.ctrlKey});
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

    // add the dropped item as a child on the other (will also refresh the tree)
    await directoryStore.setNodeParent(pack, data.childId, parentId);

    return true;
  };


  ////////////////////////////////
  // watchers
  watch(()=> props.node, (newValue: DirectoryNode) => {
    currentNode.value = newValue;
  });

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>

</style>