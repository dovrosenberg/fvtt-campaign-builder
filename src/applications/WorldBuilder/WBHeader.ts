import { SettingKeys, moduleSettings } from '@/settings/ModuleSettings';
import { localize } from '@/utils/game';

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
      this._addTab();
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

    // $('.back-button, .forward-button', html).toggle(game.user.isGM || setting('allow-player')).on('click', this.navigateHistory.bind(this));
    html.find('#fwb-add-bookmark').on('click', () => { this._addBookmark(); });
    // html.find('.bookmark-button:not(#fwb-add-bookmark)').click(this.activateBookmark.bind(this));

    html.find('#fwb-add-tab').on('click', () => { this._addTab() });

    $('.fwb-tab', html).each((idx, elem) => {
    		//$(elem).on('click', (event: MouseEvent) => { event.preventDefault(); this._activateTab({tabId: $(elem).attr('data-tabid')})});
    });

    // listeners for the tab close buttons
    $(html).on('click', '.fwb-tab .close', (event: MouseEvent) => {
      let tabId;

      if (event.target)
        tabId = ($(event.target)?.closest('.fwb-tab')[0] as HTMLElement).dataset.tabid;

        if (tabId)
          this._removeTab(tabId);
    });
  }

  public get collapsed(): boolean {
    return this._collapsed;
  }

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

  // activate - switch to the tab after creating
  // refresh = rerender (the parent)
  // entry = the entry for the tab  (currently just journal entries)
  private async _addTab(options = { activate: true, refresh: true, entry: null as JournalEntryPage | null }): Promise<WindowTab> {
    let tab = {
      id: randomID(),
      text: localize('abc'),
      active: false,
      entry: options.entry,
      history: [],
      historyIdx: -1,
    } as WindowTab;
    
    // add to history and the tabs list
    this._tabs.push(tab);
    if (tab.entry)
      tab.history.push(tab.entry.uuid);

    if (options.activate)
      this._activateTab(tab.id);  //activating the tab should save it
    // else {
    //   this._saveTabs();
    // }

    //await this._updateRecent(tab.journal);

    this._makeCallback(WBHeader.CallbackType.TabAdded);
    return tab;
  }

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
    //   this.removeTab(tab, event);
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

    //this.saveTabs();
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

        this.saveTabs();

        //$(`.fwb-tab[data-tabid="${tab.id}"]`, this.element).attr('title', tab.text).find('.tab-content').html(tab.text);
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
      this._addTab(entity);
    } else {
      if (newtab === true) {
        //the journal is getting created
        //lets see if we can find  tab with this entity?
        let tab = this._tabList.find(t => t.entityId?.endsWith(entity.id));
        if (tab != undefined)
          this.activateTab(tab, null, options);
        else
          this._addTab(entity);
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
  private _removeTab(tabId: string) {
    // find the tab
    let tab = this._tabs.find((t) => (t.id === tabId));
    let index = this._tabs.findIndex((t) => (t.id === tabId));

    if (!tab) return;

    // remove it from the array
    this._tabs.splice(index, 1);

    if (this._tabs.length == 0) {
      this._addTab();  // make a default tab
    } else {
      // if it was active, make the one before it active (or after if it was up front)
      if (tab.active) {
        if (this._tabs.length===0) {
          this._addTab();
        } else {
          this._activateTab(this._tabs[index-1].id);
          // if (!this._activateTab(nextIdx))
          //   this.saveTabs();  
        }
      }

      this._makeCallback(WBHeader.CallbackType.TabRemoved);
    }
  }

  /*
  private _saveTabs() {
    let update = this._tabList.map(t => {
      let entity = t.entity;
      delete t.entity;
      let tab = duplicate(t);
      t.entity = entity;
      delete tab.element;
      delete tab.entity;
      //delete tab.history;  //technically we could save the history if it's just an array of ids
      //delete tab.historyIdx;
      delete tab.userdata;
      return tab;
    });
    game.user.update({
      flags: { 'monks-enhanced-journal': { 'tabs': update } }
    }, { render: false });
  }

  private _updateTabNames(uuid, name) {
    for (let tab of this._tabList) {
      if (tab.entityId == uuid) {
        $(`.fwb-tab[data-tabid="${tab.id}"] .tab-content`, this.element).attr("title", name).html(name);
        tab.text = name;
        this.saveTabs();
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

  /*
  async activateBookmark(event) {
    let id = event.currentTarget.dataset.bookmarkId;
    let bookmark = this._bookmarks.find(b => b.id == id);
    let entity = await this.findEntity(bookmark.entityId, bookmark.text);
    this.open(entity, setting("open-new-tab"));
  }

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

  this.saveTabs();

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