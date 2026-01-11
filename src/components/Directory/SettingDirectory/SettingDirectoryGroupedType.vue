<template>
  <!-- the "type" parent node -->
  <!-- note that filtering by filterNodes will hide unused types even if there's no search filter -->
  <li 
    v-if="filterNodes[props.topic]?.includes(currentType?.id)"
    class="fcb-type-item"
  >
    <div 
      class="details"
      :open="currentType.expanded"
    >
      <div class="summary top">      
        <div 
          class="fcb-directory-expand-button"
          @click="onTypeToggleClick"
        >
          <span v-if="currentType.expanded">-</span><span v-else>+</span>
        </div>
        <div 
          class="fcb-directory-type"
          @click="onTypeToggleClick"
          @drop="onDrop"
          @dragover="DragDropService.standardDragover"
          @contextmenu="onTypeContextMenu"
        >
          {{ currentType?.name }}
        </div>
      </div>
      <ul>
        <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
        <div v-if="currentType.expanded">
          <div 
            v-for="node in sortedChildren"
            :key="node.id"
          >
            <SettingDirectoryGroupedNode 
              :node="node" 
              :topic="props.topic"
              :type-name="currentType.name"
            />
          </div>
        </div>
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, ref, watch, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { useSettingDirectoryStore, useMainStore, } from '@/applications/stores';
  import { NO_TYPE_STRING } from '@/utils/hierarchy';
  import { toTopic } from '@/utils/misc';
  import DragDropService from '@/utils/dragDrop';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import SettingDirectoryGroupedNode from './SettingDirectoryGroupedNode.vue';

  // types
  import { ValidTopic, EntryNodeDragData } from '@/types';
  import { DirectoryTypeEntryNode, DirectoryTypeNode, Entry } from '@/classes';

  
  ////////////////////////////////
  // props
  const props = defineProps({
    type: {
      type: Object as PropType<DirectoryTypeNode>,
      required: true,
    },
    settingId: {
      type: String,
      required: true,
    },
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true,
    }, 
  });
  
  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const settingDirectoryStore = useSettingDirectoryStore();
  const mainStore = useMainStore();
  const { currentSetting, currentEntry } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(settingDirectoryStore);
  
  ////////////////////////////////
  // data
  const currentType = ref<DirectoryTypeNode>(props.type);
  
  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectoryTypeEntryNode[] => {
    const children = (currentType.value as DirectoryTypeNode).loadedChildren;
    return children.sort((a, b) => a.name.localeCompare(b.name));
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onTypeToggleClick = async () => {
    currentType.value = await settingDirectoryStore.toggleWithLoad(currentType.value, !currentType.value.expanded);
  };

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();  

    if (!currentSetting.value)
        return;

    // parse the data - looking for entries 
    const data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== DragDropService.FCBDragTypes.Entry)
      return;

    const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;

    // make sure it's not already set
    if (!fcbData || !fcbData.typeName || fcbData.typeName===currentType.value.name)
      return;

    // get the pack on the new item
    const topicElement = (event.currentTarget as HTMLElement).closest('.fcb-topic-folder') as HTMLElement | null;
    if (!topicElement || !topicElement.dataset.topic) {
      return;
    }

    const topic = toTopic(topicElement.dataset.topic);

    // if the topics don't match, can't drop
    if (fcbData.topic!==topic || topic === null)
      return;

    // set the new type
    const entry = await Entry.fromUuid(fcbData.childId);
    if (entry) {
      const oldType = entry.type;
      entry.type = currentType.value.name;
      await entry.save();

      await settingDirectoryStore.updateEntryType(entry, oldType);

      // if it's currently open, force screen refresh
      if (entry.uuid === currentEntry.value?.uuid) {
        await mainStore.refreshEntry();
      }
    }
  };

  const onTypeContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: settingDirectoryStore.getGroupedTypeNodeContextMenuItems(props.topic, props.type.name)
    });
  };


  ////////////////////////////////
  // watchers
  watch(() => props.type, (newValue) => {
    currentType.value = newValue || NO_TYPE_STRING;
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>