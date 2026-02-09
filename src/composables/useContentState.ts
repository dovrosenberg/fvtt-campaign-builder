// Helper composable for content components to get panel-scoped content state.
// Tries to inject TabPanelState first (when inside a TabPanel), falls back to
// mainStore refs (for dialogs and components rendered outside a TabPanel).

// library imports
import { inject } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { useMainStore } from '@/applications/stores';
import { TAB_PANEL_STATE_KEY } from '@/composables/useTabPanelState';

/**
 * Returns panel-scoped content refs when inside a TabPanel
 * When not in a panel (ex. a dialog), falls back to the mainstore refs, which
 *    return the values for the currently active panel
 * Content components should use this instead of storeToRefs(mainStore) for content-specific refs
 *
 * Global refs (isInPlayMode, etc.) should still be read from storeToRefs(mainStore).
 */
export function useContentState() {
  const panelState = inject(TAB_PANEL_STATE_KEY, null);

  if (panelState) {
    return {
      currentSetting: useMainStore().currentSetting,  // just pass through - they're all the same
      currentEntry: panelState.currentEntry,
      currentCampaign: panelState.currentCampaign,
      currentSession: panelState.currentSession,
      currentArc: panelState.currentArc,
      currentFront: panelState.currentFront,
      currentStoryWeb: panelState.currentStoryWeb,
      currentTab: panelState.currentTab,
      currentContentType: panelState.currentContentType,
      currentContentId: panelState.currentContentId,
      currentContentTab: panelState.currentContentTab,
      currentTag: panelState.currentTag,
      currentEntryTopic: panelState.currentEntryTopic,
      refreshCurrentEntry: panelState.refreshCurrentEntry,
    };
  }

  // fallback to mainStore refs when outside a TabPanel (e.g. dialogs)
  const mainStore = useMainStore();
  const { 
    currentSetting,
    currentEntry,
    currentCampaign,
    currentSession,
    currentArc,
    currentFront,
    currentStoryWeb,
    currentTab,
    currentContentType,
    currentContentId,
    currentContentTab,
    currentTag,
    currentEntryTopic,
    refreshCurrentEntry
  } = storeToRefs(mainStore);

  return {
    currentSetting,
    currentEntry,
    currentCampaign,
    currentSession,
    currentArc,
    currentFront,
    currentStoryWeb,
    currentTab,
    currentContentType,
    currentContentId,
    currentContentTab,
    currentTag,
    currentEntryTopic,
    refreshCurrentEntry
  }
}
