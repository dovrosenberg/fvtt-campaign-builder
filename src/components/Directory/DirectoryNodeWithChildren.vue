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
          @drop="onDrop($event)"
          @contextmenu="onEntryContextMenu"
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
            :pack-id="props.packId"
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
  import { PropType, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useDirectoryStore, useMainStore, useNavigationStore, useCurrentEntryStore } from '@/applications/stores';
  import { hasHierarchy, validParentItems } from '@/utils/hierarchy';
  import { getGame, localize } from '@/utils/game';
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DirectoryNodeComponent from './DirectoryNode.vue';

  // types
  import { DirectoryEntryNode, Topic } from '@/types';

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
    packId: {
      type: String,
      required: true,
    },
    topic: {
      type: Number as PropType<Topic>,
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
  const directoryStore = useDirectoryStore();
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const currentEntryStore = useCurrentEntryStore();
  const { currentWorldId, currentEntryId } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleEntry we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryEntryNode>(props.node);

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

  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryEntryNode) => {
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

    const dragData = { 
      topic:  props.topic,
      childId: id,
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
    const parentId = currentNode.value.id;
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

    // add the dropped item as a child on the other (will also refresh the tree)
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
              throw new Error('Invalid header in DirectoryEntryNode.onEntryContextMenu.onClick');

            const entry = await currentEntryStore.createEntry(worldFolder, props.topic, { parentId: props.node.id} );

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
            await currentEntryStore.deleteEntry(props.node.id);
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