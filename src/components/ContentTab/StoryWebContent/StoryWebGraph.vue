<template>
  <div class="vis-network-wrapper">
    <div 
      ref="networkContainer" 
      class="network-container"
      @drop="onDrop"
      @dragover="DragDropService.standardDragover"
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
    
    <!-- Zoom controls - positioned outside network container -->
    <div class="zoom-controls">
      <button 
        class="zoom-button"
        @click.prevent.stop="adjustScale(1.2)"
        :disabled="!currentNetwork"
        :title="localize('labels.storyWeb.zoomIn')"
      >
        <i class="fas fa-search-plus"></i>
      </button>
      <button 
        class="zoom-button"
        @click.prevent.stop="adjustScale(0.8)"
        :disabled="!currentNetwork"
        :title="localize('labels.storyWeb.zoomOut')"
      >
        <i class="fas fa-search-minus"></i>
      </button>
      <button 
        class="zoom-button"
        @click.prevent.stop="fitToWindow"
        :disabled="!currentNetwork"
        :title="localize('labels.storyWeb.fitToWindow')"
      >
        <i class="fas fa-expand"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, toRaw } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useStoryWebStore } from '@/applications/stores';
  import DragDropService from '@/utils/dragDrop';
  import { localize } from '@/utils/game';
  
  // library components
  import ProgressSpinner from 'primevue/progressspinner';

  // local components

  // types
  import { EntryNodeDragData, FrontNodeDragData } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

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

  const adjustScale = (scaleAdjust: number = 1) => {
    if (!currentNetwork.value) 
      return;
    
    const scale = toRaw(currentNetwork.value).getScale();
    toRaw(currentNetwork.value).moveTo({
      scale: scale * scaleAdjust,
      animation: {
        duration: 300,
        easingFunction: 'easeInOutQuad'
      }
    });
  }
  
  const fitToWindow = () => {
    if (!currentNetwork.value) 
      return;
    
    toRaw(currentNetwork.value).fit({
      animation: {
        duration: 300,
        easingFunction: 'easeInOutQuad'
      }
    });
  }

  const onDrop = async (event: DragEvent) => {
    event.stopPropagation();
    event.preventDefault();

    const data = DragDropService.getValidatedData(event);
    if (!data || !currentNetwork.value) {
      return;
    }

    const dataType = DragDropService.getType(data);
    
    // Handle front drops
    if (dataType === 'fcb-front') {
      const fcbData = 'fcbData' in data && data.fcbData as FrontNodeDragData | undefined;
      if (!fcbData) {
        return;
      }

      // we can drop fronts
      const withRelationships = event.ctrlKey;
      const domPosition = { x: event.offsetX, y: event.offsetY };
      const convertedPosition = toRaw(currentNetwork.value).DOMtoCanvas(domPosition);

      await storyWebStore.addFront(fcbData.frontId, convertedPosition, withRelationships);
      return;
    }

    // Handle entry drops
    if (dataType === DragDropService.FCBDragTypes.Entry) {
      const fcbData = 'fcbData' in data && data.fcbData as EntryNodeDragData | undefined;
      if (!fcbData) {
        return;
      }

      // we can drop entries
      const withRelationships = event.ctrlKey;
      const domPosition = { x: event.offsetX, y: event.offsetY };
      const convertedPosition = toRaw(currentNetwork.value).DOMtoCanvas(domPosition);

      // Check if there's a node under the drop position
      const nodeUnderCursor = toRaw(currentNetwork.value).getNodeAt(domPosition) as string | null;
      
      if (nodeUnderCursor) {
        // Handle the drop on node using the store method
        await storyWebStore.handleDropOnNode(fcbData.childId, nodeUnderCursor, convertedPosition, withRelationships);
      } else {
        // Normal drop - just add the entry
        await storyWebStore.addEntry(fcbData.childId, convertedPosition, withRelationships);      
      }
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

.zoom-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.zoom-button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background-color: hsl(164, 48%, 95%);
  color: hsl(164, 48%, 20%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.zoom-button:hover:not(:disabled) {
  background-color: hsl(164, 48%, 85%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.zoom-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.zoom-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

</style>

<style lang="scss">
  /* Global styles for vis-network tooltip - not scoped */
  .vis-tooltip {
    position: absolute;
    pointer-events: none;
    background-color: hsl(164, 48%, 95%);
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    font-size: var(--font-size-12);
    max-width: 400px;
    word-wrap: break-word;
  }
</style>
