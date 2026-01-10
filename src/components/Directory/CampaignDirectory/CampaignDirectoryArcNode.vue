<template>
  <li
    :class="'fcb-topic-folder folder entry flexcol ' + (arcNode.expanded ? '' : 'collapsed')"
    :data-arc="props.arcNode.id" 
  >
    <header class="folder-header flexrow">
      <div
        class="noborder"
        style="margin-bottom:0px"
        draggable="true"
        :data-tooltip="props.arcNode.completed ? localize('tooltips.arcComplete') : ''"
        @contextmenu="onArcContextMenu"
        @dragstart="onDragStart"
      >
        <i
          class="fas fa-folder-open fa-fw"
          style="margin-right: 4px;"
          data-testid="campaign-folder-toggle"
          @click="onArcFolderClick"
        ></i>
        <i :class="'icon fas ' + getTabTypeIcon(WindowTabType.Arc)" style="margin-right: 4px;"></i>
        <span data-testid="arc-name" @click="onArcSelectClick">
          <span 
            :class="`node-name ${props.arcNode.id===currentArc?.uuid ? 'active' : ''}`"
          >
            {{ props.arcNode.name }}
            <i v-if="props.arcNode.completed" class="fas fa-check-circle completed-icon"></i>
          </span>
        </span>
      </div>
    </header>

    <!-- These are the sessions -->
    <ul 
      v-if="props.arcNode.expanded"
      class="campaign-contents fcb-directory-tree"
    >
      <CampaignDirectorySessionNode 
        v-for="node in sortedChildren"
        :key="node.id"
        :session-node="node"
        :top="true"
        class="fcb-entry-item" 
        draggable="true"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';
  import { FCBDialog } from '@/dialogs';
  import DragDropService from '@/utils/dragDrop';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import CampaignDirectorySessionNode from './CampaignDirectorySessionNode.vue';
  
  // types
  import { DirectoryArcNode, DirectorySessionNode } from '@/classes';
  import { WindowTabType, ArcNodeDragData } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    arcNode: {
      type: Object as PropType<DirectoryArcNode>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { currentArc, } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleWithLoad we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryArcNode>(props.arcNode);
  
  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectorySessionNode[] => {
    const children = props.arcNode.loadedChildren;
    return children.sort((a, b) => a.sessionNumber - b.sessionNumber);
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // handle arc dragging
  const onDragStart = async (event: DragEvent): Promise<void> => {
    event.stopPropagation();

    // Create the FCB data
    const fcbData = {
      type: 'fcb-arc',
      arcId: props.arcNode.id,
      name: props.arcNode.name
    } as ArcNodeDragData;

    // Set combined drag data for both canvas drops and internal operations
    DragDropService.setCombinedDragData(event, props.arcNode.id, fcbData);
  };

  // change arc
  const onArcFolderClick = async (_event: MouseEvent) => {
    currentNode.value = await campaignDirectoryStore.toggleWithLoad(currentNode.value as DirectoryArcNode, !currentNode.value.expanded);
  };

  const onArcSelectClick = async (event: MouseEvent) => {
    await navigationStore.openArc(currentNode.value.id, {newTab: event.ctrlKey});
  };

  // hidden for now because we want all management to go through arcmanager and only add sessions
  //    to campaign
  const onArcContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    // we don't allow deleting here because I don't feel like adding rebalance code right now and
    //   it's probably better for users to visualize the arc structure in the manager
    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: getTabTypeIcon(WindowTabType.Arc),
          iconFontClass: 'fas',
          label: localize('contextMenus.campaignFolder.manageArcs'), 
          onClick: async () => {
            FCBDialog.arcManagerDialog(props.arcNode.parentId!);
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