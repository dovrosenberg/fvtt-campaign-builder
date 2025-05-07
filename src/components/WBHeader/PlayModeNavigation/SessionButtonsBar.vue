<template>
  <div class="fcb-play-session-tabs flexrow">
    <button
      v-for="tab in sessionButtons"
      :key="tab.id"
      class="fcb-play-tab-button"
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
  import { computed,  } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useCampaignStore, useNavigationStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // types

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const campaignStore = useCampaignStore();
  const navigationStore = useNavigationStore();
  const { currentContentTab } = storeToRefs(mainStore);
  const { currentPlayedCampaign } = storeToRefs(campaignStore);
  const { tabs } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  const sessionButtons = computed(() => [
    { id: 'notes', label: localize('labels.tabs.session.notes'), icon: 'fa-pen-to-square' },
    { id: 'start', label: localize('labels.tabs.session.start'), icon: 'fa-play' },
    { id: 'lore', label: localize('labels.tabs.session.lore'), icon: 'fa-book-open' },
    { id: 'vignettes', label: localize('labels.tabs.session.vignettes'), icon: 'fa-map' },
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
    const currentSession = currentPlayedCampaign.value?.currentSession;

    if (!currentSession) 
      return;

    // Check if we already have a tab open to that session
    const sessionTab = tabs.value.find((t) => t.header?.uuid === currentSession.uuid);

      // If there isn't a tab open to the most recent session, open one
    if (!sessionTab) {
      await navigationStore.openSession(currentSession.uuid, { newTab: true });
    } else {
      // it exists- so switch to it
      await navigationStore.activateTab(sessionTab.id);
    }

    // Set the current content tab to the selected tab based on the button
    currentContentTab.value = tabId;
  };
</script>

<style lang="scss">
.fcb-play-session-tabs {
  background-color: var(--fcb-header-background);
  border-bottom: 1px solid var(--fcb-header-border-color);
  gap: 2px;

  .fcb-play-tab-button {
    margin: 0px;
    padding: 5px 8px;
    border-radius: 4px;
    background-color: var(--color-light-5);
    color: white;
    border: 1px solid transparent;
    font-size: 12px;
    align-items: center;
    justify-content: center;

    i {
      margin-right: 5px;
    }

    &:hover {
      color: var(--fcb-header-nav-btn-color-hover);
      background-color: var(--fcb-header-nav-btn-background-hover);
      box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
    }
  }

  @container (max-width: 660px) {
    .fcb-play-tab-button {
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