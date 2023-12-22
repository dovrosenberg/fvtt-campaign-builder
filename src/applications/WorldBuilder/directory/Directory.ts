import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './Directory.scss';
import { getGame } from '@/utils/game';
import { createEntry, createWorldFolder } from '@/compendia';
import { Topic } from '@/types';
import { getIcon } from '@/utils/misc';

type DirectoryData = {
  worlds: {
    world: { name: string, id: string },
    compendia: { 
      name: string, 
      id: string,
      topic: Topic,
      icon: string,
      entries: { name: string, uuid: string } ,
    }[],
  }[],
}

export class Directory extends HandlebarsPartial<Directory.CallbackType>  {
  static override _template = 'modules/world-builder/templates/Directory.hbs';

  private _rootFolder: Folder;  
  private _expandedCompendia = {} as Record<string, boolean>;  // basically a list of compendium uuid that are expanded (collapsed by default); if false or not in here, it's expanded
  
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
          topic: compendium.config.topic,
          icon: getIcon(compendium.config.topic),
          collapsed: !this._expandedCompendia[compendium.metadata.id],
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

      // re-collapse everything
      this._expandedCompendia = {};
      
      if (event.currentTarget.dataset.worldId)
        this._makeCallback(Directory.CallbackType.WorldSelected, event.currentTarget.dataset.worldId);
    });

    // open/close a topic
    html.on('click', '.fwb-topic-folder', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      // toggle the collapse      
      const id = event.currentTarget.dataset.compendiumId;
      this._expandedCompendia[id] = !this._expandedCompendia[id];

      // we use css to handle the display update
      // note: we don't do this for worlds because when you change worlds the whole app needs to be refreshed anyways
      jQuery(event.currentTarget).toggleClass('collapsed');
    });

    // close all topics
    html.on('click', '.header-control.collapse-all', (event: JQuery.ClickEvent) => {
      event.stopPropagation();

      this._expandedCompendia = {};
      jQuery('.fwb-topic-folder').addClass('collapsed');
    });

    // create a world
    html.on('click', '.header-control.create-world', async (event: JQuery.ClickEvent) => {
      event.stopPropagation();

      const world = await createWorldFolder(true);
      if (world) {
        // rerender
        this._makeCallback(Directory.CallbackType.WorldSelected, world.uuid);
      }
    });

    // select an entry
    html.on('click', '.fwb-entry-item', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      this._makeCallback(Directory.CallbackType.DirectoryEntrySelected, event.currentTarget.dataset.entryId, event.ctrlKey);
    });

    // create entry buttons
    html.on('click', '.fwb-create-entry', async (event: JQuery.ClickEvent) => {
      event.stopPropagation();

      // look for nearest parent and get topic and folder
      const parentHeader = event.currentTarget.closest('.fwb-topic-folder');
      const worldHeader = event.currentTarget.closest('.fwb-world-folder');
      const topic = parentHeader.dataset.compendiumTopic;
      const worldId = worldHeader.dataset.worldId;
      const worldFolder = getGame().folders?.find((f)=>f.uuid===worldId) as Folder;

      if (!worldFolder || !topic)
        throw new Error('Invalid header in .fwb-crate-entry.click()');

      const entry = await createEntry(worldFolder, topic);

      if (entry)
        this._makeCallback(Directory.CallbackType.EntryCreated, entry.uuid);
    });
    
  }
}

export namespace Directory {
  export enum CallbackType {
    DirectoryEntrySelected,
    WorldSelected,
    EntryCreated,
  }
}