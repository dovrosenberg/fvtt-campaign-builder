<template>
  <li class="fwb-type-item">
    <!-- TODO: track expanded state-->
    <div 
      class="details"
      :open="props.pack.expanded"
    >
      <div class="summary top">      
        <div 
          class="fwb-directory-expand-button"
          @click="onTypeToggleClick"
        >
          <span v-if="props.pack.expanded">-</span><span v-else>+</span>
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
        <div v-if="currentType && currentType.expanded">
          <div 
            v-for="node in currentType.loadedChildren"
            :key="node.id"
          >
            <DirectoryGroupedNode :node="node" />
          </div>
        </div>
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, ref, watch } from 'vue';
  
  // local imports
  import { useDirectoryStore } from '@/applications/stores';

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