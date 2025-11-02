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
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components

  // types
  import { DirectoryFrontNode,  } from '@/classes';
  import { SessionNodeDragData } from '@/types';
  
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
  const { currentFront, isInPlayMode, } = storeToRefs(mainStore);
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

  // handle session dragging
  const onDragStart = (event: DragEvent): void => {
    event.stopPropagation();

    const dragData = {
      type: 'fcb-session',
      sessionId: props.frontNode.id,
      name: props.frontNode.name
    } as SessionNodeDragData;

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onFrontClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    await navigationStore.openFront(props.frontNode.id, {newTab: event.ctrlKey});
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