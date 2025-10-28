<template>
  <header 
    ref="root"
    class="fcb-header flexcol"
  >
    <div class="fcb-tab-bar flexrow">
      <div class="fcb-tab-row flexrow">
        <FCBHeaderTab
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
        :class="'nav-button ' + (canBack ? '' : 'disabled')" 
        :title="localize('tooltips.historyBack')"
        @click="onHistoryBackClick"
      >
        <i class="fas fa-chevron-left"></i>
      </div>
      <div 
        id="fcb-history-forward" 
        :class="'nav-button ' + (canForward ? '' : 'disabled')" 
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

      <div ref="bookmarksContainer" class="fcb-bookmarks-container">
        <FCBBookmark 
          v-for="(bookmark, index) in visibleBookmarks"
          :key="bookmark.id"
          :bookmark="bookmark"
          :class="getBookmarkClass(index)"
        />
        
        <div
          v-if="overflowBookmarks.length > 0"
          ref="overflowButton"
          class="fcb-bookmark-overflow"
          :title="localize('tooltips.moreBookmarks')"
          @click="onOverflowClick"
        >
          <i class="fas fa-chevron-down"></i>
        </div>
      </div>
    </div>
  </header>
</template> 

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
  import { storeToRefs } from 'pinia';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local imports
  import { localize } from '@/utils/game';
  import { useMainStore, useNavigationStore } from '@/applications/stores';

  // library components

  // local components
  import FCBHeaderTab from './FCBHeaderTab.vue';
  import FCBBookmark from './FCBBookmark.vue';
  import PlayModeNavigation from './PlayModeNavigation/PlayModeNavigation.vue';

  // types
  import { Bookmark, } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentSetting, } = storeToRefs(mainStore);
  const { tabs, bookmarks } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  const root = ref<HTMLElement | null>(null);
  const bookmarksContainer = ref<HTMLElement | null>(null);
  const overflowButton = ref<HTMLElement | null>(null);
  const visibleCount = ref<number>(0); // Start with none visible
  const isOverflowMenuOpen = ref<boolean>(false);
  let resizeObserver: ResizeObserver | null = null;
  
  ////////////////////////////////
  // computed data
  const visibleBookmarks = computed(() => {
    // Always return all bookmarks initially for measurement
    // The visibility will be controlled by CSS classes
    return bookmarks.value;
  });

  const overflowBookmarks = computed(() => {
    if (visibleCount.value === 0 || visibleCount.value >= bookmarks.value.length) return [];
    return bookmarks.value.slice(visibleCount.value);
  });

  const getBookmarkClass = (index: number): string => {
    if (index >= visibleCount.value) {
      return 'fcb-bookmark-hidden';
    }
    return '';
  };

  ////////////////////////////////
  // methods
  const calculateVisibleBookmarks = (): void => {
    if (!bookmarksContainer.value) {
      visibleCount.value = 0;
      return;
    }

    const container = bookmarksContainer.value;
    const containerWidth = container.offsetWidth;
    
    // If container has no width yet, wait for layout
    if (containerWidth === 0) {
      visibleCount.value = 0;
      return;
    }
    
    // Get all children but filter out the overflow button
    const allChildren = Array.from(container.children) as HTMLElement[];
    const bookmarkElements = allChildren.filter(el => !el.classList.contains('fcb-bookmark-overflow'));
    
    if (bookmarkElements.length === 0) {
      visibleCount.value = bookmarks.value.length;
      return;
    }

    // Temporarily make hidden bookmarks invisible (not display:none) for measurement
    const previouslyHidden: HTMLElement[] = [];
    bookmarkElements.forEach(el => {
      if (el.classList.contains('fcb-bookmark-hidden')) {
        el.classList.remove('fcb-bookmark-hidden');
        el.classList.add('fcb-bookmark-measuring');
        previouslyHidden.push(el);
      }
    });

    // Get the actual overflow button width if it exists, or use estimate
    const overflowBtn = overflowButton.value;
    const overflowButtonWidth = overflowBtn ? overflowBtn.offsetWidth + parseInt(getComputedStyle(overflowBtn).marginLeft || '0') : 40;
    let totalWidth = 0;
    let count = 0;

    for (let i = 0; i < bookmarkElements.length; i++) {
      const element = bookmarkElements[i];
      const elementWidth = element.offsetWidth + parseInt(getComputedStyle(element).marginLeft || '0');
      
      // Check if this bookmark would fit
      const widthNeeded = i < bookmarkElements.length - 1 ? totalWidth + elementWidth + overflowButtonWidth : totalWidth + elementWidth;
      
      if (widthNeeded > containerWidth) {
        break;
      }
      
      totalWidth += elementWidth;
      count++;
    }

    // Restore hidden class for elements that should remain hidden
    previouslyHidden.forEach(el => {
      el.classList.remove('fcb-bookmark-measuring');
      el.classList.add('fcb-bookmark-hidden');
    });

    visibleCount.value = count;
  };

  const showBookmarkContextMenu = (bookmark: Bookmark, e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: e.clientX,
      y: e.clientY,
      zIndex: 301,
      items: [
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.bookmarks.delete'), 
          onClick: () => {
            void navigationStore.removeBookmark(bookmark.id);
            isOverflowMenuOpen.value = false;
            ContextMenu.closeContextMenu();
          }
        },
      ]
    });
  };

  const onOverflowClick = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    // Check both state and DOM to see if menu is open
    const menuExists = document.querySelector('.fcb-bookmark-overflow-menu') !== null;
    
    if (isOverflowMenuOpen.value || menuExists) {
      // Menu is open, close it
      ContextMenu.closeContextMenu();
      await nextTick();
      isOverflowMenuOpen.value = false;
      return;
    }

    // Position menu below the button
    const buttonRect = overflowButton.value?.getBoundingClientRect();
    const x = buttonRect ? buttonRect.left : event.x;
    const y = buttonRect ? buttonRect.bottom + 2 : event.y;

    await nextTick();
    isOverflowMenuOpen.value = true;

    ContextMenu.showContextMenu({
      customClass: 'fcb fcb-bookmark-overflow-menu',
      x: x,
      y: y,
      zIndex: 300,
      items: overflowBookmarks.value.map((bookmark, index) => ({
        icon: bookmark.header.icon || 'fa-bookmark',
        iconFontClass: 'fas',
        label: bookmark.header.name,
        customClass: `fcb-overflow-item-${index}`,
        onClick: () => {
          isOverflowMenuOpen.value = false;
          void navigationStore.openContent(bookmark.header.uuid, bookmark.tabInfo.tabType, { newTab: false });
        }
      })),
      onClose: () => {
        isOverflowMenuOpen.value = false;
      }
    });

    // Add right-click handlers to menu items after menu renders
    setTimeout(() => {
      const menuElement = document.querySelector('.fcb-bookmark-overflow-menu');
      if (menuElement) {
        overflowBookmarks.value.forEach((bookmark, index) => {
          const menuItem = menuElement.querySelector(`.fcb-overflow-item-${index}`);
          if (menuItem) {
            menuItem.addEventListener('contextmenu', (e) => {
              showBookmarkContextMenu(bookmark, e as MouseEvent);
            });
          }
        });
      }
    }, 10);
  };

  const canBack = computed(() => {
    const checkTab = navigationStore.getActiveTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx > 0 );
  });

  const canForward = computed(() => {
    const checkTab = navigationStore.getActiveTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx < checkTab.history.length-1);
  });


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

  const onHistoryBackClick = () => { void navigationStore.navigateHistory(-1); };
  const onHistoryForwardClick = () => { void navigationStore.navigateHistory(1); };

  ////////////////////////////////
  // watchers
  watch(currentSetting, async (newValue, oldValue): Promise<void> => {
    if (!newValue || newValue.uuid === oldValue?.uuid)
      return;

    await navigationStore.loadTabs();
  });

  watch(bookmarks, async () => {
    await nextTick();
    calculateVisibleBookmarks();
  }, { deep: true });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // set the active tab
    const tab = navigationStore.getActiveTab();
    if (tab)
      await navigationStore.activateTab(tab.id);

    // Setup resize observer for bookmark overflow detection
    await nextTick();
    if (bookmarksContainer.value) {
      resizeObserver = new ResizeObserver(() => {
        // Debounce resize calculations
        setTimeout(() => calculateVisibleBookmarks(), 10);
      });
      resizeObserver.observe(bookmarksContainer.value);
      
      // Initial calculation immediately after mount
      requestAnimationFrame(() => calculateVisibleBookmarks());
    }
  });

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });


</script>

<style lang="scss">
.fcb-header {
  color: var(--fcb-header-color);
  // background-color: var(--fcb-header-background);
  flex-grow: 0;

  & > * {
    flex: 0 0 1.875rem;
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
    flex: 0 0 2.25rem;
    color: var(--fcb-header-nav-btn-color);
    overflow: hidden;
    display: flex;
    flex-direction: row;
    align-items: center;

    .fcb-bookmarks-container {
      display: flex;
      flex-direction: row;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      justify-content: flex-start;

      .fcb-bookmark-hidden {
        display: none;
      }

      .fcb-bookmark-measuring {
        visibility: hidden;
        position: absolute;
      }
    }

    .fcb-bookmark-overflow {
      flex: 0 0 1.5rem;
      height: 1.5rem;
      border-radius: 4px;
      margin-left: 4px;
      margin-top: 0.0625rem;
      padding: 0px 8px;
      font-size: var(--fcb-font-size-large);
      cursor: pointer;
      text-align: center;
      line-height: 1.5rem;
      border: 1px solid var(--fcb-button-border);
      background: var(--fcb-button-bg);

      &:hover {
        background: var(--fcb-button-bg-hover);
        border-color: var(--fcb-button-border-hover);
        color: var(--fcb-button-text-hover);
      }
    }

    hr.vertical {
      height: 80%;
      width: 1px;
      border-right: 2px groove var(--fcb-header-nav-vertical-line);
      flex: 0 0 auto;
      margin: 0px 2px;
    }

    #fcb-add-bookmark {
      flex: 0 0 auto;
    }

    .nav-button {
      flex: 0 0 auto;
      text-align: center;
      line-height: 1.5rem;
      font-size: var(--fcb-font-size-large);
      margin-right: 4px;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 4px;
      border: 1px solid var(--fcb-header-nav-btn-border);
      background-color: var(--fcb-header-nav-btn-background);
      margin-top: 1px;

      &:not(.disabled):hover {
        box-shadow: 0 0 5px red;
        cursor: pointer;
        background: var(--fcb-button-bg-hover);
        border-color: var(--fcb-button-border-hover);
        color: var(--fcb-button-text-hover);
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