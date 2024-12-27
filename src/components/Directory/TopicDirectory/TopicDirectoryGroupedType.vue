<template>
  <!-- the "type" parent node -->
  <!-- note that filtering by filterNodes will hide unused types even if there's no search filter -->
  <li 
    v-if="filterNodes[props.topic]?.includes(currentType?.name)"
    class="fwb-type-item"
  >
    <!-- TODO: track expanded state-->
    <div 
      class="details"
      :open="currentType.expanded"
    >
      <div class="summary top">      
        <div 
          class="fwb-directory-expand-button"
          @click="onTypeToggleClick"
        >
          <span v-if="currentType.expanded">-</span><span v-else>+</span>
        </div>
        <div 
          class="fwb-current-directory-type"
          @drop="onDrop"
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
            <TopicDirectoryGroupedNode 
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
  import { useNavigationStore, useTopicDirectoryStore, useMainStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { NO_TYPE_STRING } from '@/utils/hierarchy';
  import { toTopic } from '@/utils/misc';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import TopicDirectoryGroupedNode from './TopicDirectoryGroupedNode.vue';

  // types
  import { ValidTopic, } from '@/types';
  import { DirectoryTypeEntryNode, DirectoryTypeNode, Entry } from '@/classes';

  
  ////////////////////////////////
  // props
  const props = defineProps({
    type: {
      type: Object as PropType<DirectoryTypeNode>,
      required: true,
    },
    worldId: {
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
  const topicDirectoryStore = useTopicDirectoryStore();
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorld, currentEntry } = storeToRefs(mainStore);
  const { filterNodes } = storeToRefs(topicDirectoryStore);
  
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
    currentType.value = await topicDirectoryStore.toggleWithLoad(currentType.value, !currentType.value.expanded);
  };

  // you can drop an item on a type and it should reassign the type
  const onDrop = async (event: DragEvent): Promise<boolean> => {
    if (event.dataTransfer?.types[0]==='text/plain') {
      if (!currentWorld.value)
        return false;

      let data;
      try {
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
      }
      catch (err) {
        return false;
      }

      // make sure it's not already set
      if (!data.typeName || data.typeName===currentType.value.name)
        return false;

      // get the pack on the new item
      const topicElement = (event.currentTarget as HTMLElement).closest('.fwb-topic-folder') as HTMLElement | null;
      if (!topicElement || !topicElement.dataset.topic) {
        return false;
      }

      const topic = toTopic(topicElement.dataset.topic);

      // if the topics don't match, can't drop
      if (data.topic!==topic)
        return false;

      // set the new type
      const entry = await Entry.fromUuid(data.id, currentWorld.value.topics[topic]);
      if (entry) {
        const oldType = entry.type;
        entry.type = currentType.value.name;
        await entry.save();

        await topicDirectoryStore.updateEntryType(entry, oldType);

        // if it's currently open, force screen refresh
        if (entry.uuid === currentEntry.value?.uuid) {
          mainStore.refreshEntry();
        }
      }

      return true;
    } else {
      return false;
    }
  };

  const onTypeContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-atlas',
          iconFontClass: 'fas',
          label: `${localize('contextMenus.typeFolder.create')} ${props.type.name}`, 
          onClick: async () => {
            // get the right topic
            const worldFolder = game.folders?.find((f)=>f.uuid===props.worldId) as globalThis.Folder;
            
            if (!worldFolder)
              throw new Error('Invalid header in TopicDirectoryGroupedType.onTypeContextMenu.onClick');

            const entry = await topicDirectoryStore.createEntry(props.topic, { type: props.type.name } );

            if (entry) {
              await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
      ]
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