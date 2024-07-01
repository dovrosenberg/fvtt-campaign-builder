<template>
  <header 
    ref="root"
    class="fwb-header flexcol"
  >
    <div class="fwb-tab-bar flexrow">
      <div class="fwb-tab-row flexrow">
        <div v-for="tab in tabs"
          :class="'fwb-tab flexrow' + active ? 'active' : ''" 
          :title="entry.name" 
          :data-tab-id="id"
          @click="onTabClick(id)"
        >
          <div v-if="entry.icon"
            class="fwb-tab-icon"
          >
            <i :class="'fas ' + entry.icon"></i>
          </div>
          <div class="tab-content">{{entry.name}}</div>
          <div 
            class="close"
            @click="onTabCloseClick"
          >
            <i class="fas fa-times"></i>
          </div>
        </div>

        <div id="fwb-add-tab" 
          class="tab-button"
          @click="onAddTabClick"
        >
          <i class="fas fa-plus"></i>
        </div>
      </div>

      <div id="fwb-sidebar-toggle" 
        class="tab-button" 
        :data-tooltip="collapsed ? localize('fwb.tooltips.expandDirectory') : localize('fwb.tooltips.collapseDirectory')"
        @click="onSidebarToggleClick"
      >
        <i :class="fas + collapsed ? 'fa-caret-left' : 'fa-caret-right'"></i>
      </div>
    </div>

    <div class="fwb-bookmark-bar flexrow">
      <div id="fwb-add-bookmark" 
        :class="!getActiveTab(false)?.entry?.uuid ? 'disabled' : ''"
        :title="localize('fwb.tooltips.addBookmark')"
        @click="onAddBookmarkClick"
      >
        <i class="fas fa-star"></i>
      </div>

      <div 
        v-for="bookmark in bookmarks"
        class="fwb-bookmark-button" 
        title="{{entry.name}}" 
        data-bookmark-id="{{id}}"
        @click="onBookmarkClick"
      >
        <div><i :class="'fas '+ entry.icon"></i> {{entry.name}}</div>
      </div>
    </div>

    <div class="navigation flexrow">
      <div 
        id="fwb-history-back" 
        :class="'nav-button ' + canBack ? '' : 'disabled'" 
        :title="localize('fwb.tooltips.historyBack')"
        @click="onHistoryBackClick"
      >
        <i class="fas fa-chevron-left"></i>
      </div>
      <div 
        id="fwb-history-forward" 
        :class="'nav-button ' + canForward ? '' : 'disabled'" 
        :title="localize('fwb.tooltips.historyForward')"
        @click="onHistoryForwardClick"
      >
        <i class="fas fa-chevron-right"></i>
      </div>
      <hr class="vertical" />
      <div class="button-group flexrow" id="journal-buttons"></div>
    </div>
  </header>
</template> 

<script setup lang="ts">
  // library imports
  import { inject, ref, computed, onMounted, watch, InjectionKey } from 'vue';

  // local imports
  import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
  import { localize } from '@/utils/game';
  import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
  import { getIcon } from '@/utils/misc';
  import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
  import { getCleanEntry } from '@/compendia';

  // library components

  // local components

  // types
  import { Bookmark, EntryHeader, WindowTab, CollapsedInjectionKeyType } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    worldId: {
      type: String,
      required: true
    },
  })

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // injects
  const collapsedKey = Symbol() as InjectionKey<CollapsedInjectionKeyType>;
  const { collapsed, updateCollapsed } = inject(collapsedKey, { collapsed: ref(false), updateCollapsed: () => void {} });

  ////////////////////////////////
  // data
  const tabs = ref<WindowTab[]>([]);;  
  const bookmarks = ref<Bookmark[]>([]);
  const root = ref<HTMLElement | null>(null);

  ////////////////////////////////
  // computed data
  const activeEntryId = computed((): string | null => {
    return getActiveTab()?.entry.uuid || null;
  });


  ////////////////////////////////
  // methods
  const canBack = function (tab?: WindowTab): boolean {
    const checkTab = tab || getActiveTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx > 0 );
  };

  const canForward = function (tab?: WindowTab): boolean {
    const checkTab = tab || getActiveTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx < checkTab.history.length-1);
  };

  const getActiveTab = function (findone = true): WindowTab | null {
    let tab = tabs.value.find(t => t.active);
    if (findone) {
      if (!tab && tabs.value.length > 0)  // nothing was marked as active, just pick the 1st one
        tab = tabs.value[0];
    }

    return tab || null;
  }

  const saveBookmarks = async function () {
    await UserFlags.set(UserFlagKey.bookmarks, bookmarks.value, props.worldId);
  }

  // activate - switch to the tab after creating - defaults to true
  // newTab - should entry open in current tab or a new one - defaults to true
  // entryId = the uuid of the entry for the tab  (currently just journal entries); if missing, open a "New Tab"
  // updateHistory - should history be updated- defaults to true
  // if not !newTab and entryId is the same as currently active tab, then does nothign
  const openEntry = async function (entryId = null as string | null, options?: { activate?: boolean, newTab?: boolean, updateHistory?: boolean }): Promise<WindowTab> {
    // set defaults
    options = {
      activate: true,
      newTab: true,
      updateHistory: true,
      ...options,
    };

    const journal = entryId ? await getCleanEntry(entryId) as JournalEntry : null;
    const entryName = (journal ? journal.name : localize('fwb.labels.newTab')) || '';
    const entry = { uuid: journal ? entryId : null, name: entryName, icon: journal ? getIcon(EntryFlags.get(journal, EntryFlagKey.topic)) : '' };

    // see if we need a new tab
    let tab;
    if (options.newTab || !getActiveTab(false)) {
      tab = {
        id: randomID(),
        active: false,
        entry: entry,
        history: [],
        historyIdx: -1,
      } as WindowTab;

      //add to tabs list
      tabs.value.push(tab);
    } else {
      tab = getActiveTab(false);

      // if same entry, nothing to do
      if (tab.entry?.uuid === entryId)
        return tab;

      // otherwise, just swap out the active tab info
      tab.entry = entry;
    }
    
    // add to history 
    if (entry.uuid && options.updateHistory) {
      tab.history.push(entryId);
      tab.historyIdx = tab.history.length - 1; 
    }

    if (options.activate)
      await activateTab(tab.id);  

    // activating doesn't always save (ex. if we added a new entry to active tab)
    await saveTabs();

    // update the recent list (except for new tabs)
    if (entry.uuid)
      await updateRecent(entry);

    // TODO: convert to emit
    // await this._makeCallback(WBHeader.CallbackType.EntryChanged, entry.uuid);

    return tab;
  }

    // activate the given tab, first closing the current subsheet
  // tabId must exist
  const activateTab = async function (tabId: string): Promise<void> {
    //this.saveScrollPos();

    let newTab: WindowTab | undefined;
    if (!tabId || !(newTab = tabs.value.find((t)=>(t.id===tabId))))
      return;

    // see if it's already current
    const currentTab = getActiveTab(false);
    if (currentTab?.id === tabId) {
      return;
    }

    if (currentTab)
      currentTab.active = false;
    
    newTab.active = true;

    await saveTabs();

    // add to recent, unless it's a "new tab"
    if (newTab?.entry?.uuid)
      await updateRecent(newTab.entry);

    // TODO - emit
    //   await this._makeCallback(WBHeader.CallbackType.EntryChanged, newTab.entry.uuid);
    // await this._makeCallback(WBHeader.CallbackType.TabsChanged);
    return;
  }

  // save tabs to database
  const saveTabs = async function () {
    await UserFlags.set(UserFlagKey.tabs, tabs.value, props.worldId);
  }

  // add a new entity to the recent list
  const updateRecent = async function (entry: EntryHeader): Promise<void> {
    let recent = UserFlags.get(UserFlagKey.recentlyViewed, props.worldId) || [] as EntryHeader[];

    // remove any other places in history this already appears
    recent.findSplice((h: EntryHeader): boolean => h.uuid === entry.uuid);

    // insert in the front
    recent.unshift(entry);

    // trim if too long
    if (recent.length > 5)
      recent = recent.slice(0, 5);

    await UserFlags.set(UserFlagKey.recentlyViewed, recent, props.worldId);
  }

  // moves forward/back through the history "move" spaces (or less if not possible); negative numbers move back
  const navigateHistory = async function (move: number) {
    const tab = getActiveTab();

    if (!tab) return;

    const newSpot = Math.clamped(tab.historyIdx + move, 0, tab.history.length-1);

    // if we didn't move, return
    if (newSpot === tab.historyIdx)
      return;

    tab.historyIdx = newSpot;
    await openEntry(tab.history[tab.historyIdx], { activate: false, newTab: false, updateHistory: false});  // will also save the tab and update recent

    // TODO - emit
    // await this._makeCallback(WBHeader.CallbackType.HistoryMoved);
  }

  // remove the tab given by the id from the list
  const closeTab = async function (tabId: string) {
    // find the tab
    const tab = tabs.value.find((t) => (t.id === tabId));
    const index = tabs.value.findIndex((t) => (t.id === tabId));

    if (!tab) return;

    // remove it from the array
    tabs.value = tabs.value.splice(index, 1);

    if (tabs.value.length === 0) {
      await openEntry();  // make a default tab if that was the last one (will also activate it) and save them
    } else if (tab.active) {
      // if it was active, make the one before it active (or after if it was up front)
      if (index===0) {
        await activateTab(tabs.value[0].id);  // will also save them
      }
      else {
        await activateTab(tabs.value[index-1].id);  // will also save them
      }
    }

    // TODO - emit
    //await this._makeCallback(WBHeader.CallbackType.TabsChanged);
  }

  // removes the bookmark with given id
  const removeBookmark = async function (id: string) {
    const bookmarksValue = bookmarks.value;
    bookmarksValue.findSplice(b => b.id === id);
    bookmarks.value = bookmarksValue;
    await saveBookmarks();

    // TODO = emit
    //await this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
  }

  const activateDragDrop = function () {
    if (!root.value)
      return;

    let dragDrop = new DragDrop({
      dragSelector: '.fwb-tab', 
      dropSelector: '.fwb-tab',
      callbacks : {
        'dragstart': onDragStart,
        'drop': onDrop,
      }
    });
    dragDrop.bind(root.value);   //.get()[0]);
    dragDrop = new DragDrop({
      dragSelector: '.fwb-bookmark-button', 
      dropSelector: '.fwb-bookmark-button',
      callbacks : {
        'dragstart': onDragStart,
        'drop': onDrop,
      }
    });
    dragDrop.bind(root.value);   //html.get()[0]);
  }

  const createContextMenus = async function() {
    if (!root.value)
      return;

    // bookmarks 
    new ContextMenu($(root.value), '.fwb-bookmark-button', [
      {
        name: 'fwb.contextMenus.bookmarks.openNewTab',
        icon: '<i class="fas fa-file-export"></i>',
        callback: async (li) => {
          const bookmark = bookmarks.value.find(b => b.id === li[0].dataset.bookmarkId);
          if (bookmark)
            await openEntry(bookmark.entry.uuid, { newTab: true });
        }
      },
      {
        name: 'fwb.contextMenus.bookmarks.delete',
        icon: '<i class="fas fa-trash"></i>',
        callback: async (li) => {
          const bookmark = bookmarks.value.find(b => b.id === li[0].dataset.bookmarkId);
          if (bookmark)
            await removeBookmark(bookmark.id);
        }
      }
    ]);
  }


////////////////////////////////
  // event handlers
  // add the current tab as a new bookmark
  const onAddBookmarkClick = async (): Promise<void> => {
    //get the current tab and save the entity and name
    const tab = getActiveTab(false);

    if (!tab?.entry?.uuid)
      return;

    // see if a bookmark for the entry already exists
    if (bookmarks.value.find((b) => (b.entry.uuid === tab?.entry?.uuid)) != undefined) {
      ui?.notifications?.warn(localize('fwb.errors.duplicateBookmark'));
      return;
    }

    const bookmark = {
      id: randomID(),
      entry: tab.entry,
    } as Bookmark;

    bookmarks.value.push(bookmark);

    await saveBookmarks();

    // TODO - make this an emit (though might not be needed any more?)
    //await this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
  }

  const onBookmarkClick = async (event: JQuery.ClickEvent) => { 
    const bookmarkId = (event.currentTarget as HTMLElement).dataset.bookmarkId as string;

    const bookmark = bookmarks.value.find(b => b.id === bookmarkId);

    if (bookmark) {
      await openEntry(bookmark?.entry.uuid, { newTab: false });
    }
  };

  const onSidebarToggleClick = async () => { 
    updateCollapsed(!collapsed);  

    // TODO - emit... actually shouldn't need it because updateCollapsed should handle it
    // await this._makeCallback(WBHeader.CallbackType.SidebarToggled); 
  };

  const onAddTabClick = async () => { await openEntry(); };

  const onHistoryBackClick = () => { void navigateHistory(-1); };
  const onHistoryForwardClick = () => { void navigateHistory(1); };

  // bookmark and tab listeners
  const onTabClick = async (tabId: string) => {
    void activateTab(tabId);
  };

  // listener for the tab close buttons
  const onTabCloseClick = async (tabId: string) => {
    if (tabId)
      await closeTab(tabId);
  }

  // handle a bookmark or tab dragging
  const onDragStart = (event: DragEvent): void => {
    const target = event.currentTarget as HTMLElement;

    if ($(target).hasClass('fwb-tab')) {
      const dragData = { 
        //from: this.object.uuid 
      } as { type: string, tabId?: string};

      const tabId = target.dataset.tabId;
      dragData.type = 'fwb-tab';   // JournalEntry... may want to consider passing a type that other things can do something with
      dragData.tabId = tabId;

      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    } else if ($(target).hasClass('fwb-bookmark-button')) {
      const dragData = { 
        //from: this.object.uuid 
      } as { type: string, bookmarkId?: string};

      const bookmarkId = target.dataset.bookmarkId;
      dragData.type = 'fwb-bookmark';
      dragData.bookmarkId = bookmarkId;

      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    } 
  }

  const onDrop = async(event: DragEvent) => {
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

      if (data.tabId === target.dataset.tabId) return; // Don't drop on yourself

      // insert before the drop target
      const tabsValue = tabs.value;
      const from = tabsValue.findIndex(t => t.id === data.tabId);
      const to = tabsValue.findIndex(t => t.id === target.dataset.tabId);
      tabs.value = tabsValue.splice(to, 0, tabsValue.splice(from, 1)[0]);

      // activate the moved one (will also save the tabs)
      await activateTab(data.tabId);
    } else if (data.type==='fwb-bookmark') {
      const target = (event.currentTarget as HTMLElement).closest('.fwb-bookmark-button') as HTMLElement;
      if (!target)
        return false;

      if (data.bookmarkId === target.dataset.bookmarkId) return; // Don't drop on yourself

      // insert before the drop target
      const bookmarksValue = bookmarks.value;
      const from = bookmarksValue.findIndex(b => b.id === data.bookmarkId);
      const to = bookmarksValue.findIndex(b => b.id === target.dataset.bookmarkId);
      bookmarks.value = bookmarksValue.splice(to, 0, bookmarksValue.splice(from, 1)[0]);

      // save bookmarks (we don't activate anything)
      await saveBookmarks();

      // TODO - emit
      //await this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
    } else {
      return false;
    } 

    return true;
  }

  ////////////////////////////////
  // watchers
  watch(() => props.worldId, async (newValue) => {
    tabs.value = UserFlags.get(UserFlagKey.tabs, newValue) || [];
    bookmarks.value = UserFlags.get(UserFlagKey.bookmarks, newValue) || [];

    // if there are no tabs, add one
    if (!tabs.value.length)
      await openEntry();

    await UserFlags.set(UserFlagKey.currentWorld, newValue);

    //TODO - replace this with an event passed back up
    //await this._makeCallback(WBHeader.CallbackType.EntryChanged, this.activeEntryId);
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(function () {
    // load te tabs and bookmarks for the world
    if (props.worldId) {
      tabs.value = UserFlags.get(UserFlagKey.tabs, props.worldId) || [];
      bookmarks.value = UserFlags.get(UserFlagKey.bookmarks, props.worldId) || [];
    }

    // set up the drag & drop for tabs and bookmarks
    activateDragDrop();

    // create the context menus
    createContextMenus();
  });


// TODO - need someway to trigger this from outside... it feels like maybe the tabs  need to be maintained from
//    outside and just passed in as a prop???  Or we need to keep all the entries in a store, but that's way too
//    much overhead
//   // when an entry has it's name changed, we need to propogate that through all the saved tabs, etc.
//   public async changeEntryName(entry: JournalEntry) {
//     this._tabs = this._tabs.map((t)=> {
//       if (t.entry.uuid===entry.uuid)
//         t.entry.name = entry.name || '';
//       return t;
//     });

//     this._bookmarks = this._bookmarks.map((b)=> {
//       if (b.entry.uuid===entry.uuid)
//         b.entry.name = entry.name || '';
//       return b;
//     });

//     let recent = UserFlags.get(UserFlagKey.recentlyViewed, this._worldId) || [];
//     recent = recent.map((r)=> {
//       if (r.uuid===entry.uuid)
//         r.name = entry.name || '';
//       return r;
//     });

//     await this._saveTabs();
//     await this._saveBookmarks();
//     await UserFlags.set(UserFlagKey.recentlyViewed, recent, this._worldId);
//   }

//   /******************************************************
//    * Private methods
//   */


</script>

<style lang="scss">
.fwb-header {
    background-color: var(--mej-header-background);
    flex-grow: 0;

  & > * {
    flex: 0 0 30px;
    border-bottom: 1px solid var(--mej-header-border-color);
  }

  // tab bar
  .fwb-tab-bar {
    position: relative;
    transition: padding-right 0.5s;
    padding: 4px 2px 0px 4px;
    flex: 0 0 34px;
    color: var(--mej-header-tab-color);

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
        background: var(--mej-header-tab-background);
        border: var(--mej-header-tab-border);
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
          background-color: var(--mej-header-tab-active);
          outline: none;
        }

        &:hover {
          box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
          background-color: var(--mej-header-tab-hover);
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
        color: var(--mej-header-tab-btn-color);

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
    color: var(--mej-header-bookmark-color);

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
      border: 1px solid var(--mej-header-bookmark-border);
      background: var(--mej-header-bookmark-background);

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
        border: 1px solid var(--mej-header-add-bookmark-border);
        background: var(--mej-header-add-bookmark-background);
        color: var(--mej-header-add-bookmark-color);

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
        background: var(--mej-header-bookmark-hover);
      }

      &#fwb-add-bookmark:not(.disabled):hover {
        background: var(--mej-header-add-bookmark-hover);
      }
    }
  }

  // Navigation bar 
  .navigation {
    color: var(--mej-header-nav-color);
    background: var(--mej-header-nav-background);
    padding: 2px;
  }

  .navigation hr.vertical {
    height: 100%;
    width: 1px;
    border-right: 2px groove var(--mej-header-nav-vertical-line);
    flex: 0 0 1px;
    margin: 0px 2px;
  }

  .navigation .button-group {
    justify-content: flex-end;
    flex-wrap: nowrap;
  }

  .navigation .nav-button {
    flex: 0 0 24px;
    text-align: center;
    line-height: 24px;
    font-size: 14px;
    margin-right: 4px;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--mej-header-nav-btn-border);
    margin-top: 1px;
    background: var(--mej-header-nav-btn-background);
  }

  .navigation .nav-button:not(.disabled):hover {
    box-shadow: 0 0 5px red;
    cursor: pointer;
    background: var(--mej-header-nav-btn-background-hover);
  }

  .navigation .nav-button.disabled {
    color: var(--mej-header-nav-btn-disabled);
    background: var(--mej-header-nav-btn-background-disabled);
    border-color: var(--mej-header-nav-btn-border-disabled);
  }

  .navigation .nav-input {
    margin-right: 4px !important;
    margin-top: 1px;
    height: 25px !important;
    border-radius: 4px;
    flex: 0 0 200px;
    border: 1px solid var(--mej-header-nav-input-border);
    background: var(--mej-header-nav-input-background);
    color: var(--mej-header-nav-input-color);
  }

  .navigation .nav-input::placeholder {
    color: var(--mej-header-nav-input-placeholder-color);
  }

  .navigation .nav-input:focus {
    background: var(--mej-header-nav-input-focus-background);
    border: 1px solid var(--mej-header-nav-input-focus-border);
    color: var(--mej-header-nav-input-focus-color);
  }

  .navigation .nav-text {
    flex-shrink: 1;
    flex-basis: auto;
    flex-grow: 0;
    padding: 4px;
    font-size: 12px;
    line-height: 10px;
  }

//  .navigation .title input {
  //  font-size: 18px;
   // text-align: center;
  //  border: 0px;
 //   background: transparent;
//  }

  .navigation .search.error {
    background-color: var(--mej-header-nav-input-error-background);
  }

  .navigation .button-group .nav-text i.fa-search {
    padding-top: 4px;
  }

  .navigation #context-menu li {
    text-align: left;
  }
}
</style>