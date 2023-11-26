import { SettingKeys, moduleSettings } from "@/settings/ModuleSettings";
import { getGame, localize } from "@/utils/game";

import '@/../styles/WBHeader.scss';
import { WorldBuilder } from "./WorldBuilder";

type WBHeaderData = {
  tabs: WindowTab[];
  collapsed: boolean;
  bookmarks: any[];  // TODO
  canBack: boolean;
  canForward: boolean;
}

export class WBHeader {
  private _parent: WorldBuilder;   // the parent object
  private _tabs = [] as WindowTab[];  // this is strange object that looks like an array plus an "active"
  private _collapsed: boolean;
  private _bookmarks = [];

  constructor(parent: WorldBuilder) {
    this._parent = parent;

    // setup the tabs
    this._tabs = duplicate(getGame().user?.getFlag('world-builder', 'tabs') || 
        [{ id: randomID(), text: localize('fwb.labels.newTab'), active: true, history: [] }]) as WindowTab[];
    this._tabs = this._tabs.map(t => { delete t.entity; return t; })

    // get collapsed state
    this._collapsed = moduleSettings.get(SettingKeys.startCollapsed);

    //this._bookmarks = duplicate(getGame().user?.getFlag('world-builder', 'bookmarks') || []);
  }

  public async render(): Promise<void> {
    // note: new object structure of parameter is OK, despite typescript error
    await loadTemplates({
      WBHeader: 'modules/world-builder/templates/WBHeader.hbs'
    });  
  }

  public getData(): WBHeaderData {
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
      this._parent.render();
    });

    // $('.back-button, .forward-button', html).toggle(game.user.isGM || setting('allow-player')).on('click', this.navigateHistory.bind(this));
    // html.find('.add-bookmark').click(this.addBookmark.bind(this));
    // html.find('.bookmark-button:not(.add-bookmark)').click(this.activateBookmark.bind(this));

    html.find('#fwb-add-tab').click(() => { this._addTab() });

    $('.fwb-tab', html).each((idx, elem) => {
    		$(elem).on('click', (event: MouseEvent) => { event.preventDefault(); this._activateTab({tabId: $(elem).attr('data-tabid')})});
    });

    // $('.fwb-tab .close').each(function () {
    // 		let tabid = $(this).closest('.fwb-tab')[0].dataset.tabid;
    // 		let tab = that.tabs.find(t => t.id == tabid);
    // 		$(this).click(that.removeTab.bind(that, tab));
    // });
  }

  public get collapsed(): boolean {
    return this._collapsed;
  }

  private _canBack(tab?: WindowTab): boolean {
    let checkTab = tab || this._activeTab();

    if (!checkTab)
      return false;

    return (checkTab.history?.length > 1) && (!checkTab.historyIdx || (checkTab.historyIdx < tab.history.length - 1));
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
  // pageId = TODO???
  // anchor = TODO???
  private _addTab(options = { activate: true, refresh: true, pageId: any, anchor: any }) {
    let tab = {
      id: randomID(),
      text: localize('fwb.labels.newTab'),
      active: false,
      // entityId: entity?.uuid,
      // entity: entity || { flags: { 'monks-enhanced-journal': { type: 'blank' }, content: localize('fwb.labels.newTab') } },
      pageId: options.pageId,
      anchor: options.anchor,
      history: [],
      historyIdx: 0,
    } as WindowTab;
    // if (tab.entityId != undefined)
    //   tab.history.push(tab.entityId);

    this._tabs.push(tab);

    if (options.activate)
      this._activateTab({tab: tab});  //activating the tab should save it
    else {
      this._saveTabs();
      if (options.refresh)
        this._parent.render(true, { focus: true });
    }

    this._updateRecent(tab.entity);

    return tab;
  }

  private async _updateRecent(entity) {
    if (entity.id) {
      let recent = (getGame().user?.getFlag("monks-enhanced-journal", "_recentlyViewed") || []) as any[];
      recent.findSplice((e) => e.id === entity.id || typeof e !== 'object');
      recent.unshift({ id: entity.id, uuid: entity.uuid, name: entity.name, type: entity.getFlag("monks-enhanced-journal", "type") });

      if (recent.length > 5)
        recent = recent.slice(0, 5);

      await getGame().user?.update({
        flags: { 'monks-enhanced-journal': { '_recentlyViewed': recent } }
      }, { render: false });
    }
  }

  // activate the given tab, first closing the current subsheet
  // if neither tab nor tabID is present, it adds a new one
  async _activateTab(opt: {tab?: WindowTab, tabId?: string | number, options?: any}) {
    const { tab, tabId, options } = opt;
    let newTab;

    this.saveScrollPos();

    if (await this?.subsheet?.close() === false)
      return false;

    if (tab) {
      newTab = tab;
    } else if (tabId) {
      if (typeof tab == 'string')
        newTab = this._tabs.find(t => t.id == tab);
      else if (typeof tab == 'number')
        newTab = this._tabs[tab];
    } else {
        newTab = this._addTab();
    }

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

    // look for the current tab
    let currentTab = this._activeTab(false);
    if (currentTab?.id != tab.id || this.subdocument == undefined) {
      tab.entity = await this.findEntity(tab.entityId, tab.text);
    }

    // if (currentTab?.id == tab.id) {
    //     this.display(tab.entity);
    //     this.updateHistory();
    //     return false;
    // }

    if (currentTab != undefined)
      currentTab.active = false;
    tab.active = true;

    this._tabs.active = null;

    //$(`.fwb-tab[data-tabid="${tab.id}"]`, this.element).addClass('active').siblings().removeClass('active');

    //this.display(tab.entity);

    this.saveTabs();

    //this.updateHistory();
    if (this.rendered)
      this.render(true, options);
    else {
      window.setTimeout(() => {
        $(`.fwb-tab[data-tabid="${tab.id}"]`, this.element).addClass("active").siblings().removeClass("active");
      }, 100);
    }

    this._updateRecent(tab.entity);

    return true;
  }

  private _updateTab(tab, entity, options = {}) {
    if (!entity)
      return;

    if (entity?.parent) {
      options.pageId = entity.id;
      entity = entity.parent;
    }

    if (tab != undefined) {
      if (tab.entityId != entity.uuid) {
        tab.text = entity.name;
        tab.entityId = entity.uuid;
        tab.entity = entity;
        tab.pageId = options.pageId;
        tab.anchor = options.anchor;

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
      this.updateRecent(tab.entity);
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

  private _removeTab(tab, event) {
    if (typeof tab == 'string')
      tab = this._tabList.find(t => t.id == tab);

    let idx = this._tabList.findIndex(t => t.id == tab.id);
    if (idx >= 0) {
      this._tabList.splice(idx, 1);
      $('.fwb-tab[data-tabid="' + tab.id + '"]', this.element).remove();
    }

    if (this._tabList.length == 0) {
      this._addTab();
    } else {
      if (tab.active) {
        let nextIdx = (idx >= this._tabList.length ? idx - 1 : idx);
        if (!this.activateTab(nextIdx))
          this.saveTabs();
      }
    }

    if (event != undefined)
      event.preventDefault();
  }

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


/*
  addBookmark() {
    //get the current tab and save the entity and name
    let tab = this._activeTab();

    if (tab?.entityId == undefined)
      return;

    if (this._bookmarks.find(b => b.entityId == tab.entityId) != undefined) {
      ui.notifications.warn(i18n("MonksEnhancedJournal.MsgOnlyOneBookmark"));
      return;
    }

    let entitytype = function(entity) {
      if (entity instanceof Actor)
        return 'actor';

      let flags = entity.data?.flags;
      let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'journalentry';

      return type;
    }

    let bookmark = {
      id: randomID(),
      entityId: tab.entityId,
      text: tab.entity.name,
      icon: MonksEnhancedJournal.getIcon(entitytype(tab.entity))
    }

    this._bookmarks.push(bookmark);

    $('<div>')
      .addClass('bookmark-button')
      .attr({ title: bookmark.text, 'data-bookmark-id': bookmark.id, 'data-entity-id': bookmark.entityId })
      .html(`<i class="fas ${bookmark.icon}"></i> ${bookmark.text}`)
      .appendTo('.bookmark-bar', this.element).get(0).click(this.activateBookmark.bind(this));

    this.saveBookmarks();
  }

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
}

