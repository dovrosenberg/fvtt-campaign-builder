import './WBContent.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { HomePage, HomePageData} from './HomePage';
import { getGame, localize } from '@/utils/game';
import { Topic } from '@/types';
import { getIcon, toTopic } from '@/utils/misc';
import { TypeAhead, TypeAheadData } from '@/components/TypeAhead';
import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { getCleanEntry, updateDocument } from '@/compendia';
import { Editor, EditorData } from '@/components/Editor';
import { TreeData, Tree } from '@/components/Tree';
import { getHierarchyTree, hasHierarchy } from '@/utils/hierarchy';

export type WBContentData = {
  showHomePage: true,
  homePageTemplate: () => string,
  homePageData: HomePageData
} |
{
  showHomePage: false,
  entry: JournalEntry,
  topic: Topic,
  icon: string,
  showHierarchy: boolean,
  relationships: { tab: string, label: string }[],
  typeAheadTemplate: () => string,
  typeAheadData: TypeAheadData,
  treeTemplate: () => string,
  hierarchyTreeData: TreeData,
  editorTemplate: () => string,
  descriptionData: EditorData,
  namePlaceholder: string,
  description: {
    content: any,
    format: number,
    markdown: any
  }
}

export class WBContent extends HandlebarsPartial<WBContent.CallbackType, WBContent.CallbackFunctionType<any>>  {
  static override _template = 'modules/world-builder/templates/WBContent.hbs';

  private _worldId: string; 
  private _entryId: string | null;    // the entryId to show (will show homepage if null)
  private _entry: JournalEntry;
  private _topic: Topic | null;
  private _tabs: Tabs;

  constructor() {
    super();

    this._tabs = new Tabs({ navSelector: '.tabs', contentSelector: '.fwb-tab-body', initial: 'description', /*callback: null*/ });
  }

  // we will dynamically setup the partials
  protected _createPartials(): void {
    this._partials.HomePage = new HomePage();
    this._partials.TypeTypeAhead = new TypeAhead([]);
    this._partials.DescriptionEditor = new Editor();
    this._partials.HierarchyTree = new Tree([]);
  }

  public changeWorld(worldId: string): void {
    this._worldId = worldId;
    (this._partials.HomePage as HomePage).changeWorld(worldId);
  }

  public async updateEntry(entryId: string | null) {
    // we need to setup the type before calling the constructor
    if (!entryId) {
      // just show the homepage
      this._entryId = null;
      this._topic = null;
    } else {
      const entry = await getCleanEntry(entryId);

      const topic = toTopic(entry ? EntryFlags.get(entry, EntryFlagKey.topic) : null);

      if (!entry || !topic) {
        // show the homepage
        this._entryId = null;
        this._topic = null;
      } else {
        // we're going to show a content page
        this._entryId = entryId;
        this._entry = entry;
        this._topic = topic;

        // reattach the editor
        // @ts-ignore
        const descriptionPage = entry.pages.find((p)=>p.name==='description');
        (this._partials.DescriptionEditor as Editor).attachEditor(descriptionPage, descriptionPage.text.content);  // TODO: replace with enum -- do I even need the fieldname?

        // get() returns the object and we don't want to modify it directly
        (this._partials.TypeTypeAhead as TypeAhead).updateList(moduleSettings.get(SettingKey.types)[topic]);

        // update the tree for things with hierarchies
        if (hasHierarchy(this._topic)) {
          const pack = getGame().packs.get(this._entry.pack || '');
          if (pack)
            (this._partials.HierarchyTree as Tree).updateTree(await getHierarchyTree(pack, this._entry));
        }
      }
    }
  }

  public async getData(): Promise<WBContentData> {
    let data: WBContentData;

    const topicData = {
      [Topic.Character]: { namePlaceholder: 'fwb.placeholders.characterName', },
      [Topic.Event]: { namePlaceholder: 'fwb.placeholders.characterName', },
      [Topic.Location]: { namePlaceholder: 'fwb.placeholders.characterName', },
      [Topic.Organization]: { namePlaceholder: 'fwb.placeholders.characterName', },
    };

    const relationships = [
      { tab: 'characters', label: 'fwb.labels.tabs.characters', },
      { tab: 'locations', label: 'fwb.labels.tabs.locations',},
      { tab: 'organizations', label: 'fwb.labels.tabs.organizations', },
      { tab: 'events', label: 'fwb.labels.tabs.events', },
    ] as { tab: string, label: string, }[];

    if (!this._entryId) {
      // homepage
      data = {
        showHomePage: true,
        homePageTemplate: () => HomePage.template,
        homePageData: await (this._partials.HomePage as HomePage).getData(),
      };
    } else if (this._topic === null) {
      throw new Error('Invalid entry type in WBContent.getData()');
    } else {
      // normal content
      data = {
        showHomePage: false,
        entry: this._entry,
        topic: this._topic,
        icon: getIcon(this._topic),
        showHierarchy: hasHierarchy(this._topic),
        relationships: relationships,
        typeAheadTemplate: () => TypeAhead.template,
        typeAheadData: await (this._partials.TypeTypeAhead as TypeAhead).getData(),
        namePlaceholder: localize(topicData[this._topic].namePlaceholder),
        editorTemplate: () => Editor.template,
        descriptionData: await (this._partials.DescriptionEditor as Editor)?.getData(),
        treeTemplate: () => Tree.template,
        hierarchyTreeData: await (this._partials.HierarchyTree as Tree)?.getData(),
        description: this._entry.pages.find((p)=>p.name==='description').text, //TODO: use enum
      };
    }

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
    // handle partials
    if (!this._entryId)
      this._partials.HomePage.activateListeners(html);
    else {
      this._partials.TypeTypeAhead.activateListeners(html);
      this._partials.DescriptionEditor?.activateListeners(html);
      this._partials.HierarchyTree?.activateListeners(html);
    }

    // bind the tabs
    this._tabs.bind(html.get()[0]);

    // watch for edits to name
    html.on('change', '#fwb-input-name', async (event: JQuery.ChangeEvent)=> {
      await updateDocument(this._entry, { name: jQuery(event.target).val() });
      await this._makeCallback(WBContent.CallbackType.NameChanged, this._entry);
    });

    // home page mode - click on a recent item
    this._partials.HomePage.registerCallback(HomePage.CallbackType.RecentClicked, async (uuid: string)=> {
      await this._makeCallback(WBContent.CallbackType.RecentClicked, uuid);
    });

    // new type added in the typeahead
    this._partials.TypeTypeAhead.registerCallback(TypeAhead.CallbackType.ItemAdded, async (added)=> {
      if (this._topic === null)
        return;

      const currentTypes = moduleSettings.get(SettingKey.types);

      // if not a duplicate, add to the valid type lists 
      if (!currentTypes[this._topic].includes(added)) {
        const updatedTypes = {
          ...moduleSettings.get(SettingKey.types),
          [this._topic]: currentTypes[this._topic].concat([added]),
        };
        await moduleSettings.set(SettingKey.types, updatedTypes);
      }
    });
    this._partials.TypeTypeAhead.registerCallback(TypeAhead.CallbackType.SelectionMade, (selection)=> { 
      void EntryFlags.set(this._entry, EntryFlagKey.type, selection);
    });

    // watch for edits to description
    this._partials.DescriptionEditor.registerCallback(Editor.CallbackType.EditorSaved, async (newContent: string) => {
      const descriptionPage = this._entry.pages.find((p)=>p.name==='description');  //TODO

      await updateDocument(descriptionPage, {'text.content': newContent });  

      //need to reset

      (this._partials.DescriptionEditoras as Editor).attachEditor(descriptionPage, newContent);

      await this._makeCallback(WBContent.CallbackType.ForceRerender); 
    });
    this._partials.DescriptionEditor.registerCallback(Editor.CallbackType.EditorClosed, async () => { 
      await this._makeCallback(WBContent.CallbackType.ForceRerender); 
    });

    // tree node clicked
    this._partials.HierarchyTree.registerCallback(Tree.CallbackType.ItemClicked, async (value: string)=>{
      alert(value);
    });
  }
}

export namespace WBContent {
  export enum CallbackType {
    RecentClicked,
    NameChanged,
    ForceRerender,
  }

  export type CallbackFunctionType<C extends CallbackType> = 
    C extends CallbackType.RecentClicked ? (uuid: string) => Promise<void> :
    C extends CallbackType.NameChanged ? (entry: JournalEntry) => Promise<void> :
    C extends CallbackType.ForceRerender ? () => Promise<void> :
    never;  
}