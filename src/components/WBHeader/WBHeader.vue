<template>
  <header 
    ref="root"
    class="wcb-header flexcol"
  >
    <div class="wcb-tab-bar flexrow">
      <div class="wcb-tab-row flexrow">
        <WBHeaderTab
          v-for="tab in tabs"
          :key="tab.id"
          :tab="tab"
          @close-tab="onCloseTab"
        />

        <div
          id="wcb-add-tab"
          class="wcb-tab flexrow"
          title="Open new tab"
          @click="onAddTabClick"
        >
          <div class="wcb-tab-icon">
            <i class="fas fa-plus"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Play Mode Navigation (only visible in play mode) -->
    <PlayModeNavigation />

    <div class="wcb-bookmark-bar flexrow">
      <div 
        id="wcb-add-bookmark" 
        :class="(!navigationStore.getActiveTab(false)?.header?.uuid ? 'disabled' : '')"
        :title="localize('tooltips.addBookmark')"
        @click="onAddBookmarkClick"
      >
        <i class="fas fa-star"></i>
      </div>

      <WBBookmark 
        v-for="bookmark in bookmarks"
        :key="bookmark.id"
        :bookmark="bookmark"
      />
    </div>

    <div class="navigation flexrow">
      <div 
        id="wcb-history-back" 
        :class="'nav-button ' + (canBack() ? '' : 'disabled')" 
        :title="localize('tooltips.historyBack')"
        @click="onHistoryBackClick"
      >
        <i class="fas fa-chevron-left"></i>
      </div>
      <div 
        id="wcb-history-forward" 
        :class="'nav-button ' + (canForward() ? '' : 'disabled')" 
        :title="localize('tooltips.historyForward')"
        @click="onHistoryForwardClick"
      >
        <i class="fas fa-chevron-right"></i>
      </div>
      <!--<hr class="vertical" />
      <div class="button-group flexrow" id="journal-buttons"></div>-->
    </div>
  </header>
</template> 

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { useMainStore, useNavigationStore } from '@/applications/stores';

  // library components

  // local components
  import WBHeaderTab from './WBHeaderTab.vue';
  import WBBookmark from './WBBookmark.vue';
  import PlayModeNavigation from './PlayModeNavigation/PlayModeNavigation.vue';

  // types
  import { Bookmark, } from '@/types';
  import { WindowTab, } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorld, isInPlayMode } = storeToRefs(mainStore);
  const { tabs, bookmarks } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  const root = ref<HTMLElement | null>(null);
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const canBack = function (tab?: WindowTab): boolean {
    const checkTab = tab || navigationStore.getActiveTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx > 0 );
  };

  const canForward = function (tab?: WindowTab): boolean {
    const checkTab = tab || navigationStore.getActiveTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx < checkTab.history.length-1);
  };

  // moves forward/back through the history "move" spaces (or less if not possible); negative numbers move back
  const navigateHistory = async function (move: number) {
    const tab = navigationStore.getActiveTab();

    if (!tab) return;

    const newSpot = Math.clamp(tab.historyIdx + move, 0, tab.history.length-1);

    // if we didn't move, return
    if (newSpot === tab.historyIdx)
      return;

    tab.historyIdx = newSpot;
    await navigationStore.openContent(tab.history[tab.historyIdx].contentId, tab.history[tab.historyIdx].tabType, { activate: false, newTab: false, updateHistory: false});  // will also save the tab and update recent
  };

  ////////////////////////////////
  // event handlers

  // remove the tab given by the id from the list
  const onCloseTab = function (tabId: string) {
    void navigationStore.removeTab(tabId);
  };

  // add the current tab as a new bookmark
  const onAddBookmarkClick = async (): Promise<void> => {
    //get the current tab and save the entity and name
    const tab = navigationStore.getActiveTab(false);

    if (!tab?.header?.uuid)
      return;

    // see if a bookmark for the entry already exists
    if (bookmarks.value.find((b) => (b.header.uuid === tab?.header?.uuid)) != undefined) {
      ui?.notifications?.warn(localize('errors.duplicateBookmark') || '');
      return;
    }

    const bookmark = {
      id: foundry.utils.randomID(),
      header: tab.header,
      tabInfo: {
        tabType: tab.tabType,
        contentId: tab.contentId,
      }
    } as Bookmark;

    await navigationStore.addBookmark(bookmark);
  };

  const onAddTabClick = async () => { await navigationStore.openEntry(); };

  const onHistoryBackClick = () => { void navigateHistory(-1); };
  const onHistoryForwardClick = () => { void navigateHistory(1); };

  ////////////////////////////////
  // watchers
  watch(currentWorld, async (newValue, oldValue): Promise<void> => {
    if (!newValue || newValue.uuid === oldValue?.uuid)
      return;

    await navigationStore.loadTabs();
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // set the active tab
    const tab = navigationStore.getActiveTab();
    if (tab)
      await navigationStore.activateTab(tab.id);
  });


</script>

<style lang="scss">
.wcb-header {
  color: var(--wcb-header-color);
  background-color: var(--wcb-header-background);
  flex-grow: 0;

  & > * {
    flex: 0 0 30px;
    border-bottom: 1px solid var(--wcb-header-border-color);
  }

  // tab bar
  .wcb-tab-bar {
    position: relative;
    transition: padding-right 0.5s;
    padding: 4px 2px 0px 4px;
    flex: 0 0 34px;
    color: var(--wcb-header-tab-color);
  }

  #wcb-add-tab {
    flex: 0 0 30px;
    justify-content: center;

    .wcb-tab-icon {
      margin: 0px;
    }
  }

  // Bookmark bar
  .wcb-bookmark-bar {
    padding-left: 2px;
    flex: 0 0 36px;
    color: var(--wcb-header-bookmark-color);
  }

  // Navigation bar 
  .navigation {
    color: var(--wcb-header-nav-color);
    background: var(--wcb-header-nav-background);
    padding: 2px;

    hr.vertical {
      height: 100%;
      width: 1px;
      border-right: 2px groove var(--wcb-header-nav-vertical-line);
      flex: 0 0 1px;
      margin: 0px 2px;
    }

    .button-group {
      justify-content: flex-end;
      flex-wrap: nowrap;
    }

    .nav-button {
      flex: 0 0 24px;
      text-align: center;
      line-height: 24px;
      font-size: 14px;
      margin-right: 4px;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid var(--wcb-header-nav-btn-border);
      margin-top: 1px;
      background: var(--wcb-header-nav-btn-background);
    }

    .nav-button:not(.disabled):hover {
      box-shadow: 0 0 5px red;
      cursor: pointer;
      background: var(--wcb-header-nav-btn-background-hover);
    }

    .nav-button.disabled {
      color: var(--wcb-header-nav-btn-disabled);
      background: var(--wcb-header-nav-btn-background-disabled);
      border-color: var(--wcb-header-nav-btn-border-disabled);
    }

    .nav-input {
      margin-right: 4px !important;
      margin-top: 1px;
      height: 25px !important;
      border-radius: 4px;
      flex: 0 0 200px;
      border: 1px solid var(--wcb-header-nav-input-border);
      background: var(--wcb-header-nav-input-background);
      color: var(--wcb-header-nav-input-color);
    }

    .nav-input::placeholder {
      color: var(--wcb-header-nav-input-placeholder-color);
    }

    .nav-input:focus {
      background: var(--wcb-header-nav-input-focus-background);
      border: 1px solid var(--wcb-header-nav-input-focus-border);
      color: var(--wcb-header-nav-input-focus-color);
    }

    .nav-text {
      flex-shrink: 1;
      flex-basis: auto;
      flex-grow: 0;
      padding: 4px;
      font-size: 12px;
      line-height: 10px;
    }

    .button-group .nav-text i.fa-search {
      padding-top: 4px;
    }

    #context-menu li {
      text-align: left;
    }
  }
}
</style>