<template>
  <div class="vis-network-wrapper">
    <div 
      ref="networkContainer" 
      class="network-container"
      @drop="onDrop"
      @dragover="onDragover"
      @keydown="onKeydown"
    >
      <!-- Debug: StoryWebGraph rendered -->
      <div 
        v-show="isWebLoading" 
        class="loading"
      >
        <ProgressSpinner />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, onBeforeUnmount, watch, toRaw } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useStoryWebStore } from '@/applications/stores';
  import { getValidatedData } from '@/utils/dragdrop';
  
  // library components
  import ProgressSpinner from 'primevue/progressspinner';

  // local components

  // types

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    drop: [event: DragEvent];
    dragOver: [event: DragEvent];
    dragEnter: [event: DragEvent];
    ready: [container: HTMLElement];
    loading: [isLoading: boolean];
    error: [error: string | null];
  }>();

  ////////////////////////////////
  // store
  const storyWebStore = useStoryWebStore();
  const { currentContainer, isWebLoading, currentNetwork } = storeToRefs(storyWebStore);

  ////////////////////////////////
  // data
  const networkContainer = ref<HTMLElement>();

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onKeydown = (event: KeyboardEvent) => {
    if (!currentNetwork.value)
      return;
    
    switch (event.key) {
      case 'Delete':
        for (const node of toRaw(currentNetwork.value).getSelectedNodes()) {
          storyWebStore.removeNode(node as string);
        }

        for (const edge of toRaw(currentNetwork.value).getSelectedEdges()) {
          storyWebStore.removeEdge(edge as string);
        }
        break;
    }
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // make sure it's a legit droppable
    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  };

  const onDrop = async (event: DragEvent) => {
    event.stopPropagation();
    event.preventDefault();

    const data = getValidatedData(event);
    if (!data)
      return;

    // we can drop entries
    if (data.type === 'fcb-entry') {
      await storyWebStore.addEntry(data.childId as string, { x: event.offsetX, y: event.offsetY });      
    }
  };
  

  ////////////////////////////////
  // watchers
  // once the ref is set - pass to the store
  watch(() => networkContainer.value, () => {
    if (networkContainer.value) {
      currentContainer.value = networkContainer.value;
    }
  }, { flush: 'post' });

  ////////////////////////////////
  // lifecycle events
  // Watch for storyWeb changes and reinitialize
  onMounted(async () => {
    // for now, we fake some data
    // await storyWebStore.addEntry('Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.otDnRZTdcda4DZeP');
    
    // // Initialize graph if storyWeb is already available
    // if (props.storyWeb && networkContainer.value) {
    //   initializeGraph(networkContainer.value, props.storyWeb);
    // }
  });

  onBeforeUnmount(() => {
    console.log('StoryWebGraph onBeforeUnmount called');
    // Clean up event listeners
    const canvas = networkContainer.value?.querySelector('canvas');
    if (canvas) {
      // canvas.removeEventListener('dragover', () => {console.log('a');});
      // canvas.removeEventListener('dragenter', onDragEnter);
      // canvas.removeEventListener('drop', onDrop);
    }
  });

</script>

<style scoped>
.vis-network-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.network-container {
  width: 100%;
  height: 100%;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}
</style>
