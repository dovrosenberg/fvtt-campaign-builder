<template>
  <SettingDirectoryNodeWithChildren 
    v-if="props.node.children.length && filterNodes[props.topic]?.includes(props.node.id)" 
    :node="props.node"
    :setting-id="props.settingId"
    :topic="props.topic"
    :top="props.top"
  />
  <li v-else-if="filterNodes[props.topic]?.includes(props.node.id)" :class="{ 'fcb-top-level-node': props.top }">
    <div class="details">
      <div class="summary">
        <div 
          :class="`${props.node.id===currentEntry?.uuid ? 'fcb-current-directory-entry' : 'fcb-directory-entry'}`"
          style="pointer-events: auto;"
          draggable="true"
          :data-testid="`directory-entry-${props.node.id}`"
          @click="onDirectoryItemClick"
          @dragstart="onDragStart($event, props.node.id, props.node.name)"
          @drop="onDrop"
          @dragover="DragDropService.standardDragover"
          @contextmenu="onEntryContextMenu"
        >
          {{ displayName }}
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, computed } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSettingDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { hasHierarchy, NO_TYPE_STRING, validParentItems } from '@/utils/hierarchy';
  import DragDropService from '@/utils/dragDrop';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import SettingDirectoryNodeWithChildren from './SettingDirectoryNodeWithChildren.vue';
  
  // types
  import { EntryNodeDragData, ValidTopic } from '@/types';
  import { DirectoryEntryNode, Entry, FCBSetting, TopicFolder } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    settingId: {
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
  const settingDirectoryStore = useSettingDirectoryStore();
  const mainStore = useMainStore();
  const { currentSetting, currentEntry, } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(settingDirectoryStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data
  const showTypesInTree = computed(() => ModuleSettings.get(SettingKey.showTypesInTree));
  
  const displayName = computed(() => {
    if (showTypesInTree.value && props.node.type && props.node.type!==NO_TYPE_STRING) {
      return `${props.node.name} (${props.node.type})`;
    } else {
      return props.node.name;
    }
  });
  
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
      typeName: props.node.type ?? NO_TYPE_STRING,
    } as EntryNodeDragData;

    // Set combined drag data for both canvas drops and internal operations
    DragDropService.setCombinedDragData(event, id, fcbData);
  };

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();  

    if (!currentSetting.value)
        return;

    // parse the data
    const data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== DragDropService.FCBDragTypes.Entry)
      return;

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;

    if (!fcbData) {
      return;
    }

    const topicFolder = currentSetting.value?.topicFolders[props.topic];

    // make sure it's not the same item
    const parentId = props.node.id;
    if (fcbData.childId===parentId)
      return;

    // if the types don't match or don't have hierarchy, can't drop
    if (fcbData.topic!==props.topic || !hasHierarchy(props.topic))
      return;

    // is this a legal parent?
    const childEntry = await Entry.fromUuid(fcbData.childId);

    if (!childEntry)
      return;

    if (!(validParentItems(currentSetting.value as FCBSetting, childEntry)).find(e=>e.id===parentId))
      return;

    // add the dropped item as a child on the other  (will also refresh the tree)
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

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
</style>