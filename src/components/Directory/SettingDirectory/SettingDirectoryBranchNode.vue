<!--
SettingDirectoryBranchNode: Setting Directory Branch Node

Purpose
- Displays a single branch entry in the directory tree

Responsibilities
- Show branch name with click-to-open functionality
- Handle context menu for branch entries

Props
- node: DirectoryBranchEntryNode, the branch node to display
- settingId: string, the setting UUID
- topic: ValidTopic, the topic (Organization)

Emits
- None

Slots
- None

Dependencies
- Stores: mainStore, navigationStore

-->

<template>
  <li class="fcb-branch-node">
    <div class="details">
      <div class="summary">      
        <!-- Branches don't have children, so no expand button -->
        <!-- <div class="fcb-directory-expand-button fcb-branch-spacer">
        </div> -->
        <!-- the branch under locations gets special tag so it doesn't get scrolled to -->
        <div 
          :class="
            node.id===currentEntry?.uuid && props.topic===Topics.Organization ? 'fcb-current-directory-entry' : 
            node.id===currentEntry?.uuid ? 'fcb-current-directory-branch' : 
            'fcb-directory-entry'
          "
          style="pointer-events: auto;"
          draggable="true"
          :data-testid="`directory-branch-node-${node.id}`"
          @click="onDirectoryItemClick($event, node)"
          @dragstart="onDragstart"
          @contextmenu="onEntryContextMenu"
        >
          {{ node.name }}
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useNavigationStore, useSettingDirectoryStore } from '@/applications/stores';
  import DragDropService from '@/utils/dragDrop';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  
  // types
  import { ValidTopic, Topics } from '@/types';
  import { DirectoryBranchEntryNode } from '@/classes';
  import { EntryNodeDragData } from '@/types/dragDrop';

  ////////////////////////////////
  // props
  const props = defineProps({
    node: { 
      type: Object as PropType<DirectoryBranchEntryNode>,
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
  });

  ////////////////////////////////
  // emits
  
  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const { currentEntry, } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDirectoryItemClick = async (event: MouseEvent, node: DirectoryBranchEntryNode) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(node.id, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
  };

  /** Handle drag start - branches are Organization entries */
  const onDragstart = async (event: DragEvent): Promise<void> => {
    event.stopPropagation();

    // Create the FCB data - branches are Organization entries
    const fcbData = {
      type: 'fcb-entry',
      topic: Topics.Organization,
      name: props.node.name,
      childId: props.node.id,
      typeName: props.node.type ?? '',
      isBranch: true,
    } as EntryNodeDragData;

    // Set combined drag data for both canvas drops and internal operations
    DragDropService.setCombinedDragData(event, props.node.id, fcbData);
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
  // lifecycle hooks
</script>

<style lang="scss" scoped>
</style>
