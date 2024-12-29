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
          :class="`${currentNode.id===currentEntry?.uuid ? 'fwb-current-directory-entry' : ''}`"
          draggable="true"
          @click="onDirectoryItemClick($event, currentNode)"
          @dragstart="onDragStart($event, currentNode.id)"
          @drop="onDrop"
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

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import TopicDirectoryNodeComponent from './TopicDirectoryNode.vue';

  // types
  import { Topics, ValidTopic } from '@/types';
  import { TopicFolder, Entry, DirectoryEntryNode, WBWorld, } from '@/classes';

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
      type: Number as PropType<Topics>,
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
    currentNode.value = await topicDirectoryStore.toggleWithLoad(currentNode.value, !currentNode.value.expanded);
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

  const onDrop = async (event: DragEvent): Promise<boolean> => {
    if (!currentWorld.value)
      return false;

    if (event.dataTransfer?.types[0]==='text/plain') {
      let data;

      try {
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
      }
      catch (err) {
        return false;
      }

      // make sure it's not the same item
      const parentId = currentNode.value.id;
      if (data.childId===parentId)
        return false;

      // if the types don't match or don't have hierarchy, can't drop
      if (data.topic!==props.topic || !hasHierarchy(props.topic))
        return false;

      // is this a legal parent?
      const topicFolder = currentWorld.value.topicFoldes[ptops.topic];
      const childEntry = await Entry.fromUuid(data.childId, topicFolder); 
      
      if (!childEntry)
        return false;

      if (!(validParentItems(currentWorld.value as WBWorld, topicFolder, childEntry)).find(e=>e.id===parentId))
        return false;

      // add the dropped item as a child on the other (will also refresh the tree)
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
    const topicFolder = currentWorld.value.topicFolders[props.topic];
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-atlas',
          iconFontClass: 'fas',
          label: localize(`contextMenus.topic.create.${props.topic}`) + ' as child', 
          onClick: async () => {
            // get the right folder
            const worldFolder = game.folders?.find((f)=>f.uuid===props.worldId) as globalThis.Folder;

            if (!worldFolder || !props.topic)
              throw new Error('Invalid header in TopicDirectoryNodeWithChildren.onEntryContextMenu.onClick');

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
            await topicDirectoryStore.deleteEntry(topicFolder, props.node.id);
          }
        },
      ].filter((item)=>(hasHierarchy(props.topic) || item.icon!=='fa-atlas'))
      // the line above is to remove the "add child" option from entries that don't have hierarchy
      // not really ideal but a bit cleaner than having two separate arrays and concatening

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