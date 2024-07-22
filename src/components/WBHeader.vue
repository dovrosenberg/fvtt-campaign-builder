<template>
  <header 
    ref="root"
    class="fwb-header flexcol"
  >
    <div class="fwb-tab-bar flexrow">
      <div class="fwb-tab-row flexrow">
        <div 
          v-for="tab in tabs"
          :key="tab.id"
          :class="'fwb-tab flexrow ' + (tab.active ? 'active' : '')" 
          draggable="true"
          :title="tab.entry.name" 
          @click="onTabClick(tab.id)"
          @dragstart="onDragStart($event, tab.id)"
          @drop="onDrop($event, tab.id)"
        >
          <div 
            v-if="tab.entry.icon"
            class="fwb-tab-icon"
          >
            <i :class="'fas ' + tab.entry.icon"></i>
          </div>
          <div class="tab-content">
            {{ tab.entry.name }}
          </div>
          <div 
            class="close"
            @click="onTabCloseClick(tab.id)"
          >
            <i class="fas fa-times"></i>
          </div>
        </div>

        <div 
          id="fwb-add-tab" 
          class="tab-button"
          @click="onAddTabClick"
        >
          <i class="fas fa-plus"></i>
        </div>
      </div>

      <div 
        id="fwb-sidebar-toggle" 
        class="tab-button" 
        :data-tooltip="directoryCollapsed ? localize('fwb.tooltips.expandDirectory') : localize('fwb.tooltips.collapseDirectory')"
        @click="onSidebarToggleClick"
      >
        <i :class="'fas ' + (directoryCollapsed ? 'fa-caret-left' : 'fa-caret-right')"></i>
      </div>
    </div>

    <div class="fwb-bookmark-bar flexrow">
      <div 
        id="fwb-add-bookmark" 
        :class="(!navigationStore.getActiveTab(false)?.entry?.uuid ? 'disabled' : '')"
        :title="localize('fwb.tooltips.addBookmark')"
        @click="onAddBookmarkClick"
      >
        <i class="fas fa-star"></i>
      </div>

      <div 
        v-for="bookmark in bookmarks"
        :key="bookmark.id"
        class="fwb-bookmark-button" 
        :title="bookmark.entry.name" 
        draggable="true"
        @click.left="onBookmarkClick(bookmark.id)"
        @contextmenu="onBookmarkContextMenu($event, bookmark)"
        @dragstart="onDragStart($event, bookmark.id)"
        @drop="onDrop($event, bookmark.id)"
      >
        <div>
          <i 
            v-if="bookmark.entry.icon"
            :class="'fas '+ bookmark.entry.icon"
          ></i> 
          {{ bookmark.entry.name }}
        </div>
      </div>
    </div>

    <div class="navigation flexrow">
      <div 
        id="fwb-history-back" 
        :class="'nav-button ' + (canBack() ? '' : 'disabled')" 
        :title="localize('fwb.tooltips.historyBack')"
        @click="onHistoryBackClick"
      >
        <i class="fas fa-chevron-left"></i>
      </div>
      <div 
        id="fwb-history-forward" 
        :class="'nav-button ' + (canForward() ? '' : 'disabled')" 
        :title="localize('fwb.tooltips.historyForward')"
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
  import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
  import { useDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components

  // types
  import { Bookmark, WindowTab } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const directoryStore = useDirectoryStore();
  const { currentWorldId, } = storeToRefs(mainStore);
  const { tabs, bookmarks } = storeToRefs(navigationStore);
  const { directoryCollapsed } = storeToRefs(directoryStore);

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

    // @ts-ignore  -- Math.clamp is syntax for v12
    const newSpot = Math.clamp(tab.historyIdx + move, 0, tab.history.length-1);

    // if we didn't move, return
    if (newSpot === tab.historyIdx)
      return;

    tab.historyIdx = newSpot;
    await navigationStore.openEntry(tab.history[tab.historyIdx], { activate: false, newTab: false, updateHistory: false});  // will also save the tab and update recent
  };

  // remove the tab given by the id from the list
  const closeTab = async function (tabId: string) {
    // find the tab
    const tab = tabs.value.find((t) => (t.id === tabId));
    const index = tabs.value.findIndex((t) => (t.id === tabId));

    if (!tab) return;

    // remove it from the array
    tabs.value.splice(index, 1);

    if (tabs.value.length === 0) {
      await navigationStore.openEntry();  // make a default tab if that was the last one (will also activate it) and save them
    } else if (tab.active) {
      // if it was active, make the one before it active (or after if it was up front)
      if (index===0) {
        await navigationStore.activateTab(tabs.value[0].id);  // will also save them
      }
      else {
        await navigationStore.activateTab(tabs.value[index-1].id);  // will also save them
      }
    }
  };


  const onBookmarkContextMenu = (event: MouseEvent, bookmark: Bookmark): void => {
    //prevent the browser's default menu
    event.preventDefault();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-file-export',
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.bookmarks.openNewTab'), 
          onClick: async () => {
            if (bookmark.entry.uuid)
              await navigationStore.openEntry(bookmark.entry.uuid, { newTab: true });
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.bookmarks.delete'), 
          onClick: async () => {
            await navigationStore.removeBookmark(bookmark.id);
          }
        },
      ]
    });
  };

  ////////////////////////////////
  // event handlers
  // add the current tab as a new bookmark
  const onAddBookmarkClick = async (): Promise<void> => {
    //get the current tab and save the entity and name
    const tab = navigationStore.getActiveTab(false);

    if (!tab?.entry?.uuid)
      return;

    // see if a bookmark for the entry already exists
    if (bookmarks.value.find((b) => (b.entry.uuid === tab?.entry?.uuid)) != undefined) {
      globalThis.ui?.notifications?.warn(localize('fwb.errors.duplicateBookmark'));
      return;
    }

    const bookmark = {
      id: globalThis.foundry.utils.randomID(),
      entry: tab.entry,
    } as Bookmark;

    await navigationStore.addBookmark(bookmark);
  };

  const onBookmarkClick = async (bookmarkId: string) => { 
    const bookmark = bookmarks.value.find(b => b.id === bookmarkId);

    if (bookmark) {
      await navigationStore.openEntry(bookmark?.entry.uuid, { newTab: false });
    }
  };

  const onSidebarToggleClick = async () => { 
    directoryCollapsed.value = !directoryCollapsed.value;
  };

  const onAddTabClick = async () => { await navigationStore.openEntry(); };

  const onHistoryBackClick = () => { void navigateHistory(-1); };
  const onHistoryForwardClick = () => { void navigateHistory(1); };

  // bookmark and tab listeners
  const onTabClick = async (tabId: string) => {
    void navigationStore.activateTab(tabId);
  };

  // listener for the tab close buttons
  const onTabCloseClick = async (tabId: string) => {
    if (tabId)
      await closeTab(tabId);
  };

  // handle a bookmark or tab dragging
  const onDragStart = (event: DragEvent, id: string): void => {
    const target = event.currentTarget as HTMLElement;

    if (target.classList.contains('fwb-tab')) {
      const dragData = { 
        //from: this.object.uuid 
      } as { type: string, tabId?: string};

      dragData.type = 'fwb-tab';   // JournalEntry... may want to consider passing a type that other things can do something with
      dragData.tabId = id;

      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    } else if (target.classList.contains('fwb-bookmark-button')) {
      const dragData = { 
        //from: this.object.uuid 
      } as { type: string, bookmarkId?: string};

      dragData.type = 'fwb-bookmark';
      dragData.bookmarkId = id;

      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    } 
  };

  const onDrop = async(event: DragEvent, id: string) => {
    let data;
    try {
      data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
    }
    catch (err) {
      return false;
    }

    if (data.type==='fwb-tab') {
      // where are we droping it?
      const target = (event.currentTarget as HTMLElement).closest('.fwb-tab') as HTMLElement;
      if (!target)
        return false;

      if (data.tabId === id) return; // Don't drop on yourself

      // insert before the drop target
      const tabsValue = tabs.value;
      const from = tabsValue.findIndex(t => t.id === data.tabId);
      const to = tabsValue.findIndex(t => t.id === id);
      tabsValue.splice(to, 0, tabsValue.splice(from, 1)[0]);
      tabs.value = tabsValue;

      // activate the moved one (will also save the tabs)
      await navigationStore.activateTab(data.tabId);
    } else if (data.type==='fwb-bookmark') {
      const target = (event.currentTarget as HTMLElement).closest('.fwb-bookmark-button') as HTMLElement;
      if (!target)
        return false;

      if (data.bookmarkId === id) return; // Don't drop on yourself

      // insert before the drop target
      const bookmarksValue = bookmarks.value;
      const from = bookmarksValue.findIndex(b => b.id === data.bookmarkId);
      const to = bookmarksValue.findIndex(b => b.id === id);
      await navigationStore.changeBookmarkPosition(from, to);
    } else {
      return false;
    } 

    return true;
  };

  ////////////////////////////////
  // watchers
  watch(currentWorldId, async (newValue): Promise<void> => {
    if (!newValue)
      return;

    tabs.value = UserFlags.get(UserFlagKey.tabs, newValue) || [];
    bookmarks.value = UserFlags.get(UserFlagKey.bookmarks, newValue) || [];

    // if there are no tabs, add one
    if (!tabs.value.length)
      await navigationStore.openEntry();
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
.fwb-header {
  color: var(--fwb-header-color);
  background-color: var(--fwb-header-background);
  flex-grow: 0;

  & > * {
    flex: 0 0 30px;
    border-bottom: 1px solid var(--fwb-header-border-color);
  }

  // tab bar
  .fwb-tab-bar {
    position: relative;
    transition: padding-right 0.5s;
    padding: 4px 2px 0px 4px;
    flex: 0 0 34px;
    color: var(--fwb-header-tab-color);

    #fwb-sidebar-toggle {
      float: left;
      position: absolute;
      top: 4px;
      right: -36px;
      font-size: 20px;
      width: 30px;
      transition: right 0.5s;
      cursor: pointer;
    }
  
    .fwb-tab-row {
      padding-top: 1px;

      .fwb-tab {
        max-width: 150px;
        height: 100%;
        padding: 4px;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        line-height: 20px;
        background: var(--fwb-header-tab-background);
        border: var(--fwb-header-tab-border);
        position: relative;
        font-family: 'Signika', sans-serif;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
        flex-wrap: nowrap;
        font-size: var(--font-size-14);

        &.active, .fwb-tab:last-child {
          flex: 0 0 150px;
        }

        .fwb-tab-icon {
          flex: 0 1 0%;
          margin-right: 6px;
        }
        
        .tab-content {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        &.active {
          font-weight: bold;
          background-color: var(--fwb-header-tab-active);
          outline: none;
        }

        &:hover {
          box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
          background-color: var(--fwb-header-tab-hover);
        }

        .close {
          flex: 0 0 10px;
          opacity: 0.6;
          cursor: pointer;
          justify-content: flex-end;
          align-content: flex-end;
          padding-left: 2px;
  
          &:hover {
            opacity: 0.8;
          }
        }
      }

      .tab-button {
        flex: 0 0 30px;
        text-align: center;
        line-height: 30px;
        font-weight: bold;
        cursor: pointer;
        font-size: 18px;
        color: var(--fwb-header-tab-btn-color);

        &:hover {
          opacity: 0.9;
          text-shadow: 0 0 8px red;
        }
      }
    }
  }


  // Bookmark bar
  .fwb-bookmark-bar {
    padding-left: 2px;
    flex: 0 0 36px;
    color: var(--fwb-header-bookmark-color);

    .fwb-bookmark-button, #fwb-add-bookmark {
      height: 28px;
      border-radius: 28px;
      margin-left: 4px;
      margin-top: 4px;
      line-height: 27px;
      padding: 0px 10px;
      font-size: 14px;
      cursor: pointer;
      flex-wrap: nowrap;
      flex-grow: 0;
      white-space: nowrap;
      border: 1px solid var(--fwb-header-bookmark-border);
      background: var(--fwb-header-bookmark-background);

      &#fwb-add-bookmark {
        border-radius: 4px;
        flex: 0 0 24px;
        height: 24px;
        margin-top: 6px;
        font-size: 16px;
        padding-left: 2px;
        line-height: 22px;
        text-overflow: clip;
        margin-left: 2px;
        overflow: hidden;
        border: 1px solid var(--fwb-header-add-bookmark-border);
        background: var(--fwb-header-add-bookmark-background);
        color: var(--fwb-header-add-bookmark-color);

        &.disabled {
          cursor: default;
          color: #999;
        }
      }

      & > div {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
      }

      &:not(#fwb-add-bookmark) i {
        margin-top: 4px;
        margin-right: 2px;
      }

      &:hover {
        background: var(--fwb-header-bookmark-hover);
      }

      &#fwb-add-bookmark:not(.disabled):hover {
        background: var(--fwb-header-add-bookmark-hover);
      }
    }
  }

  // Navigation bar 
  .navigation {
    color: var(--fwb-header-nav-color);
    background: var(--fwb-header-nav-background);
    padding: 2px;

    hr.vertical {
      height: 100%;
      width: 1px;
      border-right: 2px groove var(--fwb-header-nav-vertical-line);
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
      border: 1px solid var(--fwb-header-nav-btn-border);
      margin-top: 1px;
      background: var(--fwb-header-nav-btn-background);
    }

    .nav-button:not(.disabled):hover {
      box-shadow: 0 0 5px red;
      cursor: pointer;
      background: var(--fwb-header-nav-btn-background-hover);
    }

    .nav-button.disabled {
      color: var(--fwb-header-nav-btn-disabled);
      background: var(--fwb-header-nav-btn-background-disabled);
      border-color: var(--fwb-header-nav-btn-border-disabled);
    }

    .nav-input {
      margin-right: 4px !important;
      margin-top: 1px;
      height: 25px !important;
      border-radius: 4px;
      flex: 0 0 200px;
      border: 1px solid var(--fwb-header-nav-input-border);
      background: var(--fwb-header-nav-input-background);
      color: var(--fwb-header-nav-input-color);
    }

    .nav-input::placeholder {
      color: var(--fwb-header-nav-input-placeholder-color);
    }

    .nav-input:focus {
      background: var(--fwb-header-nav-input-focus-background);
      border: 1px solid var(--fwb-header-nav-input-focus-border);
      color: var(--fwb-header-nav-input-focus-color);
    }

    .nav-text {
      flex-shrink: 1;
      flex-basis: auto;
      flex-grow: 0;
      padding: 4px;
      font-size: 12px;
      line-height: 10px;
    }

  //  .title input {
    //  font-size: 18px;
    // text-align: center;
    //  border: 0px;
  //   background: transparent;
  //  }

    .search.error {
      background-color: var(--fwb-header-nav-input-error-background);
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