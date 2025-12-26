<template>
  <li>
    <div 
      class="details"
      :open="currentNode.expanded"
    >
      <div :class="'summary ' + (props.top ? 'top' : '')">      
        <div 
          class="fcb-directory-expand-button"
          data-testid="directory-expand-button"
          @click="onEntryToggleClick"
        >
          <span v-if="currentNode.expanded">-</span><span v-else>+</span>
        </div>
        <div 
          :class="`${currentNode.id===currentEntry?.uuid ? 'fcb-current-directory-entry' : 'fcb-directory-entry'}`"
          draggable="true"
          :data-testid="`directory-entry-with-children-${currentNode.id}`"
          @click="onDirectoryItemClick($event, currentNode as DirectoryEntryNode)"
          @dragstart="onDragStart($event, currentNode.id, currentNode.name)"
          @drop="onDrop"
          @dragover="onDragover"
          @contextmenu="onEntryContextMenu"
        >
          {{ displayName }}
        </div>
      </div>
      <ul>
        <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
        <template v-if="currentNode.expanded">
          <SettingDirectoryNodeComponent 
            v-for="child in sortedChildren"
            :key="child.id"
            :node="child"
            :setting-id="props.settingId"
            :topic="props.topic"
            :top="false"
          />
        </template>
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSettingDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { hasHierarchy, NO_TYPE_STRING, validParentItems } from '@/utils/hierarchy';
  import { getType, getValidatedData, setCombinedDragData } from '@/utils/dragdrop';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import SettingDirectoryNodeComponent from './SettingDirectoryNode.vue';
  
  // types
  import { EntryNodeDragData, ValidTopic } from '@/types';
  import { Entry, DirectoryEntryNode, FCBSetting, TopicFolder } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    node: { 
      type: Object as PropType<DirectoryEntryNode>,
      required: true,
    },
    settingId: {
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
  const settingDirectoryStore = useSettingDirectoryStore();
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentSetting, currentEntry, } = storeToRefs(mainStore);
  
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

  const showTypesInTree = computed(() => ModuleSettings.get(SettingKey.showTypesInTree));
  
  const displayName = computed(() => {
    if (showTypesInTree.value && currentNode.value.type && currentNode.value.type!==NO_TYPE_STRING) {
      return `${currentNode.value.name} (${currentNode.value.type})`;
    } else {
      return currentNode.value.name;
    }
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onEntryToggleClick = async (_event: MouseEvent) => {
    // it returns the same node, so vue doesn't necessarily realize it needs to rerender without a new copy
    currentNode.value = await settingDirectoryStore.toggleWithLoad(currentNode.value as DirectoryEntryNode, !currentNode.value.expanded);
    await settingDirectoryStore.refreshSettingDirectoryTree([currentNode.value.id]);
  };

  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryEntryNode) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(node.id, {newTab: event.ctrlKey});
  };

  
  // handle an entry dragging to another or to canvas
  const onDragStart = async (event: DragEvent, id: string, name: string): Promise<void> => {
    event.stopPropagation();
    
    if (!currentSetting.value) { 
      event.preventDefault();
      return;
    }

    // Create the FCB data
    const fcbData = {
      type: 'fcb-entry',
      topic: props.topic,
      name: name,
      childId: id,
      typeName: (currentNode.value.type ?? NO_TYPE_STRING),
    } as EntryNodeDragData;

    // Set combined drag data for both canvas drops and internal operations
    setCombinedDragData(event, id, fcbData);
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();  

    if (!currentSetting.value)
      return false;

    // parse the data - looking for entries
    let data = getValidatedData(event);
    if (!data || getType(data) !== 'fcb-entry')
      return;

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;
    if (!fcbData) 
      return;
          
    // make sure it's not the same item
    const parentId = currentNode.value.id;
    if (fcbData.childId===parentId)
      return;

    // if the types don't match or don't have hierarchy, can't drop
    if (fcbData.topic!==props.topic || !hasHierarchy(props.topic))
      return;

    // is this a legal parent?
    const topicFolder = currentSetting.value.topicFolders[props.topic];
    const childEntry = await Entry.fromUuid(fcbData.childId); 
    
    if (!childEntry)
      return;

    if (!(validParentItems(currentSetting.value as FCBSetting, childEntry)).find(e=>e.id===parentId))
      return;

    // add the dropped item as a child on the other (will also refresh the tree)
    await settingDirectoryStore.setNodeParent(topicFolder as TopicFolder, fcbData.childId, parentId);
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
      items: settingDirectoryStore.getTopicNodeContextMenuItems(
        props.topic, 
        props.node.id
      )
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