<template>
  <li>
    <div 
      class="details"
      :open="currentNode.expanded"
    >
      <div :class="'summary ' + (props.top ? 'top' : '')">      
        <div 
          class="wcb-directory-expand-button"
          @click="onEntryToggleClick"
        >
          <span v-if="currentNode.expanded">-</span><span v-else>+</span>
        </div>
        <div 
          :class="`${currentNode.id===currentEntry?.uuid ? 'wcb-current-directory-entry' : ''}`"
          draggable="true"
          @click="onDirectoryItemClick($event, currentNode as DirectoryEntryNode)"
          @dragstart="onDragStart($event, currentNode.id)"
          @drop="onDrop"
          @dragover="onDragover"
          @contextmenu="onEntryContextMenu"
        >
          {{ currentNode.name }}
        </div>
      </div>
      <ul>
        <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
        <div v-if="currentNode.expanded">
          <TopicDirectoryNodeComponent 
            v-for="child in sortedChildren"
            :key="child.id"
            :node="child"
            :world-id="props.worldId"
            :topic="props.topic"
            :top="false"
          />
        </div>
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { hasHierarchy, validParentItems } from '@/utils/hierarchy';
  import { localize } from '@/utils/game';
  import { getValidatedData } from '@/utils/dragdrop';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import TopicDirectoryNodeComponent from './TopicDirectoryNode.vue';

  // types
  import { ValidTopic } from '@/types';
  import { Entry, DirectoryEntryNode, WBWorld, TopicFolder } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    node: { 
      type: Object as PropType<DirectoryEntryNode>,
      required: true,
    },
    worldId: {
      type: String,
      required: true
    },
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true
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
  const topicDirectoryStore = useTopicDirectoryStore();
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorld, currentEntry, } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleWithLoad we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryEntryNode>(props.node);

  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectoryEntryNode[] => {
    const children = (currentNode.value).loadedChildren;
    return children.sort((a, b) => a.name.localeCompare(b.name)) as DirectoryEntryNode[];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onEntryToggleClick = async (_event: MouseEvent) => {
    // it returns the same node, so vue doesn't necessarily realize it needs to rerender without a new copy
    currentNode.value = await topicDirectoryStore.toggleWithLoad(currentNode.value as DirectoryEntryNode, !currentNode.value.expanded);
    await topicDirectoryStore.refreshTopicDirectoryTree([currentNode.value.id]);
  };

  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryEntryNode) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(node.id, {newTab: event.ctrlKey});
  };

  
  // handle an entry dragging to another to nest
  const onDragStart = (event: DragEvent, id: string): void => {
    if (!currentWorld.value) { 
      event.preventDefault();
      return;
    }

    const dragData = { 
      topic:  props.topic,
      childId: id,
    } as { topic: ValidTopic; childId: string};

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
      return false;

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's not the same item
    const parentId = currentNode.value.id;
    if (data.childId===parentId)
      return;

    // if the types don't match or don't have hierarchy, can't drop
    if (data.topic!==props.topic || !hasHierarchy(props.topic))
      return;

    // is this a legal parent?
    const topicFolder = currentWorld.value.topicFolders[props.topic];
    const childEntry = await Entry.fromUuid(data.childId, topicFolder as TopicFolder); 
    
    if (!childEntry)
      return;

    if (!(validParentItems(currentWorld.value as WBWorld, childEntry)).find(e=>e.id===parentId))
      return;

    // add the dropped item as a child on the other (will also refresh the tree)
    await topicDirectoryStore.setNodeParent(topicFolder as TopicFolder, data.childId, parentId);
  };

  const onEntryContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    if (!currentWorld.value)
      return;

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'wcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: topicDirectoryStore.getTopicNodeContextMenuItems(props.topic, props.node.id)
    });
  };

  ////////////////////////////////
  // watchers
  watch(()=> props.node, (newValue: DirectoryEntryNode) => {
    currentNode.value = newValue;
  });

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>

</style>