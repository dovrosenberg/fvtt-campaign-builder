<template>
  <li>
    <details 
      :open="props.node.expanded"
      @click="onClickDetails"
      @toggle="onToggleDetails($event, props.node)"
    >
      <summary :class="(props.top ? 'top' : '')">      
        <div 
          :class="`${props.node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
          draggable="true"
          @click="onDirectoryItemClick($event, props.node)"
          @dragstart="onDragStart($event, props.node.id)"
          @drop="onDrop($event, props.node.id)"
        >
          {{ props.node.name }}
        </div>
      </summary>
      <ul>
        <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
        <div v-show="props.node.expanded">
          <DirectoryNodeComponent 
            v-for="child in props.node.loadedChildren"
            :key="child.id"
            :node="child"
            :top="false"
          />
        </div>
      </ul>
    </details>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType } from 'vue';
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

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const itemClicked = async (node: DirectoryNode, ctrlKey: boolean): Promise<void> => {
    await navigationStore.openEntry(node.id, {newTab: ctrlKey});
  };


  ////////////////////////////////
  // event handlers
  // prevent the base toggle functionality
  const onClickDetails = () => { 
    return false;
  };

  // we're toggling - make sure to load the kids nowprevent the base toggle functionality
  const onToggleDetails = async (event: ToggleEvent, node: DirectoryNode) => { 
    event.stopImmediatePropagation();
    await directoryStore.toggleEntry(node, event.newState==='open');
  };

  // this is only called by summary::before (i.e. the little circle) because other clicks
  //    are ignored on the summary
  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryNode) => {
    event.stopPropagation();
    event.preventDefault();
    
    await itemClicked(node, event.ctrlKey);
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

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
  details {
    pointer-events: none;

    summary {
      pointer-events: none;  // we block click on this element so that we can tell when the click is on the open/close circle

      &::before {
        pointer-events: auto;
      }

      div {
        pointer-events: auto;
      }
    }
  }
</style>