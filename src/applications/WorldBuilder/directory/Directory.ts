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
      entries: { name: string, uuid: string } ,
    }[],
  }[],
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
            uuid: entry.uuid,
          }))
        }))
      })),
      //searchIcon: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "fa-search" : "fa-file-magnifying-glass",
      //searchTooltip: ui.journal.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME ? "SIDEBAR.SearchModeName" : "SIDEBAR.SearchModeFull",
    };

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
    // change world
    html.on('click', '.fwb-world-folder', (event: JQuery.ClickEvent) => {
      event.stopPropagation();

      if (event.currentTarget.dataset.worldId)
        this._makeCallback(Directory.CallbackType.WorldSelected, event.currentTarget.dataset.worldId);
    });

    // open/close a topic
    html.on('click', '.fwb-topic-folder', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      // toggle the collapse

      // rather than re-render just for this, update the css
      jQuery(event.currentTarget).toggleClass('collapsed');
    });

    // temp button
    html.find('#fwb-temp').on('click', () => {
      void createEntry(getGame().folders?.find((f)=>f.name==='World A') as Folder, randomID(), Topic.Character);
    });

    // select an entry
    html.on('click', '.fwb-entry-item', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      this._makeCallback(Directory.CallbackType.DirectoryEntrySelected, event.currentTarget.dataset.entryId, event.ctrlKey);
    });

  }
}


export namespace Directory {
  export enum CallbackType {
    DirectoryEntrySelected,
    WorldSelected,
  }
}