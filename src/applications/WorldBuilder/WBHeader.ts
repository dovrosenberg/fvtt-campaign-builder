import { SettingKeys, moduleSettings } from '@/settings/ModuleSettings';
import { getGame, localize } from '@/utils/game';

import './WBHeader.scss';
import { UserFlagKeys, userFlags } from '@/settings/UserFlags';
import { Bookmark, WindowTab } from '@/types';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';

export const WBHEADER_TEMPLATE = 'modules/world-builder/templates/WBHeader.hbs';

type WBHeaderData = {
  tabs: WindowTab[];
  collapsed: boolean;
  bookmarks: any[];  // TODO
  canBack: boolean;
  canForward: boolean;
}

export class WBHeader extends HandlebarsPartial<WBHeader.CallbackType> {
  private _tabs = [] as WindowTab[];  
  private _collapsed: boolean;
  private _bookmarks = [] as Bookmark[];

  constructor() {
    super();

    // setup the tabs and bookmarks
    this._tabs = userFlags.get(UserFlagKeys.tabs) || [];
    this._bookmarks = userFlags.get(UserFlagKeys.bookmarks) || [];

    // get collapsed state
    this._collapsed = moduleSettings.get(SettingKeys.startCollapsed);

    // if there are no tabs, add one
    if (!this._tabs.length)
      this.openTab();
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
    html.on('click', '#fwb-add-bookmark', (event) => { this._addBookmark(); });
    html.on('click', '.bookmark-button:not(#fwb-add-bookmark)', (event: MouseEvent): void => { this._activateBookmark((event.currentTarget as HTMLElement).attributes['data-bookmark-id'].value) });
    html.on('click', '#fwb-add-tab', () => { this.openTab() });
    html.on('click', '.fwb-tab', (event: MouseEvent): void => {
      this._activateTab((event.currentTarget as HTMLElement).attributes['data-tab-id'].value);
    });

    // $('.back-button, .forward-button', html).toggle(game.user.isGM || setting('allow-player')).on('click', this.navigateHistory.bind(this));

    // listeners for the tab close buttons
    $(html).on('click', '.fwb-tab .close', (event: MouseEvent) => {
      let tabId;

      if (event.currentTarget)
        tabId = ($(event.currentTarget)?.closest('.fwb-tab')[0] as HTMLElement).dataset.tabid;

        if (tabId)
          this._closeTab(tabId);
    });
  }

  public get collapsed(): boolean {
    return this._collapsed;
  }

  // activate - switch to the tab after creating
  // refresh = rerender (the parent)
  // entryId = the uuid of the entry for the tab  (currently just journal entries); if missing, open a "New Tab"
    public async openTab(entryId?: string, options?: { activate?: boolean, refresh?: boolean }): Promise<WindowTab> {
    // set defaults
    options = {
      activate: true,
      refresh: true,
      ...options,
    };

    let entry = entryId ? await fromUuid(entryId) as JournalEntry : null;

    let tab = {
      id: randomID(),
      text: !!entry ? entry.name : localize('fwb.labels.newTab'),
      active: false,
      entry: entry,
      history: [],
      historyIdx: -1,
    } as WindowTab;
    
    // add to history and the tabs list
    this._tabs.push(tab);
    if (entryId)
      tab.history.push(entryId);

    if (options.activate)
      this._activateTab(tab.id);  //activating the tab should save it
    else {
      this._saveTabs();
    }

    //await this._updateRecent(tab.journal);

    this._makeCallback(WBHeader.CallbackType.TabAdded);
    return tab;
  }

  /******************************************************
   * Private methods
  */
  private _canBack(tab?: WindowTab): boolean {
    let checkTab = tab || this._activeTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (!checkTab.historyIdx || (checkTab.historyIdx < checkTab.history.length - 1));
  }

  private _canForward(tab?: WindowTab): boolean {
    let checkTab = tab || this._activeTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && !!checkTab.historyIdx && (checkTab.historyIdx > 0);
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

  // add new page to the top of the history
  /*
  private async _updateRecent(journal: JournalEntryPage): Promise<void> {
    let recent = userFlags.get(UserFlagKeys.recentlyViewed) || [] as ViewHistory[];

    // remove any other places in history this already appears
    recent.findSplice((h) => h.journalId === journal.uuid);

    // insert in the front
    recent.unshift({ journalId: journal.uuid, name: journal.name } as ViewHistory);

    // trim if too long
    if (recent.length > 5)
      recent = recent.slice(0, 5);

    userFlags.set(UserFlagKeys.recentlyViewed, recent);
  }
*/

  // activate the given tab, first closing the current subsheet
  // tabId must exist
  async _activateTab(tabId: string): Promise<void> {
    //this.saveScrollPos();

    let tab: WindowTab | undefined;
    if (!tabId || !(tab = this._tabs.find((t)=>(t.id===tabId))))
      return;


    // TODO - do we want to enable this?  may need to refactor to handle in the click
    // if (event?.altKey) {
    //   // Open this outside of the Enhnaced Journal
    //   let document = await this.findEntity(tab?.entityId, tab?.text);
    //   if (document) {
    //     MonksEnhancedJournal.fixType(document);
    //     document.sheet.render(true);
    //   }
    // } else if (event?.shiftKey) {
    //   // Close this tab
    //   this._closeTab(tab, event);
    //   tab = this._activeTab(false);
    //   if (!tab) {
    //     if (this._tabList.length)
    //       tab = this._tabList[0];
    //     else
    //       tab = this._addTab();
    //   }
    // }

    // see if it's already current
    let currentTab = this._activeTab(false);
    if (currentTab?.id === tabId) {
      return;
    }

    // TODO - if there's an active tab, do we need to clean anything up? save?
    // 
    if (currentTab)
      currentTab.active = false;
    tab.active = true;

    this._saveTabs();
    //this.updateHistory();
    //this._updateRecent(tab.entity);

    this._makeCallback(WBHeader.CallbackType.TabActivated);
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

  private async open(entity, newtab, options) {
    //if there are no tabs, then create one
    this._tabs.active = null;
    if (this._tabList.length == 0) {
      this.openTab(entity);
    } else {
      if (newtab === true) {
        //the journal is getting created
        //lets see if we can find  tab with this entity?
        let tab = this._tabList.find(t => t.entityId?.endsWith(entity.id));
        if (tab != undefined)
          this.activateTab(tab, null, options);
        else
          this.openTab(entity);
      } else {
        if (await this?.subsheet?.close() !== false) {
          // Check to see if this entity already exists in the tab list
          let tab = this._tabList.find(t => t.entityId?.endsWith(entity.id));
          if (tab != undefined)
            this.activateTab(tab, null, options);
          else
            this.updateTab(this._activeTab(), entity, options);
        }
      }
    }
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
      this.openTab();  // make a default tab if that was the last one (will also activate it) and save them
    } else if (tab.active) {
      // if it was active, make the one before it active (or after if it was up front)
      if (index===0) {
        this._activateTab(this._tabs[0].id);  // will also save them
      }
      else {
        this._activateTab(this._tabs[index-1].id);  // will also save them
      }
    }

    this._makeCallback(WBHeader.CallbackType.TabRemoved);
  }

  private _saveTabs() {
    // get tab structure to save as a flag  (we don't save the history)
    let update = this._tabs.map((tab): WindowTab => ({
      id: tab.id, 
      active: tab.active,
      entry: tab.entry,
      text: tab.text,
      history: [],
      historyIdx: -1,
    }));

    userFlags.set(UserFlagKeys.tabs, update);
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

    // TODO - should not allow a bookmark for the home page... and, 
    //    should disable the add button

    // see if the bookmark already exists
    if (this._bookmarks.find((b) => (b.entryId === tab?.entry?.uuid)) != undefined) {
      ui?.notifications?.warn(localize("fwb.errors.duplicateBookmark"));
      return;
    }

    // TODO: get the type, to set the icon 
    // TODO: clean this up if we don't allow home to be bookmarked
    let bookmark = {
      id: randomID(),
      entryId: tab?.entry?.uuid || 'Sample',
      text: tab?.entry?.name || 'Sample',
      icon: 'fa-place-of-worship'  // TODO - get icon based on type
    }

    this._bookmarks.push(bookmark);

    // TODO - need to create the context menu so you can delete the bookmark

    //this.saveBookmarks();
    this._makeCallback(WBHeader.CallbackType.BookmarkAdded);
  }

  private async _activateBookmark(bookmarkId: string) {
    let bookmark = this._bookmarks.find(b => b.id === bookmarkId);

    if (bookmark) {
      this.openTab(bookmark?.entryId);
    }
  }

/*
  removeBookmark(bookmark) {
    this._bookmarks.findSplice(b => b.id == bookmark.id);
    $(`.bookmark-button[data-bookmark-id="${bookmark.id}"]`, this.element).remove();
    this.saveBookmarks();
  }

  saveBookmarks() {
    let update = this._bookmarks.map(b => {
      let bookmark = duplicate(b);
      return bookmark;
    });
    game.user.setFlag('monks-enhanced-journal', 'bookmarks', update);
  }
*/

/*
navigateHistory(event) {
  if (!$(event.currentTarget).hasClass('disabled')) {
    let dir = event.currentTarget.dataset.history;
    let tab = this._activeTab();

    if (tab.history.length > 1) {
      let result = true;
      let idx = 0;
      do {
        idx = ((tab.historyIdx == undefined ? 0 : tab.historyIdx) + (dir == 'back' ? 1 : -1));
        result = this.changeHistory(idx);
      } while (!result && idx > 0 && idx < tab.history.length )
    }
  }
  event.preventDefault();
}

async changeHistory(idx) {
  let tab = this._activeTab();
  tab.historyIdx = Math.clamped(idx, 0, (tab.history.length - 1));

  tab.entityId = tab.history[tab.historyIdx];
  tab.entity = await this.findEntity(tab.entityId, tab.text);
  tab.text = tab.entity.name;

  this._saveTabs();

  this.render(true, { autoPage: true } );

  this._updateRecent(tab.journal);

  //$('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
  //$('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));

  return (tab?.entity?.id != undefined);
}

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

  // Drag and drop of tabs and bookmarks
  // _canDragStart(selector) {
  //   if (selector == ".fwb-tab") return true;

  //   if (this.subsheet)
  //     return this.subsheet._canDragStart(selector);
  //   else
  //     return super._canDragStart(selector);
  // }

  // _canDragDrop(selector) {
  //   if (this.subsheet)
  //     return this.subsheet._canDragDrop(selector);
  //   else
  //     return true;
  // }

  // _onDragStart(event) {
  //   const target = event.currentTarget;

  //   if ($(target).hasClass('fwb-tab')) {
  //     const dragData = { from: this.object.uuid };

  //     let tabid = target.dataset.tabid;
  //     let tab = this._tabList.find(t => t.id == tabid);
  //     dragData.uuid = tab.entityId;
  //     dragData.type = "JournalTab";
  //     dragData.tabid = tabid;

  //     log('Drag Start', dragData);

  //     event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  //   } else if ($(target).hasClass('bookmark-button')) {
  //     const dragData = { from: this.object.uuid };

  //     let bookmarkId = target.dataset.bookmarkId;
  //     let bookmark = this._bookmarks.find(t => t.id == bookmarkId);
  //     dragData.uuid = bookmark.entityId;
  //     dragData.type = "Bookmark";
  //     dragData.bookmarkId = bookmarkId;

  //     log('Drag Start', dragData);

  //     event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  //   } else
  //     return this.subsheet._onDragStart(event);
  // }

  // async _onDrop(event) {
  //   log('enhanced journal drop', event);
  //   let result = $(event.currentTarget).hasClass('enhanced-journal-header') ? false : this.subsheet._onDrop(event);

  //   if (result instanceof Promise)
  //     result = await result;

  //   if (result === false) {
  //     let data;
  //     try {
  //       data = JSON.parse(event.dataTransfer.getData('text/plain'));
  //     }
  //     catch (err) {
  //       return false;
  //     }

  //     if (data.tabid) {
  //       const target = event.target.closest(".fwb-tab") || null;
  //       let tabs = duplicate(this._tabList);

  //       if (data.tabid === target.dataset.tabid) return; // Don't drop on yourself

  //       let from = tabs.findIndex(a => a.id == data.tabid);
  //       let to = tabs.findIndex(a => a.id == target.dataset.tabid);
  //       log('moving tab from', from, 'to', to);
  //       tabs.splice(to, 0, tabs.splice(from, 1)[0]);

  //       this._tabList = tabs;
  //       if (from < to)
  //         $('.fwb-tab[data-tab-id="' + data.tabid + '"]', this.element).insertAfter(target);
  //       else
  //         $('.fwb-tab[data-tab-id="' + data.tabid + '"]', this.element).insertBefore(target);

  //       game.user.update({
  //         flags: { 'monks-enhanced-journal': { 'tabs': tabs } }
  //       }, { render: false });
  //     } else if (data.bookmarkId) {
  //       const target = event.target.closest(".bookmark-button") || null;
  //       let bookmarks = duplicate(this._bookmarks);

  //       if (data.bookmarkId === target.dataset.bookmarkId) return; // Don't drop on yourself

  //       let from = bookmarks.findIndex(a => a.id == data.bookmarkId);
  //       let to = bookmarks.findIndex(a => a.id == target.dataset.bookmarkId);
  //       log('moving tab from', from, 'to', to);
  //       bookmarks.splice(to, 0, bookmarks.splice(from, 1)[0]);

  //       this._bookmarks = bookmarks;
  //       if (from < to)
  //         $('.bookmark-button[data-bookmark-id="' + data.bookmarkId + '"]', this.element).insertAfter(target);
  //       else
  //         $('.bookmark-button[data-bookmark-id="' + data.bookmarkId + '"]', this.element).insertBefore(target);

  //       game.user.update({
  //         flags: { 'monks-enhanced-journal': { 'bookmarks': bookmarks } }
  //       }, { render: false });
  //     } else if (data.type == 'Actor') {
  //       if (data.pack == undefined) {
  //         let actor = await fromUuid(data.uuid);
  //         if (actor && actor instanceof Actor)
  //           this.open(actor, setting("open-new-tab"));
  //       }
  //     } else if (data.type == 'JournalEntry') {
  //       let entity = await fromUuid(data.uuid);
  //       if (entity)
  //         this.open(entity, setting("open-new-tab"));
  //     }     
  //     log('drop data', event, data);
  //   }

  //   return result;
  // }
}


export namespace WBHeader {
  export enum CallbackType {
    TabActivated,
    TabAdded,
    TabRemoved,
    BookmarkAdded,
    SidebarToggled,
  }
}