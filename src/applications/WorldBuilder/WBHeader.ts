import { SettingKeys, moduleSettings } from '@/settings/ModuleSettings';
import { getGame, localize } from '@/utils/game';

import './WBHeader.scss';
import { UserFlagKeys, userFlags } from '@/settings/UserFlags';
import { Bookmark, EntryHeader, TopicFlags, TopicTypes, WindowTab } from '@/types';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { MODULE_ID, getIcon } from '@/utils/misc';

type WBHeaderData = {
  tabs: WindowTab[];
  collapsed: boolean;
  bookmarks: any[];  // TODO
  canBack: boolean;
  canForward: boolean;
}

export class WBHeader extends HandlebarsPartial<WBHeader.CallbackType> {
  private _tabs: WindowTab[];  
  private _collapsed: boolean;
  private _bookmarks = [] as Bookmark[];
  static override _template = 'modules/world-builder/templates/WBHeader.hbs';
  private _dragDrop: DragDrop;

  constructor() {
    super();

    // setup the tabs and bookmarks
    this._tabs = userFlags.get(UserFlagKeys.tabs) || [];
    this._bookmarks = userFlags.get(UserFlagKeys.bookmarks) || [];

    // get collapsed state
    this._collapsed = moduleSettings.get(SettingKeys.startCollapsed) || false;

    // if there are no tabs, add one
    if (!this._tabs.length)
      this.openEntry();
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public async getData(): Promise<WBHeaderData> {
    const data = {
      tabs: this._tabs,
      collapsed: this._collapsed,
      bookmarks: this._bookmarks,
      canBack: this._canBack(),
      canForward: this._canForward(),
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
    $('#fwb-sidebar-toggle').on('click', () => { 
      this._collapsed = !this._collapsed;      
      this._makeCallback(WBHeader.CallbackType.SidebarToggled); 
    });

    // bookmark and tab listeners
    html.on('click', '#fwb-add-bookmark', () => { this._addBookmark(); });
    html.on('click', '.fwb-bookmark-button', (event: JQuery.ClickEvent): void => { this._activateBookmark((event.currentTarget as HTMLElement).dataset.bookmarkId as string) });
    html.on('click', '#fwb-add-tab', () => { this.openEntry() });
    html.on('click', '.fwb-tab', (event: JQuery.ClickEvent): void => {
      this._activateTab((event.currentTarget as HTMLElement).dataset.tabId as string);
    });

    html.on('click', '#fwb-history-back', () => { this._navigateHistory(-1); });
    html.on('click', '#fwb-history-forward', () => { this._navigateHistory(1); });

    // listeners for the tab close buttons
    $(html).on('click', '.fwb-tab .close', (event: JQuery.ClickEvent) => {
      let tabId;

      if (event.currentTarget)
        tabId = ($(event.currentTarget)?.closest('.fwb-tab')[0] as HTMLElement).dataset.tabId as string;

        if (tabId)
          this._closeTab(tabId);
    });

    // set up the drag & drop for tabs and bookmarks
    let dragDrop = new DragDrop({
      dragSelector: '.fwb-tab', 
      dropSelector: '.fwb-tab',
      callbacks : {
        'dragstart': this._onDragStart.bind(this),
        'drop': this._onDrop.bind(this),
      }
    })
    dragDrop.bind(html.get()[0]);
    dragDrop = new DragDrop({
      dragSelector: '.fwb-bookmark-button', 
      dropSelector: '.fwb-bookmark-button',
      callbacks : {
        'dragstart': this._onDragStart.bind(this),
        'drop': this._onDrop.bind(this),
      }
    })
    dragDrop.bind(html.get()[0]);

    // context menu
    this._createContextMenus(html);
  }

  public get collapsed(): boolean {
    return this._collapsed;
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

    const journal = entryId ? await fromUuid(entryId) as JournalEntry : null;
    let entryName = (!!journal ? journal.name : localize('fwb.labels.newTab')) || '';
    const entry = { uuid: !!journal ? entryId : null, name: entryName, icon: !!journal ? getIcon(journal.getFlag(MODULE_ID, TopicFlags.topicType) as TopicTypes) : '' }

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
      this._activateTab(tab.id);  


    // activating doesn't always save (ex. if we added a new entry to active tab)
    this._saveTabs();

    // update the recent list (except for new tabs)
    if (entry.uuid)
      await this._updateRecent(entry);

    this._makeCallback(WBHeader.CallbackType.TabsChanged);
    this._makeCallback(WBHeader.CallbackType.EntryChanged, entry.uuid);

    return tab;
  }

  /******************************************************
   * Private methods
  */
  private _canBack(tab?: WindowTab): boolean {
    let checkTab = tab || this._activeTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (checkTab.historyIdx > 0 );
  }

  private _canForward(tab?: WindowTab): boolean {
    let checkTab = tab || this._activeTab();

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
  };  

  // add a new entity to the recent list
  private async _updateRecent(entry: EntryHeader): Promise<void> {
    let recent = userFlags.get(UserFlagKeys.recentlyViewed) || [] as EntryHeader[];

    // remove any other places in history this already appears
    recent.findSplice((h: EntryHeader): boolean => h.uuid === entry.uuid);

    // insert in the front
    recent.unshift(entry);

    // trim if too long
    if (recent.length > 5)
      recent = recent.slice(0, 5);

    userFlags.set(UserFlagKeys.recentlyViewed, recent);
  }

  // activate the given tab, first closing the current subsheet
  // tabId must exist
  async _activateTab(tabId: string): Promise<void> {
    //this.saveScrollPos();

    let newTab: WindowTab | undefined;
    if (!tabId || !(newTab = this._tabs.find((t)=>(t.id===tabId))))
      return;

    // see if it's already current
    let currentTab = this._activeTab(false);
    if (currentTab?.id === tabId) {
      return;
    }

    // TODO - if there's an active tab, do we need to clean anything up? save?
    if (currentTab)
      currentTab.active = false;
    
    newTab.active = true;

    this._saveTabs();

    // add to recent, unless it's a "new tab"
    if (newTab?.entry?.uuid)
      this._updateRecent(newTab.entry);

    this._makeCallback(WBHeader.CallbackType.TabsChanged);
    this._makeCallback(WBHeader.CallbackType.EntryChanged, newTab.entry.uuid);
    return;
  }

  /*
  private _updateTab(tab, entity, options = {}) {
    if (!entity)
      return;

    if (entity?.parent) {
      options.journalId = entity.id;
      entity = entity.parent;
    }

    if (tab != undefined) {
      if (tab.entityId != entity.uuid) {
        tab.text = entity.name;
        tab.entityId = entity.uuid;
        tab.entity = entity;
        tab.journalId = options.journalId;

        if ((game.user.isGM || setting('allow-player')) && tab.entityId != undefined) {    //only save the history if the player is a GM or they get the full journal experience... and if it's not a blank tab
          if (tab.history == undefined)
            tab.history = [];
          if (tab.historyIdx != undefined) {
            tab.history = tab.history.slice(tab.historyIdx);
            tab.historyIdx = 0;
          }
          tab.history.unshift(tab.entityId);

          if (tab.history.length > 10)
            tab.history = tab.history.slice(0, 10);
        }

        this._saveTabs();

        //$(`.fwb-tab[data-tab-id="${tab.id}"]`, this.element).attr('title', tab.text).find('.tab-content').html(tab.text);
      } else if (tab.entity == undefined) {
        tab.entity = entity;
      }

      //$('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
      //$('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));
      //this.updateHistory();
      this._updateRecent(tab.journal);
    }

    if (!this.rendered)
      return;

    this.render(true, mergeObject({ focus: true }, options));
  }

*/

  // remove the tab given by the id from the list
  private _closeTab(tabId: string) {
    // find the tab
    let tab = this._tabs.find((t) => (t.id === tabId));
    let index = this._tabs.findIndex((t) => (t.id === tabId));

    if (!tab) return;

    // remove it from the array
    this._tabs.splice(index, 1);

    if (this._tabs.length === 0) {
      this.openEntry();  // make a default tab if that was the last one (will also activate it) and save them
    } else if (tab.active) {
      // if it was active, make the one before it active (or after if it was up front)
      if (index===0) {
        this._activateTab(this._tabs[0].id);  // will also save them
      }
      else {
        this._activateTab(this._tabs[index-1].id);  // will also save them
      }
    }

    this._makeCallback(WBHeader.CallbackType.TabsChanged);
  }

  private _saveTabs() {
    userFlags.set(UserFlagKeys.tabs, this._tabs);
  }

  /*
  private _updateTabNames(uuid, name) {
    for (let tab of this._tabList) {
      if (tab.entityId == uuid) {
        $(`.fwb-tab[data-tab-id="${tab.id}"] .tab-content`, this.element).attr("title", name).html(name);
        tab.text = name;
        this._saveTabs();
        if (tab.active) {
          $('.window-title', this.element).html((tab.text || i18n("MonksEnhancedJournal.NewTab")) + ' - ' + i18n("MonksEnhancedJournal.Title"));
        }
      }
    }
  }

*/

  // add the current tab as a new bookmark
  _addBookmark(): void {
    //get the current tab and save the entity and name
    let tab = this._activeTab();

    // TODO - should disable the add button in this situation
    if (!tab?.entry)
      return;

    // see if a bookmark for the entry already exists
    if (this._bookmarks.find((b) => (b.entry.uuid === tab?.entry?.uuid)) != undefined) {
      ui?.notifications?.warn(localize("fwb.errors.duplicateBookmark"));
      return;
    }

    let bookmark = {
      id: randomID(),
      entry: tab.entry,
      icon: 'fa-place-of-worship'  // TODO - get icon based on type
    }

    this._bookmarks.push(bookmark);

    // TODO - need to create the context menu so you can delete the bookmark

    this._saveBookmarks();
    this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
  }

  private async _activateBookmark(bookmarkId: string) {
    let bookmark = this._bookmarks.find(b => b.id === bookmarkId);

    if (bookmark) {
      this.openEntry(bookmark?.entry.uuid, { newTab: false });
    }
  }

  // removes the bookmark with given id
  private _removeBookmark(id: string) {
    this._bookmarks.findSplice(b => b.id === id);
    this._saveBookmarks();

    this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
  }

  private _saveBookmarks() {
    userFlags.set(UserFlagKeys.bookmarks, this._bookmarks);
  }

  // moves forward/back through the history "move" spaces (or less if not possible); negative numbers move back
  private async _navigateHistory(move: number) {
    let tab = this._activeTab();

    if (!tab) return;

    const newSpot = Math.clamped(tab.historyIdx + move, 0, tab.history.length-1);

    // if we didn't move, return
    if (newSpot === tab.historyIdx)
      return;

    tab.historyIdx = newSpot;
    await this.openEntry(tab.history[tab.historyIdx], { activate: false, newTab: false, updateHistory: false});  // will also save the tab and update recent

    this._makeCallback(WBHeader.CallbackType.HistoryMoved);
  }
/*
async getHistory() {
  let index = 0;
  let tab = this._activeTab();
  let menuItems = [];

  if (tab?.history == undefined)
    return;

  for (let i = 0; i < tab.history.length; i++) {
    let h = tab.history[i];
    let entity = await this.findEntity(h, '');
    if (tab?.entity?.id != undefined) {
      let type = (entity.getFlag && entity.getFlag('monks-enhanced-journal', 'type'));
      let icon = MonksEnhancedJournal.getIcon(type);
      let item = {
        name: entity.name || i18n("MonksEnhancedJournal.Unknown"),
        icon: `<i class="fas ${icon}"></i>`,
        callback: (li) => {
          let idx = i;
          this.changeHistory(idx)
        }
      }
      menuItems.push(item);
    }
  };

  return menuItems;
}
*/

  // handle a bookmark or tab dragging
  private _onDragStart(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;

    if ($(target).hasClass('fwb-tab')) {
      const dragData = { 
        //from: this.object.uuid 
      } as { type: string, tabId?: string};

      let tabId = target.dataset.tabId;
      dragData.type = 'fwb-tab';   // JournalEntry... may want to consider passing a type that other things can do something with
      dragData.tabId = tabId;

      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    } else if ($(target).hasClass('fwb-bookmark-button')) {
      const dragData = { 
        //from: this.object.uuid 
      } as { type: string, bookmarkId?: string};;

      let bookmarkId = target.dataset.bookmarkId;
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
      // TODO - also handle off on the right to move to end
      const target = (event.currentTarget as HTMLElement).closest('.fwb-tab') as HTMLElement;
      if (!target)
        return false;

      if (data.tabId === target.dataset.tabId) return; // Don't drop on yourself

      // insert before the drop target
      let from = this._tabs.findIndex(t => t.id === data.tabId);
      let to = this._tabs.findIndex(t => t.id === target.dataset.tabId);
      this._tabs.splice(to, 0, this._tabs.splice(from, 1)[0]);

      // activate the moved one (will also save the tabs)
      this._activateTab(data.tabId);
      this._makeCallback(WBHeader.CallbackType.TabsChanged);
    } else if (data.type==='fwb-bookmark') {
      const target = (event.currentTarget as HTMLElement).closest('.fwb-bookmark-button') as HTMLElement;
      if (!target)
      return false;

      if (data.bookmarkId === target.dataset.bookmarkId) return; // Don't drop on yourself

      // insert before the drop target
      // TODO- ability to move to end
      let from = this._bookmarks.findIndex(b => b.id === data.bookmarkId);
      let to = this._bookmarks.findIndex(b => b.id === target.dataset.bookmarkId);
      this._bookmarks.splice(to, 0, this._bookmarks.splice(from, 1)[0]);

      // save bookmarks (we don't activate anything)
      this._saveBookmarks();
      this._makeCallback(WBHeader.CallbackType.BookmarksChanged);
    } else {
      return false;
    } 

    return true;
  }

  async _createContextMenus(html) {
    // bookmarks 
    new ContextMenu(html, ".fwb-bookmark-button", [
      {
        name: "fwb.contextMenus.bookmarks.openNewTab",
        icon: '<i class="fas fa-file-export"></i>',
        callback: async (li) => {
          let bookmark = this._bookmarks.find(b => b.id === li[0].dataset.bookmarkId);
          if (bookmark)
            this.openEntry(bookmark.entry.uuid, { newTab: true });
        }
      },
      {
        name: "fwb.contextMenus.bookmarks.delete",
        icon: '<i class="fas fa-trash"></i>',
        callback: li => {
          const bookmark = this._bookmarks.find(b => b.id === li[0].dataset.bookmarkId);
          if (bookmark)
            this._removeBookmark(bookmark.id);
        }
      }
    ]);

    // tabs
    // let history = await this.getHistory();
    // this._historycontext = new ContextMenu(html, ".mainbar .navigation .nav-button.history", history);
    // this._imgcontext = new ContextMenu(html, ".journal-body.oldentry .tab.picture", [
    //   {
    //     name: "MonksEnhancedJournal.Delete",
    //     icon: '<i class="fas fa-trash"></i>',
    //     callback: li => {
    //       log('Remove image on old entry');
    //     }
    //   }
    // ]);
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