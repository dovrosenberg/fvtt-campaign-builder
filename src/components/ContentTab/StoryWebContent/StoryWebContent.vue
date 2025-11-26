<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.StoryWeb)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name" 
          class="fcb-input-name"
          :showImage="false"
          unstyled
          :placeholder="localize('placeholders.storyWebName')"
          :pt="{
            root: { class: 'full-height' } 
          }" 
          @update:model-value="onNameUpdate"
        />
      </header>
    </div>
  
    <div class="story-web-content">
      <!-- Loading state -->
      <div v-if="isGraphLoading" class="loading">
        <p>Loading story web functionality...</p>
      </div>
      
      <!-- Error state -->
      <div v-else-if="graphError" class="error">
        <p>{{ graphError }}</p>
      </div>
      
      <!-- Normal state -->
      <div v-else>
        <div class="story-web-header">
          <!-- <div class="story-web-actions">
            <Button 
              :label="localize('storyWeb.addCustomNode')"
              icon="pi pi-plus"
              @click="showAddCustomNodeDialog = true"
              severity="secondary"
              size="small"
            />
            <Button 
              :label="localize('common.save')"
              icon="pi pi-save"
              @click="saveStoryWeb"
              size="small"
            />
          </div> -->
        </div>

        <div class="story-web-graph-container">
          <StoryWebGraph
            ref="graphContainer"
            :story-web="currentStoryWeb"
            @drop="onDropGraph"
            @dragOver="onDragOver"
            @dragEnter="onDragEnter"
            @loading="onGraphLoading"
            @error="onGraphError"
          />
        </div>

        <!-- Custom Node Dialog -->
        <Dialog 
          v-model:visible="showAddCustomNodeDialog"
          :header="localize('storyWeb.addCustomNode')"
          :modal="true"
          :style="{ width: '400px' }"
        >
          <div class="custom-node-form">
            <div class="form-field">
              <label>{{ localize('storyWeb.nodeName') }}</label>
              <InputText v-model="customNodeForm.name" />
            </div>
            <div class="form-field">
              <label>{{ localize('storyWeb.nodeDescription') }}</label>
              <Textarea v-model="customNodeForm.description" rows="3" />
            </div>
          </div>
          <template #footer>
            <Button 
              :label="localize('common.cancel')"
              @click="showAddCustomNodeDialog = false"
              severity="secondary"
            />
            <Button 
              :label="localize('common.add')"
              @click="addCustomNode"
              :disabled="!customNodeForm.name"
            />
          </template>
        </Dialog>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';
  import { notifyWarn } from '@/utils/notifications';

  // library components

  // local components
  import StoryWebGraph from './StoryWebGraph.vue';

  // types
  import { StoryWeb } from '@/classes';
  import { WindowTabType } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentStoryWeb } = storeToRefs(mainStore);
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();

  ////////////////////////////////
  // data
  const name = ref<string>('');
  const graphContainer = ref<HTMLElement>();
  const showAddCustomNodeDialog = ref(false);
  const isGraphLoading = ref(false);
  const graphError = ref<string | null>(null);

  const customNodeForm = ref({
    name: '',
    description: ''
  });

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const saveStoryWeb = async () => {
    if (!currentStoryWeb.value || !graphContainer.value) return;
    
    try {
      // Get current graph state and save to story web
      const graphData = graphContainer.value.getGraphData();
      currentStoryWeb.value.nodes = graphData.nodes;
      currentStoryWeb.value.edges = graphData.edges;
      
      await currentStoryWeb.value.save();
      
      // Show success notification
      // TODO: Add notification system
      console.log('Story web saved successfully');
    } catch (error) {
      console.error('Failed to save story web:', error);
      // TODO: Show error notification
    }
  };

  const addCustomNode = async () => {
    if (!currentStoryWeb.value || !graphContainer.value || !customNodeForm.value.name) return;
    
    try {
      const nodeId = await graphContainer.value.addCustomNodeToGraph({
        label: customNodeForm.value.name,
        description: customNodeForm.value.description
      });
      
      // Reset form
      customNodeForm.value = { name: '', description: '' };
      showAddCustomNodeDialog.value = false;
      
      // Add to manually added items
      await currentStoryWeb.value.addManuallyAddedItem(nodeId);
      
    } catch (error) {
      console.error('Failed to add custom node:', error);
    }
  };

  ////////////////////////////////
  // event handlers
  const onDropGraph = async (event: DragEvent) => {
    console.log('Drop event fired on graph container');
    
    if (!graphContainer.value) {
      console.log('Graph container not available');
      return;
    }
    
    event.preventDefault();
    
    const data = event.dataTransfer?.getData('text/plain');
    console.log('Drop data received:', data);
    
    if (!data) {
      console.log('No drop data available');
      return;
    }
    
    try {
      const dropData = JSON.parse(data);
      console.log('Parsed drop data:', dropData);
      
      // Handle different types of dropped items
      if (dropData.type === 'directory-entry') {
        await graphContainer.value.addEntryToGraph(dropData.uuid, dropData.entryType);
      } else {
        console.log('Unknown drop data type:', dropData.type);
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  };

  const onDragOver = (event: DragEvent) => {
    console.log('Drag over event fired on graph container');
    event.preventDefault();
  };

  const onDragEnter = (event: DragEvent) => {
    console.log('Drag enter event fired on graph container');
    event.preventDefault();
  };

  const onGraphLoading = (isLoading: boolean) => {
    isGraphLoading.value = isLoading;
  };

  const onGraphError = (error: string | null) => {
    graphError.value = error;
  };

  // debounce changes to name
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('errors.nameRequired'));
        name.value = currentStoryWeb.value?.name!;
        return;
      }

      if (currentStoryWeb.value && currentStoryWeb.value.name!==newValue) {
        currentStoryWeb.value.name = newValue;
        await currentStoryWeb.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentStoryWeb.value.uuid]);
        await navigationStore.propagateNameChange(currentStoryWeb.value.uuid, newValue);
      }
    }, debounceTime);
  };

  // Initialize graph when component mounts
  onMounted(async () => {
    console.log('StoryWebContent mounted');
  });

  ////////////////////////////////
  // watchers
  // Watch for story web changes
  watch(currentStoryWeb, (newStoryWeb: StoryWeb | null) => {
    if (newStoryWeb && newStoryWeb.uuid) {
      name.value = newStoryWeb.name || '';

    // Update graph if story web config changes externally
    }
  }, { deep: true });

  ////////////////////////////////
  // lifecycle events
  // Cleanup
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);

    // Cleanup graph instance
    // This will be handled by the composable
  });

</script>

<style scoped>
.story-web-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  gap: 1rem;
}

.story-web-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.story-web-actions {
  display: flex;
  gap: 0.5rem;
}

.story-web-graph-container {
  flex: 1;
  min-height: 500px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.story-web-graph {
  width: 100%;
  height: 100%;
  position: relative;
}

.custom-node-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
