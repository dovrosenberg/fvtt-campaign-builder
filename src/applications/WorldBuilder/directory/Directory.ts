import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './Directory.scss';
import { getGame, localize } from '@/utils/game';
import { createEntry } from '@/compendia';
import { Topic } from '@/types';

type DirectoryData = {
  worlds: {
    world: { name: string, id: string },
    compendia: { 
      name: string, 
      id: string,
      entries: { name: string, id: string } ,
    }[],
  }[],
  folderIcon: string,
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
      worlds: this._rootFolder.children.map((world)=> ({
        name: world.folder.name,
        id: world.folder.uuid,
        compendia: world.entries.map((compendium)=>({
          name: compendium.metadata.label,
          id: compendium.metadata.id,
          entries: compendium.tree.entries.map((entry)=> ({
            name: entry.name,
            id: entry.id,
          }))
        }))
      })),
      //sortIcon: ui.journal.collection.sortingMode === "a" ? "fa-arrow-down-a-z" : "fa-arrow-down-short-wide",
      //sortTooltip: ui.journal.collection.sortingMode === "a" ? "SIDEBAR.SortModeAlpha" : "SIDEBAR.SortModeManual",
      //searchIcon: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "fa-search" : "fa-file-magnifying-glass",
      //searchTooltip: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "SIDEBAR.SearchModeName" : "SIDEBAR.SearchModeFull",
      //documentCls: cls.documentName.toLowerCase(),
      //sidebarIcon: cfg.sidebarIcon,
      folderIcon: 'fas fa-folder',
    };

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
    // open/close a folder
    html.find('.fwb-world-folder').on('click', (event: JQuery.ClickEvent) => {
      // if it was already collapsed, then open it and change worlds

      // otherwise, do nothing


      const folder = Folder.get(event.currentTarget.dataset.folderId);
      folder.expanded = !folder.expanded;

      // rather than re-render just for this, update the css
      jQuery(event.currentTarget).toggleClass('collapsed');

      this._makeCallback(Directory.CallbackType.DirectoryEntrySelected, (event?.currentTarget as HTMLElement).dataset.entryId, event); 
    });

    // temp button
    html.find('#fwb-temp').on('click', () => {
      void createEntry(getGame().folders?.find((f)=>f.name==='World A') as Folder, randomID(), Topic.Character);
    });

  }
}


export namespace Directory {
  export enum CallbackType {
    DirectoryEntrySelected,
  }
}