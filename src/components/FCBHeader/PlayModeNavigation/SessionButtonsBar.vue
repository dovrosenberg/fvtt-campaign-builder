<!--
SessionButtonsBar: Session Buttons Bar

Purpose
- Displays navigation buttons for session-related tabs during play mode

Responsibilities
- Show session tabs (notes, lore, vignettes, locations, NPCs, monsters, items, to-do)
- Handle tab clicks to navigate to session content
- Open to-do dialog when clicking to-do button

Props
- None

Emits
- None

Slots
- None

Dependencies
- Stores: mainStore, playingStore, navigationStore
- Dialogs: FCBDialog

-->

<template>
  <div class="fcb-play-session-tabs flexrow">
    <button
      v-for="tab in sessionButtons"
      :key="tab.id"
      class="fcb-play-tab-button"
      :data-testid="`session-tab-button-${tab.id}`"
      @click="onTabClick($event, tab.id)"
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
  import { useMainStore, usePlayingStore, useNavigationStore, useCampaignStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { openSessionNotes, } from '@/applications/SessionNotes';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { FCBDialog } from '@/dialogs';

  // types
  import { TabVisibilityItem } from '@/types';

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const playingStore = usePlayingStore();
  const navigationStore = useNavigationStore();
  const campaignStore = useCampaignStore();
  const { currentContentTab } = storeToRefs(mainStore);
  const { currentPlayedCampaign } = storeToRefs(playingStore);

  ////////////////////////////////
  // data
  // Get tab visibility settings 
  const tabVisibility = computed(() => {
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tabVisibilitySettings);
  });

  // note the ids need to match the tab ids in SessionContent.vue
  // noteBox and notes are always shown (like description tabs)
  const sessionButtons = computed(() => {
    const buttons = [
      { id: 'noteBox', label: localize('labels.tabs.session.noteBox'), icon: 'fa-external-link' },
      { id: 'notes', label: localize('labels.tabs.session.notes'), icon: 'fa-pen-to-square' },
    ];

    // Lore tab
    if (tabVisibility.value[TabVisibilityItem.SessionLore]) {
      buttons.push({ id: 'lore', label: localize('labels.tabs.session.lore'), icon: 'fa-book-open' });
    }

    // Vignettes tab
    if (tabVisibility.value[TabVisibilityItem.SessionVignettes]) {
      buttons.push({ id: 'vignettes', label: localize('labels.tabs.session.vignettes'), icon: 'fa-map' });
    }

    // Locations tab
    if (tabVisibility.value[TabVisibilityItem.SessionLocations]) {
      buttons.push({ id: 'locations', label: localize('labels.tabs.session.locations'), icon: 'fa-location-dot' });
    }

    // NPCs tab
    if (tabVisibility.value[TabVisibilityItem.SessionNPCs]) {
      buttons.push({ id: 'npcs', label: localize('labels.tabs.session.npcs'), icon: 'fa-user' });
    }

    // Monsters tab
    if (tabVisibility.value[TabVisibilityItem.SessionMonsters]) {
      buttons.push({ id: 'monsters', label: localize('labels.tabs.session.monsters'), icon: 'fa-dragon' });
    }

    // Magic/Items tab
    if (tabVisibility.value[TabVisibilityItem.SessionMagic]) {
      buttons.push({ id: 'magic', label: 'Items', icon: 'fa-wand-sparkles' });
    }

    // To-Do tab (opens dialog to create a new to-do)
    if (tabVisibility.value[TabVisibilityItem.CampaignToDo]) {
      buttons.push({ id: 'toDo', label: localize('labels.tabs.session.toDo'), icon: 'fa-check-square' });
    }

    return buttons;
  });

  ////////////////////////////////
  // methods
  /**
   * Handles the click on a session tab button
   * @param tabId The ID of the tab that was clicked
   */
  const onTabClick = async (event: MouseEvent, tabId: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentPlayedCampaign.value)
      return;
    
    // First, find the most recent session 
    const currentSessionId = currentPlayedCampaign.value.currentSessionId;
    const currentSessionNumber = currentPlayedCampaign.value.currentSessionNumber;
    if (!currentSessionId || currentSessionNumber==null)
      return;

    // special case - open to-do dialog
    if (tabId === 'toDo') {
      await campaignStore.promptAndAddToDo(currentPlayedCampaign.value.uuid);
      return;
    } else if (tabId === 'noteBox') {  // special case - it's the popout box
      await openSessionNotes(currentSessionNumber, false);  
      return;
    } else {
      // Check if we already have a tab open to that session (search all panels)
      const sessionTab = navigationStore.findTabAcrossPanels(currentSessionId);

      // If there isn't a tab open to the most recent session, open one
      if (!sessionTab) {
        await navigationStore.openSession(currentSessionId, { newTab: true });
      } else {
        // it exists- so switch to it
        await navigationStore.activateTab(sessionTab.tab.id, false, sessionTab.panelIndex);
      }
    }

    // Set the current content tab to the selected tab based on the button
    currentContentTab.value = tabId;
  };
</script>

<style lang="scss">
.fcb-play-session-tabs {
  // background-color: var(--fcb-header-background);
  border-bottom: 1px solid var(--fcb-header-border-color);
  gap: 2px;
  padding: 2px;

  .fcb-play-tab-button {
    margin: 0px;
    padding: 5px 8px;
    border-radius: 4px;
    background-color: var(--fcb-surface-3);
    color: var(--fcb-text);
    border: 1px solid transparent;
    font-size: 12px;
    align-items: center;
    justify-content: center;
    padding: 6px;

    i {
      margin-right: 5px;
    }

    &:hover {
      color: var(--fcb-button-color-hover);
      background-color: var(--fcb-button-bg-hover);
      border-color: var(--fcb-control-border-hover);
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