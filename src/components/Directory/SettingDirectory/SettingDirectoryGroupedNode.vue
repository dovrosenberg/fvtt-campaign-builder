<template>
  <!-- an entry node beneath a topic -- don't show children -->
  <li v-if="filterNodes[props.topic]?.includes(props.node.id)">
    <div 
      :class="`${props.node.id===currentEntry?.uuid ? 'fcb-current-directory-entry' : 'fcb-directory-entry'}`"
      style="pointer-events: auto;"
      draggable="true"
      @click="onDirectoryItemClick"
      @dragstart="onDragStart"
      @contextmenu="onEntryContextMenu"
    >
      {{ props.node.name }}
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useSettingDirectoryStore, useMainStore, useNavigationStore, useStoryWebStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { toTopic } from '@/utils/misc';
  import DragDropService from '@/utils/dragDrop';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components

  // types
  import { EntryNodeDragData, ValidTopic } from '@/types';
  import { DirectoryTypeEntryNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    node: {
      type: Object as PropType<DirectoryTypeEntryNode>,
      required: true,
    },
    typeName: {
      type: String,
      required: true,
    },
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const storyWebStore = useStoryWebStore();
  const { currentEntry, currentSetting, currentStoryWeb } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(settingDirectoryStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data
  
  ////////////////////////////////
  // methods
  
  ////////////////////////////////
  // event handlers
  const onDirectoryItemClick = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    await navigationStore.openEntry(props.node.id, {newTab: event.ctrlKey});
  };

  const onDragStart = async (event: DragEvent): Promise<void> => {
    event.stopPropagation();
    
    if (!currentSetting.value) { 
      event.preventDefault();
      return;
    }

    // need to get the type and topic so we can compare when dropping
    const topicElement = (event.currentTarget as HTMLElement).closest('.fcb-topic-folder') as HTMLElement | null;
    if (!topicElement || !topicElement.dataset.topic) {
      event.preventDefault();
      return;
    }

    // Create the FCB data
    const fcbData = { 
      type: 'fcb-entry',
      topic: toTopic(topicElement.dataset.topic),
      name: props.node.name,
      childId: props.node.id,
      typeName: props.typeName,
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
      items: [
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.directoryEntry.delete'), 
          onClick: async () => {
            await settingDirectoryStore.deleteEntry(props.node.id);
          }
        },
        {
          icon: 'fa-diagram-project',
          iconFontClass: 'fas',
          label: 'Add to current Story Web',
          disabled: !currentStoryWeb.value,
          onClick: async () => {
            await storyWebStore.addEntry(props.node.id, null, false);
          }
        },
        {
          icon: 'fa-sitemap',
          iconFontClass: 'fas',
          label: 'Add with Relationships',
          disabled: !currentStoryWeb.value,
          onClick: async () => {
            await storyWebStore.addEntry(props.node.id, null, true);
          }
        }
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