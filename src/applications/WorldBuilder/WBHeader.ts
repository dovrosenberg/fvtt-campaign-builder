import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
import { localize } from '@/utils/game';

import './WBHeader.scss';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { Bookmark, EntryHeader, WindowTab } from '@/types';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { getIcon } from '@/utils/misc';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { getCleanEntry } from '@/compendia';

type WBHeaderData = {
  tabs: WindowTab[];
  collapsed: boolean;
  bookmarks: Bookmark[];  
  canBack: boolean;
  canForward: boolean;
}

export class WBHeader extends HandlebarsPartial<WBHeader.CallbackType> {
  static override _template = 'modules/world-builder/templates/WBHeader.hbs';

  private _worldId: string;
  private _tabs: WindowTab[];  
  private _collapsed: boolean;
  private _bookmarks = [] as Bookmark[];

  constructor() {
    super();

    // get collapsed state
    this._collapsed = moduleSettings.get(SettingKey.startCollapsed) || false;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public async changeWorld(worldId: string): Promise<void> {
    this._worldId = worldId;
    this._tabs = UserFlags.get(UserFlagKey.tabs, worldId) || [];
    this._bookmarks = UserFlags.get(UserFlagKey.bookmarks, worldId) || [];

    // if there are no tabs, add one
    if (!this._tabs.length)
      await this.openEntry();

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
    await this._makeCallback(WBHeader.CallbackType.EntryChanged, this.activeEntryId);
  }

  public async getData(): Promise<WBHeaderData> {
    const data = {
      tabs: this._tabs,
      collapsed: this._collapsed,
      bookmarks: this._bookmarks,
      disableAddBookmark: !this._activeTab(false)?.entry?.uuid,
      canBack: this._canBack(),
      canForward: this._canForward(),
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
    $('#fwb-sidebar-toggle').on('click', async () => { 
      this._collapsed = !this._collapsed;      
      await this._makeCallback(WBHeader.CallbackType.SidebarToggled); 
    });

    // bookmark and tab listeners
    html.on('click', '#fwb-add-bookmark', async () => { await this._addBookmark(); });
    html.on('click', '.fwb-bookmark-button', async (event: JQuery.ClickEvent) => { await this._activateBookmark((event.currentTarget as HTMLElement).dataset.bookmarkId as string); });
    html.on('click', '#fwb-add-tab', async () => { await this.openEntry(); });
    html.on('click', '.fwb-tab', async (event: JQuery.ClickEvent) => {
      void this._activateTab((event.currentTarget as HTMLElement).dataset.tabId as string);
    });

    html.on('click', '#fwb-history-back', () => { void this._navigateHistory(-1); });
    html.on('click', '#fwb-history-forward', () => { void this._navigateHistory(1); });

    // listeners for the tab close buttons
    $(html).on('click', '.fwb-tab .close', async (event: JQuery.ClickEvent) => {
      let tabId;

      if (event.currentTarget)
        tabId = ($(event.currentTarget)?.closest('.fwb-tab')[0] as HTMLElement).dataset.tabId as string;

      if (tabId)
        await this._closeTab(tabId);
    });

    // set up the drag & drop for tabs and bookmarks
    let dragDrop = new DragDrop({
      dragSelector: '.fwb-tab', 
      dropSelector: '.fwb-tab',
      callbacks : {
        'dragstart': this._onDragStart.bind(this),
        'drop': this._onDrop.bind(this),
      }
    });
    dragDrop.bind(html.get()[0]);
    dragDrop = new DragDrop({
      dragSelector: '.fwb-bookmark-button', 
      dropSelector: '.fwb-bookmark-button',
      callbacks : {
        'dragstart': this._onDragStart.bind(this),
        'drop': this._onDrop.bind(this),
      }
    });
    dragDrop.bind(html.get()[0]);

    // context menu
    void this._createContextMenus(html);
  }

  public get collapsed(): boolean {
    return this._collapsed;
  }

  public get activeEntryId(): string | null {
    return this._activeTab()?.entry.uuid || null;
  }

  // activate - switch to the tab after creating - defaults to true
  // newTab - should entry open in current tab or a new one - defaults to true
  // entryId = the uuid of the entry for the tab  (currently just journal entries); if missing, open a "New Tab"
  // updateHistory - should history be updated- defaults to true
  // if not !newTab and entryId is the same as currently active tab, then does nothign
  public async openEntry(entryId = null as string | null, options?: { activate?: boolean, newTab?: boolean, updateHistory?: boolean }): Promise<WindowTab> {
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
    if (options.newTab || !this._activeTab(false)) {
      tab = {
        id: randomID(),
        active: false,
        entry: entry,
        history: [],
        historyIdx: -1,
      } as WindowTab;

      //add to tabs list
      this._tabs.push(tab);
    } else {
      tab = this._activeTab(false);

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
      await this._activateTab(tab.id);  

    // activating doesn't always save (ex. if we added a new entry to active tab)
    await this._saveTabs();

    // update the recent list (except for new tabs)
    if (entry.uuid)
      await this._updateRecent(entry);

    //await this._makeCallback(WBHeader.CallbackType.TabsChanged);
    await this._makeCallback(WBHeader.CallbackType.EntryChanged, entry.uuid);

    return tab;
  }

  // when an entry has it's name changed, we need to propogate that through all the saved tabs, etc.
  public async changeEntryName(entry: JournalEntry) {
    this._tabs = this._tabs.map((t)=> {
      if (t.entry.uuid===entry.uuid)
        t.entry.name = entry.name || '';
      return t;
    });

    this._bookmarks = this._bookmarks.map((b)=> {
      if (b.entry.uuid===entry.uuid)
        b.entry.name = entry.name || '';
      return b;
    });

    let recent = UserFlags.get(UserFlagKey.recentlyViewed, this._worldId) || [];
    recent = recent.map((r)=> {
      if (r.uuid===entry.uuid)
        r.name = entry.name || '';
      return r;
    });

    await this._saveTabs();
    await this._saveBookmarks();
    await UserFlags.set(UserFlagKey.recentlyViewed, recent, this._worldId);
  }

  /******************************************************
   * Private methods
  */
  private _canBack(tab?: WindowTab): boolean {
    const checkTab = tab || this._activeTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx > 0 );
  }

  private _canForward(tab?: WindowTab): boolean {
    const checkTab = tab || this._activeTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx < checkTab.history.length-1);
  }

  // get the currently active tab
  private _activeTab(findone = true): WindowTab | null {
    let tab = this._tabs.find(t => t.active);
    if (findone) {
      if (!tab && this._tabs.length > 0)  // nothing was marked as active, just pick the 1st one
        tab = this._tabs[0];
    }

    return tab || null;
  }

  // add a new entity to the recent list
  private async _updateRecent(entry: EntryHeader): Promise<void> {
    let recent = UserFlags.get(UserFlagKey.recentlyViewed, this._worldId) || [] as EntryHeader[];

    // remove any other places in history this already appears
    recent.findSplice((h: EntryHeader): boolean => h.uuid === entry.uuid);

    // insert in the front
    recent.unshift(entry);

    // trim if too long
    if (recent.length > 5)
      recent = recent.slice(0, 5);

    await UserFlags.set(UserFlagKey.recentlyViewed, recent, this._worldId);
  }

  // activate the given tab, first closing the current subsheet
  // tabId must exist
  async _activateTab(tabId: string): Promise<void> {
    //this.saveScrollPos();

    let newTab: WindowTab | undefined;
    if (!tabId || !(newTab = this._tabs.find((t)=>(t.id===tabId))))
      return;

    // see if it's already current
    const currentTab = this._activeTab(false);
    if (currentTab?.id === tabId) {
      return;
    }

    if (currentTab)
      currentTab.active = false;
    
    newTab.active = true;

    await this._saveTabs();

    // add to recent, unless it's a "new tab"
    if (newTab?.entry?.uuid)
      await this._updateRecent(newTab.entry);

    await this._makeCallback(WBHeader.CallbackType.EntryChanged, newTab.entry.uuid);
    await this._makeCallback(WBHeader.CallbackType.TabsChanged);
    return;
  }

  // remove the tab given by the id from the list
  private async _closeTab(tabId: string) {
    // find the tab
    const tab = this._tabs.find((t) => (t.id === tabId));
    const index = this._tabs.findIndex((t) => (t.id === tabId));

    if (!tab) return;

    // remove it from the array
    this._tabs.splice(index, 1);

    if (this._tabs.length === 0) {
      await this.openEntry();  // make a default tab if that was the last one (will also activate it) and save them
    } else if (tab.active) {
      // if it was active, make the one before it active (or after if it was up front)
      if (index===0) {
        await this._activateTab(this._tabs[0].id);  // will also save them
      }
      else {
        await this._activateTab(this._tabs[index-1].id);  // will also save them
      }
    }

    await this._makeCallback(WBHeader.CallbackType.TabsChanged);
  }

  private async _saveTabs() {
    await UserFlags.set(UserFlagKey.tabs, this._tabs, this._worldId);
  }

  // add the current tab as a new bookmark
  async _addBookmark(): Promise<void> {
    //get the current tab and save the entity and name
    const tab = this._activeTab(false);

    if (!tab?.entry?.uuid)
      return;

    // see if a bookmark for the entry already exists
    if (this._bookmarks.find((b) => (b.entry.uuid === tab?.entry?.uuid)) != undefined) {
      ui?.notifications?.warn(localize('fwb.errors.duplicateBookmark'));
      return;
    }

    const bookmark = {
      id: randomID(),
      entry: tab.entry,
    } as Bookmark;

    this._bookmarks.push(bookmark);

    await this._saveBookmarks();
    await this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
  }

  private async _activateBookmark(bookmarkId: string) {
    const bookmark = this._bookmarks.find(b => b.id === bookmarkId);

    if (bookmark) {
      await this.openEntry(bookmark?.entry.uuid, { newTab: false });
    }
  }

  // removes the bookmark with given id
  private async _removeBookmark(id: string) {
    this._bookmarks.findSplice(b => b.id === id);
    await this._saveBookmarks();

    await this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
  }

  private async _saveBookmarks() {
    await UserFlags.set(UserFlagKey.bookmarks, this._bookmarks, this._worldId);
  }

  // moves forward/back through the history "move" spaces (or less if not possible); negative numbers move back
  private async _navigateHistory(move: number) {
    const tab = this._activeTab();

    if (!tab) return;

    const newSpot = Math.clamped(tab.historyIdx + move, 0, tab.history.length-1);

    // if we didn't move, return
    if (newSpot === tab.historyIdx)
      return;

    tab.historyIdx = newSpot;
    await this.openEntry(tab.history[tab.historyIdx], { activate: false, newTab: false, updateHistory: false});  // will also save the tab and update recent

    await this._makeCallback(WBHeader.CallbackType.HistoryMoved);
  }

  // handle a bookmark or tab dragging
  private _onDragStart(event: DragEvent): void {
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

  async _onDrop(event: DragEvent) {
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
      const from = this._tabs.findIndex(t => t.id === data.tabId);
      const to = this._tabs.findIndex(t => t.id === target.dataset.tabId);
      this._tabs.splice(to, 0, this._tabs.splice(from, 1)[0]);

      // activate the moved one (will also save the tabs)
      await this._activateTab(data.tabId);
    } else if (data.type==='fwb-bookmark') {
      const target = (event.currentTarget as HTMLElement).closest('.fwb-bookmark-button') as HTMLElement;
      if (!target)
        return false;

      if (data.bookmarkId === target.dataset.bookmarkId) return; // Don't drop on yourself

      // insert before the drop target
      const from = this._bookmarks.findIndex(b => b.id === data.bookmarkId);
      const to = this._bookmarks.findIndex(b => b.id === target.dataset.bookmarkId);
      this._bookmarks.splice(to, 0, this._bookmarks.splice(from, 1)[0]);

      // save bookmarks (we don't activate anything)
      await this._saveBookmarks();
      await this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
    } else {
      return false;
    } 

    return true;
  }

  async _createContextMenus(html) {
    // bookmarks 
    new ContextMenu(html, '.fwb-bookmark-button', [
      {
        name: 'fwb.contextMenus.bookmarks.openNewTab',
        icon: '<i class="fas fa-file-export"></i>',
        callback: async (li) => {
          const bookmark = this._bookmarks.find(b => b.id === li[0].dataset.bookmarkId);
          if (bookmark)
            await this.openEntry(bookmark.entry.uuid, { newTab: true });
        }
      },
      {
        name: 'fwb.contextMenus.bookmarks.delete',
        icon: '<i class="fas fa-trash"></i>',
        callback: async (li) => {
          const bookmark = this._bookmarks.find(b => b.id === li[0].dataset.bookmarkId);
          if (bookmark)
            await this._removeBookmark(bookmark.id);
        }
      }
    ]);
  }
}


export namespace WBHeader {
  export enum CallbackType {
    TabsChanged,
    BookmarksChanged,
    SidebarToggled,
    HistoryMoved,
    EntryChanged,
  }
}