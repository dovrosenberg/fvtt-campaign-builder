<template>
  <li>
    <div class="details">
      <div class="summary">
        <div
          :class="`${props.storyWebNode.id===currentStoryWeb?.uuid ? 'fcb-current-directory-entry' : 'fcb-directory-entry'}`"
          style="pointer-events: auto;"
          draggable="true"
          :data-testid="`storyweb-node-${props.storyWebNode.id}`"
          @click="onStoryWebClick"
          @contextmenu="onStoryWebContextMenu"
          @dragstart="onDragStart"
        >
          {{ props.storyWebNode.name }}
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
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import DragDropService from '@/utils/dragDrop';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components

  // types
  import { DirectoryStoryWebNode,  } from '@/classes';
  import { StoryWebNodeDragData } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    storyWebNode: { 
      type: Object as PropType<DirectoryStoryWebNode>,
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { currentStoryWeb } = storeToRefs(mainStore);

  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onStoryWebClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    await navigationStore.openStoryWeb(props.storyWebNode.id);
  };

  const onStoryWebContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: e.clientX,
      y: e.clientY,
      zIndex: 300,
      items: [
        {
          icon: 'fa-copy',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWeb.duplicate'),
          onClick: async () => {
            await campaignDirectoryStore.duplicateStoryWeb(props.storyWebNode.id);
          },
        },
        {
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWeb.delete'),
          onClick: async () => {
            await campaignDirectoryStore.deleteStoryWeb(props.storyWebNode.id);
          },
        },
      ],
    });
  };

  const onDragStart = async (event: DragEvent) => {
    event.stopPropagation();

    // Create the FCB data
    const fcbData = {
      type: 'fcb-storyWeb',
      storyWebId: props.storyWebNode.id,
      name: props.storyWebNode.name,
    } as StoryWebNodeDragData;

    // Set combined drag data for both canvas drops and internal operations
    DragDropService.setCombinedDragData(event, props.storyWebNode.id, fcbData);
  };
</script>
