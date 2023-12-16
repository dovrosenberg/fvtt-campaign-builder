import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './Directory.scss';
import { getGame, localize } from '@/utils/game';

type DirectoryData = {
}

export class Directory extends HandlebarsPartial<Directory.CallbackType>  {
  static override _template = 'modules/world-builder/templates/Directory.hbs';

  private _rootFolder: Folder;  
  
  constructor(rootFolder: Folder) {
    super();

    this._rootFolder = rootFolder;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public async getData(): Promise<DirectoryData> {
    const data = {
      // @ts-ignore
      tree: this._rootFolder.children,
      //sortIcon: ui.journal.collection.sortingMode === "a" ? "fa-arrow-down-a-z" : "fa-arrow-down-short-wide",
      //sortTooltip: ui.journal.collection.sortingMode === "a" ? "SIDEBAR.SortModeAlpha" : "SIDEBAR.SortModeManual",
      //searchIcon: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "fa-search" : "fa-file-magnifying-glass",
      //searchTooltip: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "SIDEBAR.SearchModeName" : "SIDEBAR.SearchModeFull",
      //documentCls: cls.documentName.toLowerCase(),
      //sidebarIcon: cfg.sidebarIcon,
      folderIcon: 'fas fa-folder',
      user: getGame().user,
      label: localize('MonksEnhancedJournal.Entry'),
      labelPlural: 'abc', //i18n(cls.metadata.labelPlural),
      //unavailable: game.user.isGM ? cfg.collection?.instance?.invalidDocumentIds?.size : 0
    };

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
    html.on('click', '#fwb-directory > .fwb-world-list .fwb-world-item', 
        (event: JQuery.ClickEvent): void => { 
          this._makeCallback(Directory.CallbackType.DirectoryEntrySelected, (event?.currentTarget as HTMLElement).dataset.entryId, event); })

    // open/close a folder
    html.find('.fwb-world-item').on('click', (event: JQuery.ClickEvent) => {
      const folder = Folder.get(event.currentTarget.dataset.folderId);
      folder.expanded = !folder.expanded;

      // rather than re-render just for this, update the css
      jQuery(event.currentTarget).toggleClass('collapsed');
    });
  }
}


export namespace Directory {
  export enum CallbackType {
    DirectoryEntrySelected,
  }
}