<template>
  <div class="campaign-selector-container" v-if="showSelector">
    <label for="campaign-selector">{{localize('labels.fields.campaign')}}:</label>
    <Select
      id="campaign-selector"
      v-model="selectedCampaignId"
      :options="playableCampaigns"
      optionLabel="name"
      optionValue="uuid"
      size="small"
      :pt="{
        root: { class: 'fcb-dropdown' },
        input: { class: 'fcb-dropdown-input' },
        panel: { class: 'fcb-dropdown-panel' },
        item: { class: 'fcb-dropdown-item' }
      }"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, usePlayingStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { SessionNotesApplication } from '@/applications/SessionNotes';
  import { hasUnsavedChanges, saveAndCloseAllActiveEditors, closeAllActiveEditors } from '@/utils/editorChangeDetection';
  import { saveChangesDialog, SaveChangesResult } from '@/dialogs/saveChanges';
  import { notifyError, notifyInfo } from '@/utils/notifications';

  // library components
  import Select from 'primevue/select';


  // types

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const playingStore = usePlayingStore();
  const { isInPlayMode } = storeToRefs(mainStore);
  const { playableCampaigns } = storeToRefs(playingStore);
  const { currentPlayedCampaignId } = storeToRefs(playingStore);

  ////////////////////////////////
  // data
  
  // Local ref for the selected campaign to intercept changes
  const selectedCampaignId = ref<string | null>(currentPlayedCampaignId.value);

  // Only show the selector if there are multiple campaigns
  const showSelector = computed(() => {
    return isInPlayMode.value && playableCampaigns.value.length > 1;
  });

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods


  ////////////////////////////////
  // watchers
  
  // Keep local ref in sync with store
  watch(() => currentPlayedCampaignId.value, (newValue) => {
    selectedCampaignId.value = newValue;
  }, { immediate: true });
  
  // Intercept campaign changes to handle cleanup
  watch(selectedCampaignId, async (newValue, oldValue) => {
    // Skip if no actual change or initializing
    if (newValue === oldValue || oldValue === null) {
      return;
    }

    // NOTE: the change to the global has to happen at the very end
    //    because it will trigger a current session change
    // Check for unsaved changes in editors
    if (hasUnsavedChanges()) {
      const result = await saveChangesDialog();
      
      if (result === SaveChangesResult.Cancel) {
        // Revert the selection
        selectedCampaignId.value = oldValue;
        return;
      } else if (result === SaveChangesResult.Save) {
        // Save all changes before switching
        try {
          await saveAndCloseAllActiveEditors();
        } catch (error) {
          notifyError('Failed to save editors: ' + error);
          // Revert the selection if save fails
          selectedCampaignId.value = oldValue;
          return;
        }
      } else {
        // Discard changes
        notifyInfo(localize('notifications.changesDiscarded'));
        // Close all editors without saving
        await closeAllActiveEditors();
      }
    }
    
    // Close session notes window (which will save if dirty)
    // This mimics what happens when exiting play mode
    await SessionNotesApplication.close();
    
    // Now update the store to trigger the actual campaign switch
    currentPlayedCampaignId.value = newValue;
  });

  ////////////////////////////////
  // lifecycle events
</script>

<style lang="scss">
.campaign-selector-container {
  display: flex;
  align-items: center;
  margin-right: 10px;

  label {
    margin-right: 8px;
    font-weight: bold;
    color: var(--fcb-gray-300) !important;
  }

  .fcb-dropdown {
    min-width: 150px;
    font-size: 0.75rem !important;

    .fcb-dropdown-input {
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid var(--fcb-control-border);
      background-color: var(--fcb-control-bg);
      color: var(--fcb-text);
      font-size: 0.75rem !important;
      height: 1.5rem;

      &:hover {
        border-color: #2196F3;
      }

      &:focus {
        outline: none;
        border-color: #2196F3;
        box-shadow: 0 0 3px rgba(33, 150, 243, 0.5);
      }
    }
  }
}

.fcb-dropdown-panel {
  border-radius: 3px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);

  .fcb-dropdown-item {
    padding: 4px 8px;
    font-size: 0.75rem !important;

    &:hover {
      background-color: rgba(33, 150, 243, 0.1);
    }

    &.p-highlight {
      background-color: #2196F3;
      color: #fff;
    }
  }
}
</style>