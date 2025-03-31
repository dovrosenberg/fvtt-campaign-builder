<template>
  <div class="wcb-play-session-tabs flexrow">
    <button
      v-for="tab in sessionTabs"
      :key="tab.id"
      class="wcb-play-tab-button"
      @click="onTabClick(tab.id)"
      :title="tab.label"
    >
      <i v-if="tab.icon" :class="`fas ${tab.icon}`"></i>
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useCampaignStore, useNavigationStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // types
  import { WindowTabType } from '@/types';

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const campaignStore = useCampaignStore();
  const navigationStore = useNavigationStore();
  const { currentContentTab } = storeToRefs(mainStore);
  const { currentPlayedCampaign } = storeToRefs(campaignStore);

  ////////////////////////////////
  // data
  const sessionTabs = computed(() => [
    { id: 'notes', label: localize('labels.tabs.session.notes'), icon: 'fa-pen-to-square' },
    { id: 'start', label: localize('labels.tabs.session.start'), icon: 'fa-play' },
    { id: 'lore', label: localize('labels.tabs.session.lore'), icon: 'fa-book-open' },
    { id: 'scenes', label: localize('labels.tabs.session.scenes'), icon: 'fa-map' },
    { id: 'locations', label: localize('labels.tabs.session.locations'), icon: 'fa-location-dot' },
    { id: 'npcs', label: localize('labels.tabs.session.npcs'), icon: 'fa-user' },
    { id: 'monsters', label: localize('labels.tabs.session.monsters'), icon: 'fa-dragon' },
    { id: 'magic', label: 'Items', icon: 'fa-wand-sparkles' },
  ]);

  ////////////////////////////////
  // methods
  /**
   * Handles the click on a session tab button
   * @param tabId The ID of the tab that was clicked
   */
  const onTabClick = async (tabId: string) => {
    // First, find the most recent session 
    const mostRecentSession = currentPlayedCampaign.value?.currentSession

    if (!mostRecentSession) 
      return;

    // Check if we already have a tab open to that session
    const activeTab = navigationStore.getActiveTab(false);
    const isSessionTabOpen = activeTab?.tabType === WindowTabType.Session &&
                            activeTab.contentId === mostRecentSession.uuid;

    // If there isn't a tab open to the most recent session, open one
    if (!isSessionTabOpen) {
      await navigationStore.openSession(mostRecentSession.uuid, { newTab: true });
    }

    // Set the current content tab to the selected tab
    currentContentTab.value = tabId;

    // Find the tab element in the DOM and click it to activate it
    const tabElement = document.querySelector(`.wcb-sheet-navigation a[data-tab="${tabId}"]`);
    if (tabElement) {
      (tabElement as HTMLElement).click();
    }
  };
</script>

<style lang="scss">
.wcb-play-session-tabs {
  padding: 5px;
  background-color: var(--wcb-header-background);
  border-bottom: 1px solid var(--wcb-header-border-color);
  gap: 4px;

  .wcb-play-tab-button {
    margin: 2px;
    padding: 5px 8px;
    border-radius: 4px;
    background-color: var(--wcb-header-nav-btn-background);
    color: var(--wcb-header-nav-color);
    border: 1px solid var(--wcb-header-nav-btn-border);
    font-size: 12px;
    align-items: center;
    justify-content: center;

    i {
      margin-right: 5px;
    }

    &:hover {
      background-color: var(--wcb-header-nav-btn-background-hover);
      box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
    }
  }

  @container (max-width: 660px) {
    .wcb-play-tab-button {
      padding: 5px;

      i {
        margin-right: 0;
      }

      .tab-label {
        display: none;
      }
    }
  }
}
</style>