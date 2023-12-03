import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './Directory.scss';
import { getGame, localize } from '@/utils/game';

type DirectoryData = {
}

export class Directory extends HandlebarsPartial<Directory.CallbackType>  {
  static override _template = 'modules/world-builder/templates/Directory.hbs';
  
  constructor() {
    super();
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public async getData(): Promise<DirectoryData> {
    const data = {
      // @ts-ignore
      tree: ui.journal?.collection.tree,
      //canCreateEntry: ui.journal?.canCreateEntry,
      //canCreateFolder: ui.journal?.canCreateFolder,
      //sortIcon: ui.journal.collection.sortingMode === "a" ? "fa-arrow-down-a-z" : "fa-arrow-down-short-wide",
      //sortTooltip: ui.journal.collection.sortingMode === "a" ? "SIDEBAR.SortModeAlpha" : "SIDEBAR.SortModeManual",
      //searchIcon: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "fa-search" : "fa-file-magnifying-glass",
      //searchTooltip: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "SIDEBAR.SearchModeName" : "SIDEBAR.SearchModeFull",
      //documentCls: cls.documentName.toLowerCase(),
      //tabName: cls.metadata.collection,
      //sidebarIcon: cfg.sidebarIcon,
      folderIcon: "fas fa-folder",
      user: getGame().user,
      label: localize("MonksEnhancedJournal.Entry"),
      labelPlural: 'abc', //i18n(cls.metadata.labelPlural),
      //unavailable: game.user.isGM ? cfg.collection?.instance?.invalidDocumentIds?.size : 0
    };

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
    html.on('click', '#fwb-directory > .directory-list .directory-item', 
        (event: JQuery.ClickEvent): void => { 
          this._makeCallback(Directory.CallbackType.DirectoryEntrySelected, (event?.currentTarget as HTMLElement).dataset.entryId, event); })
  }
}


export namespace Directory {
  export enum CallbackType {
    DirectoryEntrySelected,
  }
}