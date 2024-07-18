<template>
  <li class="fwb-type-item">
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
          @drop="onDrop($event)"
        >
          {{ currentType?.name }}
        </div>
      </div>
      <ul>
        <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
        <div v-if="currentType.expanded">
          <div 
            v-for="node in currentType.loadedChildren"
            :key="node.id"
          >
            <DirectoryGroupedNode 
              :node="node" 
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
  import { PropType, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { useDirectoryStore, useMainStore } from '@/applications/stores';
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';

  // library components

  // local components
  import DirectoryGroupedNode from './DirectoryGroupedNode.vue';

  // types
  import { DirectoryPack, DirectoryTypeNode, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    type: {
      type: Object as PropType<DirectoryTypeNode>,
      required: true,
    },
    pack: {
      type: Object as PropType<DirectoryPack>,
      required: true,
    }, 
    searchText: {
      type: String,
      required: true,
    },
  });
  
  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const directoryStore = useDirectoryStore();
  const mainStore = useMainStore();
  const { currentWorldId } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const currentType = ref<DirectoryTypeNode>(props.type);
  
  ////////////////////////////////
  // computed data
  
  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onTypeToggleClick = async () => {
    currentType.value = await directoryStore.toggleType(props.pack.id, currentType.value, !currentType.value.expanded);
  };

  // you can drop an item on a type and it should reassign the type
  const onDrop = async (event: DragEvent): Promise<boolean> => {
    if (!currentWorldId.value)
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
    const packElement = (event.currentTarget as HTMLElement).closest('.fwb-topic-folder') as HTMLElement | null;
    if (!packElement || !packElement.dataset.packId) {
      return false;
    }

    const topic = WorldFlags.get(currentWorldId.value, WorldFlagKey.packTopics)[packElement.dataset.packId];

    // if the topics don't match, can't drop
    if (data.topic!==topic)
      return false;

    // set the new type
    await directoryStore.updateEntryType(data.id, currentType.value.name);

    return true;
  };


  ////////////////////////////////
  // watchers
  watch(() => props.type, (newValue) => {
    currentType.value = newValue;
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>