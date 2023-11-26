import { getGame } from '@/utils/game';
import './WBFooter.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { HOMEPAGE_TEMPLATE, HomePage, } from './HomePage';

export const WBCONTENT_TEMPLATE = 'modules/world-builder/templates/WBContent.hbs';


type WBContentData = {
  showHomePage: boolean;   // should we show the home page (vs. regular content)
  HomePage: () => string,
}

export class WBContent extends HandlebarsPartial<WBContent.CallbackType>  {
  private _entryId: string | null;    // the entryId to show (will show homepage if null)

  constructor(entryId: string, options={}) {
    super();
    
    // look up the entry - note could use fromUuid, but it's a bit tricky for compendia and also async
    this._entryId = entryId;
    const journal = getGame().journal?.find((j) => (j.uuid===entryId));
    if (!journal) {
      // show the homepage
      this._entryId = null;
    }
  }

  protected _createPartials(): void {
    // we only need HomePage if there's no entry
    if (!this._entryId)
      this._partials.HomePage = new HomePage();
  }

  public async getData(): Promise<WBContentData> {
    const data = {
      showHomePage: (this._entryId===null),
      HomePage: () => HOMEPAGE_TEMPLATE,
      HomePageData: (this._entryId===null ? await this._partials.HomePage.getData() : {}),
    };

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
  }


  // public async _render(force?: boolean, options={}): Promise<void> {
  //   const retval = await super._render(force, options);

    //     options = mergeObject(options, mergeObject(defaultOptions, game.user.getFlag("monks-enhanced-journal", `pagestate.${this.object.id}`) || {}), { overwrite: false });

    //     let contentform = $('.content > section', this.element);

    //     if (this.object instanceof JournalEntry && this.object.pages.size == 1 && (!!getProperty(this.object.pages.contents[0], "flags.monks-enhanced-journal.type") || !!getProperty(this.object, "flags.monks-enhanced-journal.type"))) {
    //         let type = getProperty(this.object.pages.contents[0], "flags.monks-enhanced-journal.type") || getProperty(this.object, "flags.monks-enhanced-journal.type");
    //         if (type == "base" || type == "oldentry") type = "journalentry";
    //         let types = MonksEnhancedJournal.getDocumentTypes();
    //         if (types[type]) {
    //             this.object = this.object.pages.contents[0];
    //             let tab = this._activeTab();
    //             tab.entityId = this.object.uuid;
    //             tab.entity = this.object;
    //             this.saveTabs();
    //         }
    //     }

    //     MonksEnhancedJournal.fixType(this.object);

    //     force = force || this.tempOwnership;

    //     if (force != true) {
    //         let testing = this.object;
    //         if (testing instanceof JournalEntryPage && !!getProperty(testing, "flags.monks-enhanced-journal.type"))
    //             testing = testing.parent;

    //         if (!game.user.isGM && testing && ((!testing.compendium && testing.testUserPermission && !testing.testUserPermission(game.user, "OBSERVER")) || (testing.compendium && !testing.compendium.visible))) {
    //             this.object = {
    //                 name: this.object.name,
    //                 type: 'blank',
    //                 options: { hidebuttons: true },
    //                 flags: {
    //                     'monks-enhanced-journal': { type: 'blank' }
    //                 },
    //                 content: `${i18n("MonksEnhancedJournal.DoNotHavePermission")}: ${this.object.name}`
    //             }
    //         }
    //     } else if (!["blank", "folder"].includes(this.object.type) && this.object.testUserPermission) {
    //         if (!this.object.testUserPermission(game.user, "OBSERVER") || (this.object.parent && !this.object.parent.testUserPermission(game.user, "OBSERVER"))) {
    //             this.object.ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    //             if (this.object.parent)
    //                 this.object.parent.ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    //             this.tempOwnership = true;
    //         }
    //     }

    //     const cls = (this.object._getSheetClass ? this.object._getSheetClass() : null);
    //     if (!cls)
    //         this.subsheet = new EnhancedJournalSheet(this.object, this.object.options);
    //     else
    //         this.subsheet = new cls(this.object, { editable: this.object.isOwner, enhancedjournal: this });
    //     this.object._sheet = this.subsheet;

    //     this.subsheet.options.popOut = false;
    //     this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERING;

    //     this.activateFooterListeners(this.element);

    //     if (this.subsheet._getHeaderButtons && this.object.id && !(this.object instanceof JournalEntry)) {
    //         let buttons = this.subsheet._getHeaderButtons();
    //         buttons.findSplice(b => b.class == "share-image");
    //         Hooks.call(`getDocumentSheetHeaderButtons`, this.subsheet, buttons);

    //         $('> header a.subsheet', this.element).remove();
    //         let first = true;
    //         let a;
    //         for (let btn of buttons) {
    //             if ($('> header a.' + btn.class, this.element).length == 0) {   //don't repeat buttons
    //                 a = $('<a>').addClass(btn.class).addClass('subsheet').toggleClass('first', first)
    //                     .append($('<i>').addClass(btn.icon))
    //                     .append(i18n(btn.label))
    //                     .click(event => {
    //                         event.preventDefault();
    //                         btn.onclick.call(this.subsheet, event);
    //                     }).insertBefore($('> header a.close', this.element));
    //                 first = false;
    //             }
    //         }
    //         if (a)
    //             a.addClass('last');
    //     }

    //     this.subsheet.enhancedjournal = this;

    //     let templateData = await this.subsheet.getData(options);
    //     if (this.object instanceof JournalEntry) {
    //         game.user.setFlag("monks-enhanced-journal", `pagestate.${this.object.id}.journalId`, options?.journalId);

    //         templateData.mode = (options?.mode || templateData.mode);
    //         if (templateData.mode == modes.SINGLE) {
    //             let pageIndex = this.subsheet._pages.findIndex(p => p._id === options?.journalId);
    //             if (pageIndex == -1) pageIndex = this.subsheet.pageIndex;
    //             templateData.pages = [templateData.toc[pageIndex]];
    //             templateData.viewMode = { label: "JOURNAL.ViewMultiple", icon: "fa-solid fa-note", cls: "single-page" };
    //         } else {
    //             templateData.pages = templateData.toc;
    //             templateData.viewMode = { label: "JOURNAL.ViewSingle", icon: "fa-solid fa-notes", cls: "multi-page" };
    //         }

    //         let collapsed = options?.collapsed ?? this.subsheet.sidebarCollapsed;
    //         templateData.sidebarClass = collapsed ? "collapsed" : "";
    //         templateData.collapseMode = collapsed
    //             ? { label: "JOURNAL.ViewExpand", icon: "fa-solid fa-caret-left" }
    //             : { label: "JOURNAL.ViewCollapse", icon: "fa-solid fa-caret-right" };
    //     }

    //     //let defaultOptions = this.subsheet.constructor.defaultOptions;
    //     await loadTemplates({
    //         journalEntryPageHeader: "templates/journal/parts/page-header.html",
    //         journalEntryPageFooter: "templates/journal/parts/page-footer.html"
    //     });
    //     if (this.subsheet.sheetTemplates) {
    //         await loadTemplates(this.subsheet.sheetTemplates);
    //     }
    //     let html = await renderTemplate(this.subsheet.template, templateData);

    //     this.subdocument = $(html).get(0);
    //     this.subsheet.form = (this.subdocument.tagName == 'FORM' ? this.subdocument : $('form:first', this.subdocument).get(0));
    //     this.subsheet._element = $(this.subdocument);

    //     if (this.subsheet.refresh)
    //         this.subsheet.refresh();
    //     else if (this.object instanceof JournalEntry) {
    //         /*
    //         let old_render = this.subsheet._render;
    //         this.subsheet._render = async function (...args) {
    //             let result = await old_render(...args);
    //             this._saveScrollPositions();
    //             return result;
    //         }*/
    //         this.subsheet.render(true, options);
    //         if (templateData.mode != this.subsheet.mode) {
  //                 this.toggleViewMode({ preventDefault: () => { }, currentTarget: { dataset: { action: "toggleView" } } }, options);
    //         }
    //     }

    //     $('.window-title', this.element).html((this.subsheet.title || i18n("MonksEnhancedJournal.NewTab")) + ' - ' + i18n("MonksEnhancedJournal.Title"));

    //     if (this.subsheet._createDocumentIdLink)
    //         this.subsheet._createDocumentIdLink(this.element)

    //     $('.content', this.element).attr('entity-type', this.object.type).attr('entity-id', this.object.id);
    //     //extract special classes
    //     if (setting("extract-extra-classes")) {
    //         let extraClasses = this.subsheet.options.classes.filter(x => !["sheet", "journal-sheet", "journal-entry", "monks-journal-sheet"].includes(x) && !!x);
    //         if (extraClasses.length) {
    //             this.element.addClass(extraClasses);
    //         }
    //     }
    //     let classes = this.subsheet.options.classes.join(' ').replace('monks-enhanced-journal', '');
    //     if (game.system.id == "pf2e")
    //         classes += " journal-page-content";
    //     if (!(this.subsheet instanceof ActorSheet)) {
    //         if (!setting("use-system-tag"))
    //             classes = classes.replace(game.system.id, '');
    //     }

    //     if (this.object instanceof JournalEntry) {
    //         classes += (this.subsheet?.mode === modes.MULTIPLE ? " multiple-pages" : " single-page");
    //     }

    //     contentform.empty().attr('class', classes).append(this.subdocument); //.concat([`${game.system.id}`]).join(' ')

    //     if (!this.isEditable) {
    //         this.subsheet._disableFields(contentform[0]);
    //     }

    //     if (this.subsheet._createSecretHandlers) {
    //         this._secrets = this.subsheet._createSecretHandlers();
    //         this._secrets.forEach(secret => secret.bind(this.element[0]));
    //     }

    //     //connect the tabs to the enhanced journal so that opening the regular document won't try and change tabs on the other window.
    //     this._tabs = this.subsheet.options.tabs.map(t => {
    //         t.callback = this.subsheet._onChangeTab.bind(this);
    //         return new Tabs(t);
    //     });
    //     this._tabs.forEach(t => t.bind(this.subdocument));

    //     //reset the original drag drop
    //     this._dragDrop = this._createDragDropHandlers();
    //     this._dragDrop.forEach(d => d.bind(this.element[0]));

    //     //add the subsheet drag drop
    //     let subDragDrop = this.subsheet.options.dragDrop.map(d => {
    //         d.permissions = {
    //             dragstart: this._canDragStart.bind(this),
    //             drop: this._canDragDrop.bind(this)
    //         };
    //         d.callbacks = {
    //             dragstart: this._onDragStart.bind(this),
    //             dragover: this._onDragOver.bind(this),
    //             drop: this._onDrop.bind(this)
    //         };
    //         return new DragDrop(d);
    //     });
    //     subDragDrop.forEach(d => d.bind(contentform[0]));
    //     this._dragDrop = this._dragDrop.concat(subDragDrop);

    //     this.subsheet.activateListeners($(this.subdocument), this);

    //     $('button[type="submit"]', $(this.subdocument)).attr('type', 'button').on("click", this.subsheet._onSubmit.bind(this.subsheet));
    //     $('form.journal-header', $(this.subdocument)).on("submit", () => { return false; });

    //     if (this.subsheet.updateStyle && !["blank", "folder"].includes(this.object.type))
    //         this.subsheet.updateStyle(null, this.subdocument);

    //     let that = this;
    //     let oldSaveEditor = this.subsheet.saveEditor;
    //     this.subsheet.saveEditor = function (...args) {
    //         let result = oldSaveEditor.call(this, ...args);
    //         that.saveEditor(...args);
    //         return result;
    //     }

    //     let oldActivateEditor = this.subsheet.activateEditor;
    //     this.subsheet.activateEditor = function (...args) {
    //         that.activateEditor.apply(that, args);
    //         return oldActivateEditor.call(this, ...args);
    //     }

    //     if (this.subsheet.goToPage) {
    //         let oldGoToPage = this.subsheet.goToPage;
    //         this.subsheet.goToPage = function (...args) {
    //             let [journalId] = args;
    //             game.user.setFlag("monks-enhanced-journal", `pagestate.${that.object.id}.journalId`, journalId);
    //             return oldGoToPage.call(this, ...args);
    //         }
    //     }

    //     this.object._sheet = null;  // Adding this to prevent Quick Encounters from automatically opening

    //     if (!["blank", "folder"].includes(this.object.type)) {
    //         Hooks.callAll('renderJournalSheet', this.subsheet, contentform, templateData); //this.object);
    //         if (this.object._source.type == "text")
    //             Hooks.callAll('renderJournalTextPageSheet', this.subsheet, contentform, templateData);
    //         if (this.subsheet.object instanceof JournalEntryPage)
    //             Hooks.callAll('renderJournalPageSheet', this.subsheet, contentform, Object.assign({ enhancedjournal: this }, templateData));
    //     }

    //     this.object._sheet = this.subsheet;

    //     if (this.subsheet.options.scrollY) {
    //         let resetScrollPos = () => {
    //             let savedScroll = flattenObject(game.user.getFlag("monks-enhanced-journal", `pagestate.${this.object.id}.scrollPositions`) || {});
    //             this._scrollPositions = flattenObject(mergeObject(this._scrollPositions || {}, savedScroll));
    //             /*
    //             for (let [k, v] of Object.entries(this.subsheet._scrollPositions || {})) {
    //                 this._scrollPositions[k] = v || this._scrollPositions[k];
    //             }*/
    //             let oldScrollY = this.options.scrollY;
    //             this.options.scrollY = this.options.scrollY.concat(this.subsheet.options.scrollY);
    //             this._restoreScrollPositions(contentform);
    //             this.options.scrollY = oldScrollY;

    //             this.subsheet._scrollPositions = this._scrollPositions;
    //         }
    //         if (this.subsheet?.mode == modes.SINGLE)
    //             window.setTimeout(resetScrollPos, 100);
    //         else
    //             resetScrollPos();
    //     }

    //     this._lastentry = this.object.id;

    //     this.activateControls($('#journal-buttons', this.element).empty());

    //     this.object._sheet = null; //set this to null so that other things can open the sheet
    //     this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERED;

  //   return retval;
  // }

}


export namespace WBContent {
  export enum CallbackType {
  }
}