<template>
  <li>
    <div
      :class="`${props.sessionNode.id===currentSession?.uuid ? 'wcb-current-directory-entry' : 'wcb-directory-entry'}`"
      style="pointer-events: auto;"
      draggable="true"
      :data-tooltip="props.sessionNode.tooltip"
      @click="onSessionClick"
      @contextmenu="onSessionContextMenu"
      @dragstart="onDragStart"
    >
      {{ props.sessionNode.name }}
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
  import { DirectorySessionNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    sessionNode: { 
      type: Object as PropType<DirectorySessionNode>,
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
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const mainStore = useMainStore();
  const { currentSession, } = storeToRefs(mainStore);
  // const { filterNodes } = storeToRefs(topicDirectoryStore);
  
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
      sessionNode: true,
      sessionId: props.sessionNode.id,
      name: props.sessionNode.name
    };

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onSessionClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    await navigationStore.openSession(props.sessionNode.id, {newTab: event.ctrlKey});
  };

  const onSessionContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'wcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.session.delete'), 
          onClick: async () => {
            await campaignDirectoryStore.deleteSession(props.sessionNode.id);
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