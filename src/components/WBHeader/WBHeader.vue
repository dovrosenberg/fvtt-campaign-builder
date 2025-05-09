<template>
  <header 
    ref="root"
    class="fcb-header flexcol"
  >
    <div class="fcb-tab-bar flexrow">
      <div class="fcb-tab-row flexrow">
        <WBHeaderTab
          v-for="tab in tabs"
          :key="tab.id"
          :tab="tab"
          @close-tab="onCloseTab"
        />

        <div
          id="fcb-add-tab"
          class="fcb-tab flexrow"
          title="Open new tab"
          @click="onAddTabClick"
        >
          <div class="fcb-tab-icon">
            <i class="fas fa-plus"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Play Mode Navigation (only visible in play mode) -->
    <PlayModeNavigation />

    <div class="fcb-bookmark-bar flexrow">
      <div 
        id="fcb-history-back" 
        :class="'nav-button ' + (canBack() ? '' : 'disabled')" 
        :title="localize('tooltips.historyBack')"
        @click="onHistoryBackClick"
      >
        <i class="fas fa-chevron-left"></i>
      </div>
      <div 
        id="fcb-history-forward" 
        :class="'nav-button ' + (canForward() ? '' : 'disabled')" 
        :title="localize('tooltips.historyForward')"
        @click="onHistoryForwardClick"
      >
        <i class="fas fa-chevron-right"></i>
      </div>
      <hr class="vertical" />

      <div 
        id="fcb-add-bookmark" 
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
  const { currentWorld, } = storeToRefs(mainStore);
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

    // Restore the content tab from history
    if (tab.history[tab.historyIdx].contentTab) {
      mainStore.currentContentTab = tab.history[tab.historyIdx].contentTab;
    }
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
.fcb-header {
  color: var(--fcb-header-color);
  // background-color: var(--fcb-header-background);
  flex-grow: 0;

  & > * {
    flex: 0 0 30px;
    border-bottom: 1px solid var(--fcb-header-border-color);
  }

  // tab bar
  .fcb-tab-bar {
    position: relative;
    transition: padding-right 0.5s;
    padding: 4px 2px 0px 4px;
    flex: 0 0 34px;
    color: var(--fcb-header-tab-color);
  }

  #fcb-add-tab {
    flex: 0 0 30px;
    justify-content: center;

    .fcb-tab-icon {
      margin: 0px;
    }
  }

  // Bookmark bar
  .fcb-bookmark-bar {
    padding-left: 2px;
    flex: 0 0 36px;
    color: var(--fcb-header-nav-btn-color);

    hr.vertical {
      height: 100%;
      width: 1px;
      border-right: 2px groove var(--fcb-header-nav-vertical-line);
      flex: 0 0 1px;
      margin: 0px 2px;
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
      border: 1px solid var(--fcb-header-nav-btn-border);
      margin-top: 1px;
      background: var(--fcb-header-nav-btn-background);

      &:not(.disabled):hover {
        box-shadow: 0 0 5px red;
        cursor: pointer;
        background: var(--fcb-header-nav-btn-background-hover);
      }

      &.disabled {
        color: var(--fcb-header-nav-btn-disabled);
        background: var(--fcb-header-nav-btn-background-disabled);
        border-color: var(--fcb-header-nav-btn-border-disabled);
      }
    }

    #context-menu li {
      text-align: left;
    }
  }
}
</style>