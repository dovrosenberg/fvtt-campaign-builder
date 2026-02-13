<template>
  <li>
    <div class="details">
      <div class="summary">
        <div
          :class="`${props.frontNode.id===currentFront?.uuid ? 'fcb-current-directory-entry' : 'fcb-directory-entry'}`"
          style="pointer-events: auto;"
          draggable="true"
          :data-testid="`session-node-${props.frontNode.id}`"
          @click="onFrontClick"
          @contextmenu="onFrontContextMenu"
          @dragstart="onDragStart"
        >
          {{ props.frontNode.name }}
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
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore, useStoryWebStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import DragDropService from '@/utils/dragDrop';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components

  // types
  import { DirectoryFrontNode,  } from '@/classes';
  import { FrontNodeDragData, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    frontNode: { 
      type: Object as PropType<DirectoryFrontNode>,
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const mainStore = useMainStore();
  const storyWebStore = useStoryWebStore();
  const { currentFront, isInPlayMode, currentStoryWeb } = storeToRefs(mainStore);
  // const { filterNodes } = storeToRefs(settingDirectoryStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  // select an entry

  ////////////////////////////////
  // event handlers

  // handle front dragging
  const onDragStart = async (event: DragEvent): Promise<void> => {
    event.stopPropagation();

    // Create the FCB data
    const fcbData = {
      type: 'fcb-front',
      frontId: props.frontNode.id,
      name: props.frontNode.name
    } as FrontNodeDragData;

    // Set combined drag data for both canvas drops and internal operations
    DragDropService.setCombinedDragData(event, props.frontNode.id, fcbData);
  };

  const onFrontClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    await navigationStore.openFront(props.frontNode.id, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
  };

  const onFrontContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-diagram-project',
          iconFontClass: 'fas',
          label: localize('contextMenus.addToStoryWeb'),
          disabled: !currentStoryWeb.value,
          onClick: async () => {
            await storyWebStore.addFront(props.frontNode.id, null, false);
          }
        },
        { 
          icon: 'fa-sitemap',
          iconFontClass: 'fas',
          label: localize('contextMenus.addWithRelationships'),
          disabled: !currentStoryWeb.value,
          onClick: async () => {
            await storyWebStore.addFront(props.frontNode.id, null, true);
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.front.delete'), 
          disabled: isInPlayMode.value,
          onClick: async () => {
            await campaignDirectoryStore.deleteFront(props.frontNode.id);
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