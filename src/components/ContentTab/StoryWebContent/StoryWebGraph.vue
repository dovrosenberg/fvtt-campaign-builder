<template>
  <div class="vis-network-wrapper">
    <div ref="networkContainer" class="network-container">
      <!-- Debug: StoryWebGraph rendered -->
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore, useStoryWebStore } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';
  import { notifyWarn } from '@/utils/notifications';

  // library components

  // local components

  // types
  import { StoryWeb } from '@/classes';

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
  const { currentContainer } = storeToRefs(storyWebStore);

  ////////////////////////////////
  // data
  const networkContainer = ref<HTMLElement>();
  const graphComposable = ref<any | null>(null);
  const isGraphLoading = ref(false);
  const graphError = ref<string | null>(null);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  // Initialize graph when storyWeb changes
  const initializeGraph = async () => {

    // if (!storyWebStore.currentStoryWeb.value) return;

    try {
      console.log('StoryWebGraph: starting graph initialization');
      isGraphLoading.value = true;
      graphError.value = null;
      
      // // Dynamically import the composable
      // console.log('StoryWebGraph: importing useStoryWebGraph');
      // const { useStoryWebGraph: dynamicUseStoryWebGraph } = await import('@/composables/useStoryWebGraph');
      
      // // Initialize the composable
      // console.log('StoryWebGraph: initializing composable');
      // graphComposable.value = dynamicUseStoryWebGraph();
      
      // // Initialize graph with the container and get network instance
      // console.log('StoryWebGraph: calling initializeGraph');
      // await graphComposable.value.initializeGraph(container, storyWeb);
      
      console.log('StoryWebGraph: graph initialization completed');
      
    } catch (error) {
      console.error('StoryWebGraph: failed to load story web graph:', error);
      graphError.value = 'Failed to load story web functionality';
      emit('error', graphError.value);
    } finally {
      console.log('StoryWebGraph: initialization complete');
      isGraphLoading.value = false;
      emit('loading', isGraphLoading.value);
    }
  };

  // Initialize drag handlers on the vis-network canvas
  const initializeDragHandlers = async () => {
    console.log('initializeDragHandlers called');
    console.log('networkContainer.value:', networkContainer.value);
    
    if (!networkContainer.value) {
      console.log('networkContainer.value is null, returning');
      return;
    }

    // Wait for next tick to ensure parent listeners are attached
    await nextTick();
    console.log('About to emit ready event with container:', networkContainer.value);
    // Emit ready event immediately since container is available
    emit('ready', networkContainer.value);
    console.log('Ready event emitted');

    console.log('Setting up MutationObserver');
    // Wait for vis-network to create its canvas
    const observer = new MutationObserver(() => {
      const canvas = networkContainer.value?.querySelector('canvas');
      if (canvas) {
        console.log('Found vis-network canvas, attaching drag handlers');
        
        // Attach drag handlers directly to the canvas
        // canvas.addEventListener('dragover', onDragOver);
        // canvas.addEventListener('dragenter', onDragEnter);
        // canvas.addEventListener('drop', onDrop);
        
        // Stop observing once we've attached handlers
        observer.disconnect();
      }
    });

    // Start observing for canvas creation
    observer.observe(networkContainer.value, { childList: true, subtree: true });
    console.log('MutationObserver started');
  };

  ////////////////////////////////
  // event handlers
  

  ////////////////////////////////
  // watchers
  // once the ref is set - pass to the store
  watch(() => networkContainer.value, () => {
    if (networkContainer.value) {
      currentContainer.value = networkContainer.value;
    }
  });

  ////////////////////////////////
  // lifecycle events
  // Watch for storyWeb changes and reinitialize
  onMounted(() => {
    console.log('StoryWebGraph onMounted called');
    initializeDragHandlers();
    
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
      // canvas.removeEventListener('dragover', onDragOver);
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
</style>
