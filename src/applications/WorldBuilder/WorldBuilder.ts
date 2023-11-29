/*

        // note that a pack can be a folder, too???

        // a uuid looks like: 
        Compendium.world.test-actors.JournalEntry.undefined
        game.packs.find((p)=>(p.getUuid()==='Compendium.world.test-actors.JournalEntry.undefined')).getUuid()

        // 
        // creating a compendium
        metadata: {label: "Places", type: "JournalEntry"}
        const pack = await CompendiumCollection.createCompendium(metadata);
        if ( targetFolderId ) await pack.setFolder(targetFolderId);

        // deleting
        pack.deleteCompendium(),

        // getting a folder
        folder = Folder.get(targetFolderId)
        folder.id 
        folder.uuid = 'Folder.XXXX'

        // creating a folder
        ???
*/


import './WorldBuilder.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { WBHEADER_TEMPLATE, WBHeader } from './WBHeader';
import { WBFOOTER_TEMPLATE, WBFooter } from './WBFooter';
import { WBCONTENT_TEMPLATE, WBContent } from './content/WBContent';
import { DIRECTORY_TEMPLATE, Directory } from './directory/Directory';

import { localize } from '@/utils/game';


export class WorldBuilder extends Application {
  // sub-components
  private _partials: Record<string, HandlebarsPartial<any>>;

  // global data
  private _rootFolderId: string;  // uuid of the root folder
  private _worldId: string;  // uuid of the current world folder

  // state - often tracking state of children
  private _currentJournalId: string;    // uuid of currently displayed page

  searchresults = [];
  searchpos = 0;
  lastquery = '';
  _imgcontext = null;

  constructor(rootFolderId: string, worldId: string, options = {}) {
    super(options);

    this._currentJournalId = 'JournalEntry.56SZqpKQIORkR0iq';

    this._partials = {
      WBHeader: new WBHeader(),
      WBFooter: new WBFooter(),
      WBContent: new WBContent(this._currentJournalId),
      Directory: new Directory(), 
    }

    this._rootFolderId = rootFolderId;
    this._worldId = worldId;

    // this._lastentry = null;

    // //load up the last entry being shown
    // this.object = object;
    // if (object != undefined)
    //     this.open(object, options?.newtab, {});
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "WorldBuilder",
      template: "modules/world-builder/templates/WorldBuilder.hbs",
      title: localize('fwb.title'),
      classes: ['fwb-main-window'], 
      popOut: true,
      width: 1025,
      height: 700,
      resizable: true,
      editable: true,
      //dragDrop: [{ dragSelector: ".fwb-tab, .bookmark-button", dropSelector: ".enhanced-journal-header" }],
      closeOnSubmit: false,
      submitOnClose: false,
      submitOnChange: true,
      //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      scrollY: ["ol.directory-list"]
    });
  }

  /*
  get entryType() {
    return ui.journal.collection.documentName;
  }

  get _onCreateDocument() {
    return ui.journal._onCreateDocument;
  }

  get collection() {
    return ui.journal.collection;
  }

  get isEditable() {
    let object = this.object;
    if (object instanceof JournalEntryPage && !!getProperty(object, "flags.monks-enhanced-journal.type")) {
      let type = getProperty(object, "flags.monks-enhanced-journal.type");
      if (type == "base" || type == "oldentry") type = "journalentry";
      let types = MonksEnhancedJournal.getDocumentTypes();
      if (types[type]) {
        object = object.parent;
      }
    }

    let editable = !!this.options["editable"] && object.isOwner;
    if (object.pack) {
      const pack = game.packs.get(object.pack);
      if (pack.locked) editable = false;
    }
    return editable;
  }
  */

  async getData(options): Promise<Object> {
    const data = {
      ...(await super.getData(options)),
      collapsed: (this._partials.WBHeader as unknown as WBHeader).collapsed,
      WBHeader: () => WBHEADER_TEMPLATE,
      WBHeaderData: await this._partials.WBHeader.getData(),
      WBContent: () => WBCONTENT_TEMPLATE,
      WBFooterData: await this._partials.WBFooter.getData(),
      WBFooter: () => WBFOOTER_TEMPLATE,
      WBContentData: await this._partials.WBContent.getData(),
      Directory: () => DIRECTORY_TEMPLATE,
      DirectoryData: await this._partials.Directory.getData(),
      // user: game.user,
    };

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    Object.values(this._partials).forEach((p: HandlebarsPartial<any>) => { 
      p.activateListeners(html); 
    });

    // setup component listeners
    this._partials.WBHeader.registerCallback(WBHeader.CallbackType.TabAdded, ()=> { this.render(); });
    this._partials.WBHeader.registerCallback(WBHeader.CallbackType.TabRemoved, ()=> { this.render(); });
    this._partials.WBHeader.registerCallback(WBHeader.CallbackType.TabActivated, ()=> { this.render(); });
    this._partials.WBHeader.registerCallback(WBHeader.CallbackType.BookmarkAdded, ()=> { this.render(); });
    this._partials.WBHeader.registerCallback(WBHeader.CallbackType.SidebarToggled, ()=> { this.render(); });

    // when 
    this._partials.Directory.registerCallback(Directory.CallbackType.DirectoryEntrySelected, 
        (entryId: string) => { 
          (this._partials.WBHeader as WBHeader).openTab({ entryId }); 
        });

    // this._contextMenu(html);
  }

  public async render(force?: boolean, options = {}) {
    let retval = await super.render(force, options);

    // if (setting('background-image') != 'none') {
    //     $(this.element).attr("background-image", setting('background-image'));
    // } else {
    //     $(this.element).removeAttr("background-image");
    // }

    // if (setting('sidebar-image') != 'none') {
    //     $(this.element).attr("sidebar-image", setting('sidebar-image'));
    // } else {
    //     $(this.element).removeAttr("sidebar-image");
    // }

    // if (this.element.length) {
    //   this.renderDirectory().then((html) => {
    //     //MonksEnhancedJournal.updateDirectory(html, false);
    //   })

    //   this.renderSubSheet(force, options); 
    // }

    return retval;
  }

    // why not make this a partial?
  async renderDirectory() {
    // const cfg = CONFIG["JournalEntry"];
    // const cls = cfg.documentClass;
    // let template = "modules/monks-enhanced-journal/templates/directory.html";
    // let data = {
    //     tree: ui.journal.collection.tree,
    //     entryPartial: ui.journal.constructor.entryPartial,
    //     folderPartial: ui.journal.constructor.folderPartial,
    //     canCreateEntry: ui.journal.canCreateEntry,
    //     canCreateFolder: ui.journal.canCreateFolder,
    //     sortIcon: ui.journal.collection.sortingMode === "a" ? "fa-arrow-down-a-z" : "fa-arrow-down-short-wide",
    //     sortTooltip: ui.journal.collection.sortingMode === "a" ? "SIDEBAR.SortModeAlpha" : "SIDEBAR.SortModeManual",
    //     searchIcon: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "fa-search" : "fa-file-magnifying-glass",
    //     searchTooltip: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "SIDEBAR.SearchModeName" : "SIDEBAR.SearchModeFull",
    //     documentCls: cls.documentName.toLowerCase(),
    //     tabName: cls.metadata.collection,
    //     sidebarIcon: cfg.sidebarIcon,
    //     folderIcon: "fas fa-folder",
    //     user: game.user,
    //     label: i18n("MonksEnhancedJournal.Entry"),
    //     labelPlural: i18n(cls.metadata.labelPlural),
    //     unavailable: game.user.isGM ? cfg.collection?.instance?.invalidDocumentIds?.size : 0
    // };

    // let html = await renderTemplate(template, data);
    // html = $(html);

    // $('#fwb-directory-sidebar', this.element).empty().append(html);

    // folder = game.journal.directory.folders.find(f => (f.name == '_simple_calendar_notes_directory' && f.parent == null));
    // if (folder) {
    //     let elem = html.find(`.folder[data-folder-id="${folder.id}"]`);
    //     elem.remove();
    // }

    // this.activateDirectoryListeners(html);

    // this._restoreScrollPositions(html);

    // return html;
  }

  
  /*
  _saveScrollPositions(html) {
    super._saveScrollPositions(html);
    if (this.subsheet && this.subsheet.rendered && this.subsheet.options.scrollY && this.subsheet.object.id == this.object.id) {   //only save if we're refreshing the sheet
      const selectors = this.subsheet.options.scrollY || [];

      this._scrollPositions = selectors.reduce((pos, sel) => {
        //const el = $(sel, this.subdocument);
        //if (el.length === 1) pos[sel] = Array.from(el).map(el => el[0].scrollTop);
        const el = $(this.subdocument).find(sel);
        pos[sel] = Array.from(el).map(el => el.scrollTop);
        return pos;
      }, (this._scrollPositions || {}));

      game.user.setFlag("monks-enhanced-journal", `pagestate.${this.object.id}.scrollPositions`, flattenObject(this._scrollPositions));
    }
  }

  saveScrollPos() {
    if (this?.subsheet && this.subsheet.options.scrollY && this.subsheet.object.id == this.object.id) {   //only save if we're refreshing the sheet
      const selectors = this.subsheet.options.scrollY || [];

      let newScrollPositions = selectors.reduce((pos, sel) => {
        const el = $(this.subdocument).find(sel);
        pos[sel] = Array.from(el).map(el => el.scrollTop);
        return pos;
      }, {});

      let oldScrollPosition = flattenObject(game.user.getFlag("monks-enhanced-journal", `pagestate.${this.object.id}.scrollPositions`) || {});

      game.user.setFlag("monks-enhanced-journal", `pagestate.${this.object.id}.scrollPositions`, flattenObject(mergeObject(oldScrollPosition, newScrollPositions)));
    }
  }

  _activateEditor(div) {
    return this.subsheet._activateEditor.call(this, div);
  }

  activateEditor() {
    $('.nav-button.edit i', this.element).removeClass('fa-pencil-alt').addClass('fa-download').attr('title', i18n("MonksEnhancedJournal.SaveChanges"));
    $('.nav-button.split', this.element).addClass('disabled');
  }

  saveEditor(name) {
    $('.nav-button.edit i', this.element).addClass('fa-pencil-alt').removeClass('fa-download').attr('title', i18n("MonksEnhancedJournal.EditDescription"));
    $('.nav-button.split', this.element).removeClass('disabled');
    const editor = this.subsheet.editors[name];
    if (editor)
      editor.button.style.display = "";

    const owner = this.object.isOwner;
    (game.system.id == "pf2e" ? game.pf2e.TextEditor : TextEditor).enrichHTML(this.object.content, { secrets: owner, documents: true, async: true }).then((content) => {
      $(`.editor-content[data-edit="${name}"]`, this.element).html(content);
    });
    
  }

  activateControls(html) {
    let ctrls = [];
    if (this.subsheet._documentControls)
      ctrls = this.subsheet._documentControls();
    else if (this.object instanceof JournalEntry) {
      ctrls = this.journalEntryDocumentControls();
     }

    let that = this;

    Hooks.callAll('activateControls', this, ctrls);
    if (ctrls) {
      for (let ctrl of ctrls) {
        if (ctrl.conditional != undefined) {
          if (typeof ctrl.conditional == 'function') {
            if (!ctrl.conditional.call(this.subsheet, this.subsheet.object))
              continue;
          }
          else if (!ctrl.conditional)
            continue;
        }
        let div = '';
        switch (ctrl.type || 'button') {
          case 'button':
            div = $('<div>')
              .addClass('nav-button ' + ctrl.id)
              .attr('title', ctrl.text)
              .append($('<i>').addClass('fas ' + ctrl.icon))
              .on('click', ctrl.callback.bind(this.subsheet));
            break;
          case 'input':
            div = $('<input>')
              .addClass('nav-input ' + ctrl.id)
              .attr(mergeObject({ 'type': 'text', 'autocomplete': 'off', 'placeholder': ctrl.text }, (ctrl.attributes || {})))
              .on('keyup', function (event) {
                ctrl.callback.call(that.subsheet, this.value, event);
              });
            break;
          case 'text':
            div = $('<div>').addClass('nav-text ' + ctrl.id).html(ctrl.text);
            break;
        }

        if (ctrl.attr) {
          div.attr(ctrl.attr);
        }

        if (div != '') {
          if (ctrl.visible === false)
            div.hide();
          html.append(div);
        }
      }
    }

    if (this.object instanceof JournalEntry) {
      const modes = JournalSheet.VIEW_MODES;
      let mode = game.user.getFlag("monks-enhanced-journal", `pagestate.${this.object.id}.mode`) ?? this.subsheet?.mode;
      $('.viewmode', html).attr("data-action", "toggleView").attr("title", mode === modes.SINGLE ? "View Multiple Pages" : "View Single Page").find("i").toggleClass("fa-notes", mode === modes.SINGLE).toggleClass("fa-note", mode !== modes.SINGLE);
    }
  }

  get getDocumentTypes() {
    return mergeObject(MonksEnhancedJournal.getDocumentTypes(), {
      blank: EnhancedJournalSheet
    });
  }

  get entitytype() {
    if (this.object instanceof Actor)
      return 'actor';

    let flags = this.object?.flags;
    let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'oldentry';

    if (this.object?.folder?.name == '_fql_quests')
      type = 'oldentry';

    return type;
  }

  async close(options) {
    if (options?.submit !== false) {
      this.saveScrollPos();

      if (await this?.subsheet?.close() === false)
        return false;

      MonksEnhancedJournal.journal = null;
      // if there's a sound file playing, then close it
      for (let [key, sound] of Object.entries(this._backgroundsound)) {
        sound.stop();
      }

      Hooks.off(game.modules.get("monks-sound-enhancements")?.active ? "globalSoundEffectVolumeChanged" : "globalInterfaceVolumeChanged", this._soundHook);

      return super.close(options);
    }
  }

  tabChange(tab, event) {
    log('tab change', tab, event);
  }
*/

  /*
  async findEntity(entityId, text) {
    if (entityId == undefined)
      return { flags: { 'monks-enhanced-journal': { type: 'blank' } }, text: { content: "" } };
    else {
      let entity;
      if (entityId.indexOf('.') >= 0) {
        try {
          entity = await fromUuid(entityId);
        } catch (err) { log('Error find entity', entityId, err); }
      } else {
        if (entity == undefined)
          entity = game.journal.get(entityId);
        if (entity == undefined)
          entity = game.actors.get(entityId);
      }
      if (entity == undefined)
        entity = { name: text, flags: { 'monks-enhanced-journal': { type: 'blank' }, content: `${i18n("MonksEnhancedJournal.CannotFindEntity")}: ${text}` } };

      return entity;
    }
  }

  async deleteEntity(entityId){
    //an entity has been deleted, what do we do?
    for (let tab of this._tabList) {
      if (tab.entityId?.startsWith(entityId)) {
        tab.entity = await this.findEntity('', tab.text); //I know this will return a blank one, just want to maintain consistency
        tab.text = i18n("MonksEnhancedJournal.NewTab");
        $('.fwb-tab[data-tabid="${tab.id}"] .tab-content', this.element).html(tab.text);
      }

      //remove it from the history
      tab.history = tab.history.filter(h => h != entityId);

      if (tab.active && this.rendered)
        this.render(true);  //if this entity was being shown on the active tab, then refresh the journal
    }

    this.saveTabs();
  }
*/

  /*

  navigateFolder(event) {
    let ctrl = event.currentTarget;
    let id = ctrl.dataset.entityId;

    if (id == '')
      return;

    let entity = game.journal.find(j => j.id == id);
    this.open(entity);
  }



*/
/*
  _randomizePerson() {
    //randomize first name, last name, race, gender, profession
    //check first to see if the field needs to be rendomized, or if the fields are filled in
  }

  searchText(query) {
    let that = this;
    $('.editor .editor-content,.journal-entry-content', this.element).unmark().mark(query, {
      wildcards: 'enabled',
      accuracy: "complementary",
      separateWordSearch: false,
      noMatch: function () {
        if (query != '')
          $('.mainbar .navigation .search', that.element).addClass('error');
      },
      done: function (total) {
        if (query == '')
          $('.mainbar .navigation .search', that.element).removeClass('error');
        if (total > 0) {
          $('.mainbar .navigation .search', that.element).removeClass('error');
          let first = $('.editor .editor-content mark:first,.journal-entry-content .scrollable mark:first', that.element);
          $('.editor', that.element).parent().scrollTop(first.position().top - 10);
          $('.scrollable', that.element).scrollTop(first.position().top - 10);
        }
      }
    });
  }

  splitJournal(event) {
    if ($('.nav-button.split i', this.enhancedjournal.element).hasClass('disabled')) {
      ui.notifications.warn(i18n("MonksEnhancedJournal.CannotSplitJournal"));
      return;
    }

    this.splitJournal();
  }

  _canDragStart(selector) {
    if (selector == ".fwb-tab") return true;

    if (this.subsheet)
      return this.subsheet._canDragStart(selector);
    else
      return super._canDragStart(selector);
  }

  _canDragDrop(selector) {
    if (this.subsheet)
      return this.subsheet._canDragDrop(selector);
    else
      return true;
  }

  _onDragStart(event) {
    const target = event.currentTarget;

    if ($(target).hasClass('fwb-tab')) {
      const dragData = { from: this.object.uuid };

      let tabid = target.dataset.tabid;
      let tab = this._tabList.find(t => t.id == tabid);
      dragData.uuid = tab.entityId;
      dragData.type = "JournalTab";
      dragData.tabid = tabid;

      log('Drag Start', dragData);

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    } else if ($(target).hasClass('bookmark-button')) {
      const dragData = { from: this.object.uuid };

      let bookmarkId = target.dataset.bookmarkId;
      let bookmark = this._bookmarks.find(t => t.id == bookmarkId);
      dragData.uuid = bookmark.entityId;
      dragData.type = "Bookmark";
      dragData.bookmarkId = bookmarkId;

      log('Drag Start', dragData);

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    } else
      return this.subsheet._onDragStart(event);
  }

  async _onDrop(event) {
    log('enhanced journal drop', event);
    let result = $(event.currentTarget).hasClass('enhanced-journal-header') ? false : this.subsheet._onDrop(event);

    if (result instanceof Promise)
      result = await result;

    if (result === false) {
      let data;
      try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
      }
      catch (err) {
        return false;
      }

      if (data.tabid) {
        const target = event.target.closest(".fwb-tab") || null;
        let tabs = duplicate(this._tabList);

        if (data.tabid === target.dataset.tabid) return; // Don't drop on yourself

        let from = tabs.findIndex(a => a.id == data.tabid);
        let to = tabs.findIndex(a => a.id == target.dataset.tabid);
        log('moving tab from', from, 'to', to);
        tabs.splice(to, 0, tabs.splice(from, 1)[0]);

        this._tabList = tabs;
        if (from < to)
          $('.fwb-tab[data-tabid="' + data.tabid + '"]', this.element).insertAfter(target);
        else
          $('.fwb-tab[data-tabid="' + data.tabid + '"]', this.element).insertBefore(target);

        game.user.update({
          flags: { 'monks-enhanced-journal': { 'tabs': tabs } }
        }, { render: false });
      } else if (data.bookmarkId) {
        const target = event.target.closest(".bookmark-button") || null;
        let bookmarks = duplicate(this._bookmarks);

        if (data.bookmarkId === target.dataset.bookmarkId) return; // Don't drop on yourself

        let from = bookmarks.findIndex(a => a.id == data.bookmarkId);
        let to = bookmarks.findIndex(a => a.id == target.dataset.bookmarkId);
        log('moving tab from', from, 'to', to);
        bookmarks.splice(to, 0, bookmarks.splice(from, 1)[0]);

        this._bookmarks = bookmarks;
        if (from < to)
          $('.bookmark-button[data-bookmark-id="' + data.bookmarkId + '"]', this.element).insertAfter(target);
        else
          $('.bookmark-button[data-bookmark-id="' + data.bookmarkId + '"]', this.element).insertBefore(target);

        game.user.update({
          flags: { 'monks-enhanced-journal': { 'bookmarks': bookmarks } }
        }, { render: false });
      } else if (data.type == 'Actor') {
        if (data.pack == undefined) {
          let actor = await fromUuid(data.uuid);
          if (actor && actor instanceof Actor)
            this.open(actor, setting("open-new-tab"));
        }
      } else if (data.type == 'JournalEntry') {
        let entity = await fromUuid(data.uuid);
        if (entity)
          this.open(entity, setting("open-new-tab"));
      }     
      log('drop data', event, data);
    }

    return result;
  }

  async _updateObject(event, formData) {
    if (this._sheetMode === "image") {
      formData.name = formData.title;
      delete formData["title"];
      formData.img = formData.image;
      delete formData["image"];
    }
    return super._updateObject(event, formData);
  }

  async _onSwapMode(event, mode) {
    //don't do anything, but leave this here to prevent the regular journal page from doing anything
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    buttons.unshift({
      label: i18n("MonksEnhancedJournal.Maximize"),
      class: "toggle-fullscreen",
      icon: "fas fa-expand-arrows-alt",
      onclick: this.fullscreen.bind(this)
    });

    return buttons;
  }

  findMapEntry(event) {
    let journalId = $(event.currentTarget).attr('page-id');
    let journalId = $(event.currentTarget).attr('journal-id');

    let note = canvas.notes.placeables.find(n => {
      return n.document.entryId == journalId || n.document.journalId == journalId || (n.document.entryId == journalId && n.document.journalId == null);
    });
    canvas.notes.panToNote(note);
  }

  doShowPlayers(event) {
    if (event.shiftKey)
      this._onShowPlayers({ data: { users: null, object: this.object, options: { showpic: false } } });
    else if (event.ctrlKey)
      this._onShowPlayers({ data: { users: null, object: this.object, options: { showpic: true } } });
    else {
      this._onShowPlayers(event);
    }
  }

  fullscreen() {
    if (this.element.hasClass("maximized")) {
      this.element.removeClass("maximized");
      $('.toggle-fullscreen', this.element).html(`<i class="fas fa-expand-arrows-alt"></i>${i18n("MonksEnhancedJournal.Maximize")}`);
      this.setPosition({ width: this._previousPosition.width, height: this._previousPosition.height });
      this.setPosition({ left: this._previousPosition.left, top: this._previousPosition.top });
    } else {
      this.element.addClass("maximized");
      $('.toggle-fullscreen', this.element).html(`<i class="fas fa-compress-arrows-alt"></i>${i18n("MonksEnhancedJournal.Restore")}`);
      
      this._previousPosition = duplicate(this.position);
      this.setPosition({ left: 0, top: 0 });
      this.setPosition({ height: $('body').height(), width: $('body').width() - $('#sidebar').width() });
    }
  }

  _onSelectFile(selection, filePicker, event) {
    log(selection, filePicker, event);
    let updates = {};
    updates[filePicker.field.name] = selection;
    this.object.update(updates);
  }

  async convert(type, sheetClass) {
    this.object._sheet = null;
    MonksEnhancedJournal.fixType(this.object, type);
    await this.object.setFlag('monks-enhanced-journal', 'type', type);
    if (sheetClass)
      await this.object.setFlag('core', 'sheetClass', sheetClass);
    await ui.sidebar.tabs.journal.render(true);
    //MonksEnhancedJournal.updateDirectory($('#journal'));
  }

  async _contextMenu(html) {
    this._context = new ContextMenu(html, ".bookmark-button", [
      {
        name: "Open outside Enhanced Journal",
        icon: '<i class="fas fa-file-export"></i>',
        callback: async (li) => {
          let bookmark = this._bookmarks.find(b => b.id == li[0].dataset.bookmarkId);
          let document = await fromUuid(bookmark.entityId);
          if (!document) {
            document = game.journal.get(bookmark.entityId);
          }
          if (document) {
            MonksEnhancedJournal.fixType(document);
            document.sheet.render(true);
          }
        }
      },
      {
        name: "Open in new tab",
        icon: '<i class="fas fa-file-export"></i>',
        callback: async (li) => {
          let bookmark = this._bookmarks.find(b => b.id == li[0].dataset.bookmarkId);
          let document = await fromUuid(bookmark.entityId);
          if (!document) {
            document = game.journal.get(bookmark.entityId);
          }
          if (document) {
            MonksEnhancedJournal.fixType(document);
            this.open(document, true);
          }
        }
      },
      {
        name: "MonksEnhancedJournal.Delete",
        icon: '<i class="fas fa-trash"></i>',
        callback: li => {
          const bookmark = this._bookmarks.find(b => b.id === li[0].dataset.bookmarkId);
          this.removeBookmark(bookmark);
        }
      }
    ]);

    this._tabcontext = new ContextMenu(html, ".fwb-tab-bar", [
      {
        name: "Open outside Enhanced Journal",
        icon: '<i class="fas fa-file-export"></i>',
        condition: (li) => {
          let tab = this._tabList.find(t => t.id == this.contextTab);
          return !["blank", "folder"].includes(tab.type);
        },
        callback: async (li) => {
          let tab = this._tabList.find(t => t.id == this.contextTab);
          let document = tab.entity;
          if (!tab.entity) {
            document = await fromUuid(tab.entityId);
          }
          if (document) {
            MonksEnhancedJournal.fixType(document);
            document.sheet.render(true);
          }
        }
      },
      {
        name: "Close Tab",
        icon: '<i class="fas fa-trash"></i>',
        callback: li => {
          let tab = this._tabList.find(t => t.id == this.contextTab);
          if (tab)
            this.removeTab(tab);
        }
      },
      {
        name: "Close All Tabs",
        icon: '<i class="fas fa-dumpster"></i>',
        callback: li => {
          this._tabList.splice(0, this._tabList.length);
          this.saveTabs();
          this.openTab();
        }
      }
    ]);
    $('.fwb-tab-bar', html).on("contextmenu", (event) => {
      var r = document.querySelector(':root');
      let tab = event.target.closest(".fwb-tab");
      if (!tab) {
        event.stopPropagation();
        event.preventDefault();
        return false;
      }
      let x = $(tab).position().left;
      r.style.setProperty('--mej-context-x', x + "px");
    });
    $('.fwb-tab-bar .fwb-tab', html).on("contextmenu", (event) => {
      this.contextTab = event.currentTarget.dataset.tabid;
    });
    $('.fwb-bookmark-bar .bookmark-button', html).on("contextmenu", (event) => {
      this.contextBookmark = event.currentTarget.dataset.bookmarkId;
    });

    let history = await this.getHistory();
    this._historycontext = new ContextMenu(html, ".mainbar .navigation .nav-button.history", history);
    this._imgcontext = new ContextMenu(html, ".journal-body.oldentry .tab.picture", [
      {
        name: "MonksEnhancedJournal.Delete",
        icon: '<i class="fas fa-trash"></i>',
        callback: li => {
          log('Remove image on old entry');
        }
      }
    ]);

    this._convertmenu = new ContextMenu(html, ".nav-button.convert", [
      {
        name: i18n("MonksEnhancedJournal.encounter"),
        icon: '<i class="fas fa-toolbox"></i>',
        callback: li => {
          this.convert('encounter');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.event"),
        icon: '<i class="fas fa-calendar-days"></i>',
        callback: li => {
          this.convert('event');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.journalentry"),
        icon: '<i class="fas fa-book-open"></i>',
        callback: li => {
          this.convert('journalentry', "monks-enhanced-journal.TextEntrySheet");
        }
      },
      {
        name: i18n("MonksEnhancedJournal.loot"),
        icon: '<i class="fas fa-donate"></i>',
        callback: li => {
          this.convert('loot');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.organization"),
        icon: '<i class="fas fa-flag"></i>',
        callback: li => {
          this.convert('organization');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.person"),
        icon: '<i class="fas fa-user"></i>',
        callback: li => {
          this.convert('person');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.picture"),
        icon: '<i class="fas fa-image"></i>',
        callback: li => {
          this.convert('picture');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.place"),
        icon: '<i class="fas fa-place-of-worship"></i>',
        callback: li => {
          this.convert('place');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.poi"),
        icon: '<i class="fas fa-map-marker-alt"></i>',
        callback: li => {
          this.convert('poi');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.quest"),
        icon: '<i class="fas fa-map-signs"></i>',
        callback: li => {
          this.convert('quest');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.shop"),
        icon: '<i class="fas fa-dolly-flatbed"></i>',
        callback: li => {
          this.convert('shop');
        }
      },
      {
        name: i18n("MonksEnhancedJournal.textimage"),
        icon: '<i class="fas fa-book-open-reader"></i>',
        callback: li => {
          this.convert('journalentry', "monks-enhanced-journal.TextImageEntrySheet");
        }
      }
    ], { eventName: 'click' });
  }

  async _onChangeInput(event) {
    return this.subsheet._onChangeInput(event);
  }
*/
/*    activateDirectoryListeners(html) {   
    $('#fwb-sidebar-toggle', html).on('click', () => {
      if (this._collapsed)
        this.expandSidebar();
      else
        this.collapseSidebar();
    });
    //_onClickPageLink

    ui.journal._contextMenu.call(ui.journal, html);

    const directory = html.find(".directory-list");
    const entries = directory.find(".directory-item");

    // Directory-level events
    html.find(`[data-folder-depth="${this.maxFolderDepth}"] .create-folder`).remove();
    html.find('.toggle-sort').click((event) => {
      event.preventDefault();
      ui.journal.collection.toggleSortingMode();
      ui.journal.render();
    });
    html.find(".collapse-all").click(ui.journal.collapseAll.bind(this));

    // Intersection Observer
    const observer = new IntersectionObserver(ui.journal._onLazyLoadImage.bind(this), { root: directory[0] });
    entries.each((i, li) => observer.observe(li));

    // Entry-level events
    directory.on("click", ".entry-name", ui.journal._onClickEntryName.bind(ui.journal));
    directory.on("click", ".folder-header", ui.journal._toggleFolder.bind(this));
    const dh = ui.journal._onDragHighlight.bind(this);
    html.find(".folder").on("dragenter", dh).on("dragleave", dh);
    //this._contextMenu(html);

    // Allow folder and entry creation
    if (ui.journal.canCreateFolder) html.find(".create-folder").click(ui.journal._onCreateFolder.bind(this));
    if (ui.journal.canCreateEntry) html.find(".create-entry").click(ui.journal._onCreateEntry.bind(this));

    this._searchFilters = [new SearchFilter({ inputSelector: 'input[name="search"]', contentSelector: ".directory-list", callback: ui.journal._onSearchFilter.bind(ui.journal) })];
    this._searchFilters.forEach(f => f.bind(html[0]));

    ui.journal._dragDrop.forEach(d => d.bind(html[0]));
  }
*/

/*
  activateFooterListeners(html) {
    let folder = (this.object.folder || this.object.parent?.folder);
    let content = folder ? folder.contents : ui.journal.collection.tree?.entries || ui.journal.documents;
    let sorting = folder?.sorting || ui.journal.collection.sortingMode || "m";
    
    let documents = content
      .map(c => {
        if (c.testUserPermission && !c.testUserPermission(game.user, "OBSERVER"))
          return null;
        return {
          id: c.id,
          name: c.name || "",
          sort: c.sort
        }
      })
      .filter(d => !!d)
      .sort((a, b) => {
        return sorting == "m" ? a.sort - b.sort : a.name.localeCompare(b.name);
      })
    let idx = documents.findIndex(e => e.id == this.object.id || e.id == this.object.parent?.id);

    let prev = (idx > 0 ? documents[idx - 1] : null);
    let next = (idx < documents.length - 1 ? documents[idx + 1] : null);
    $('.navigate-prev', html).toggle(!["blank", "folder"].includes(this.object.type)).toggleClass('disabled', !prev).attr("title", prev?.name).on("click", this.openPage.bind(this, prev));
    $('.navigate-next', html).toggle(!["blank", "folder"].includes(this.object.type)).toggleClass('disabled', !next).attr("title", next?.name).on("click", this.openPage.bind(this, next));

    if (this.object instanceof JournalEntry) {
      $('.page-prev', html).toggleClass("disabled", !this.subsheet || this.subsheet?.pageIndex < 1).show().on("click", this.previousPage.bind(this));
      $('.page-next', html).toggleClass("disabled", !this.subsheet || this.subsheet?.pageIndex >= (this.object?.pages?.size || 0) - 1).show().on("click", this.nextPage.bind(this));
    // } else if (this.object instanceof JournalEntryPage) {
    //     let pageIdx = this.object.parent.pages.contents.findIndex(p => p.id == this.object.id);
    //     let prevPage = (pageIdx > 0 ? this.object.parent.pages.contents[pageIdx - 1] : null);
    //     let nextPage = (pageIdx < this.object.parent.pages?.contents.length - 1 ? this.object.parent.pages.contents[pageIdx + 1] : null);
    //     $('.page-prev', html).toggleClass('disabled', !prevPage).toggle(this.object.parent.pages?.contents?.length > 1).attr("title", prevPage?.name).on("click", this.previousPage.bind(this, prevPage));
    //     $('.page-next', html).toggleClass('disabled', !nextPage).toggle(this.object.parent.pages?.contents?.length > 1).attr("title", nextPage?.name).on("click", this.nextPage.bind(this, nextPage));
    
    } else {
      $('.page-prev', html).hide();
      $('.page-next', html).hide();
    }

    $('.add-page', html).on("click", this.addPage.bind(this));
    $('.toggle-menu', html).toggle(!(this.object instanceof JournalEntryPage)).on("click", this.toggleMenu.bind(this));
   }

  journalEntryDocumentControls() {
    let ctrls = [
      { text: '<i class="fas fa-search"></i>', type: 'text' },
      { id: 'search', type: 'input', text: "Search Journal", callback: this.searchText },
      { id: 'viewmode', text: "View Single Page", icon: 'fa-notes', callback: this.toggleViewMode.bind(this) },
      {
        id: 'add', text: "Add a Page", icon: 'fa-file-plus', conditional: (doc) => {
          return game.user.isGM || doc.isOwner
        }, callback: this.addPage
      },
      { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.doShowPlayers }
    ];

    return ctrls;
  }

  openPage(journalToOpen) {
    if (!journalToOpen?.id)
      return;
    let journal = game.journal.get(journalToOpen.id);
    if (journal) this.open(journal);
  }

  toggleMenu() {
    if (this.subsheet.toggleSidebar) this.subsheet.toggleSidebar(event);
    game.user.setFlag("monks-enhanced-journal", `pagestate.${this.object.id}.collapsed`, this.subsheet.sidebarCollapsed);
  }

  toggleViewMode(event) {
    this.subsheet._onAction(event);
    const modes = JournalSheet.VIEW_MODES;
    game.user.setFlag("monks-enhanced-journal", `pagestate.${this.object.id}.mode`, this.subsheet.mode);
    $('.viewmode', this.element).attr("title", this.subsheet.mode === modes.SINGLE ? "View Multiple Pages" : "View Single Page")
      .find("i")
      .toggleClass("fa-notes", this.subsheet.mode === modes.SINGLE)
      .toggleClass("fa-note", this.subsheet.mode !== modes.SINGLE);
  }

  journalSettings() {

  }

  addPage() {
    // let journal = this.object.parent || this.object;

    // const options = { parent: journal };
    // return JournalEntryPage.implementation.createDialog({}, options);
    this.createPage();
  }

  previousPage() {
    if (this.subsheet) {
      if (this.subsheet.previousPage) this.subsheet.previousPage(event);
      $('.page-prev', this.element).toggleClass("disabled", !this.subsheet || this.subsheet?.pageIndex < 1);
      $('.page-next', this.element).toggleClass("disabled", !this.subsheet || this.subsheet?.pageIndex >= this.subsheet?._pages.length - 1);
    }
  }

  nextPage() {
    if (this.subsheet) {
      if (this.subsheet.nextPage) this.subsheet.nextPage(event);
      $('.page-prev', this.element).toggleClass("disabled", !this.subsheet || this.subsheet?.pageIndex < 1);
      $('.page-next', this.element).toggleClass("disabled", !this.subsheet || this.subsheet?.pageIndex >= this.subsheet?._pages.length - 1);
    }
  }*/
}