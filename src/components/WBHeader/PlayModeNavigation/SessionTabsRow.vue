<template>
  <div class="wcb-play-session-tabs flexrow">
    <button 
      v-for="tab in sessionTabs" 
      :key="tab.id"
      class="wcb-play-tab-button"
      @click="onTabClick(tab.id)"
    >
      <i v-if="tab.icon" :class="`fas ${tab.icon}`"></i>
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // types

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentSession, currentContentTab } = storeToRefs(mainStore);

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
    { id: 'magic', label: localize('labels.tabs.session.magic'), icon: 'fa-wand-sparkles' },
  ]);

  ////////////////////////////////
  // methods
  const onTabClick = (tabId: string) => {
    if (!currentSession.value) return;
    
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
  display: flex;
  flex-wrap: wrap;
  padding: 5px;
  background-color: var(--wcb-header-background);
  border-bottom: 1px solid var(--wcb-header-border-color);

  .wcb-play-tab-button {
    margin: 2px;
    padding: 5px 10px;
    border-radius: 4px;
    background-color: var(--wcb-header-nav-btn-background);
    color: var(--wcb-header-nav-color);
    border: 1px solid var(--wcb-header-nav-btn-border);
    cursor: pointer;
    font-size: 12px;
    display: flex;
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
}
</style>