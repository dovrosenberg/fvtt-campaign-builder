import { DOCUMENT_TYPES, } from '@/documents';
import { RelatedJournal, RelatedEntryDetails, ValidTopic, Topics, ToDoTypes, ValidTopicRecord, } from '@/types';
import { FCBDialog } from '@/dialogs';
import { getTopicText } from '@/compendia';
import { TopicFolder,  } from '@/classes';
import { getParentId } from '@/utils/hierarchy';
import { searchService } from '@/utils/search';
import { useMainStore, usePlayingStore, useSettingDirectoryStore } from '@/applications/stores';
import { localize } from '@/utils/game';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';
import CleanKeysService from '@/utils/cleanKeys';

export interface CreateEntryOptions { 
  name?: string; 
  type?: string; 
  parentId?: string
};

type EntryDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Entry>;

// represents a topic entry (ex. a character, location, etc.)
export class Entry extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Entry> {
  static override _documentType = DOCUMENT_TYPES.Entry;
  static override _defaultSystem = { 
    topic: Topics.None,  
    type: '',  
    tags: [],  
    relationships: {
      [Topics.Character]: {},
      [Topics.Location]: {},
      [Topics.Organization]: {},
      [Topics.PC]: {},
    },  
    scenes: [],  
    actors: [],  
    journals: [],  
    foundryDocuments: [],  
    speciesId: undefined,
    playerName: '',
    actorId: null,
    img: '',
    customFields: {},
    customFieldHeights: {},
  } as unknown as EntryDocClass['system'];

  private _actor: Actor | null;  // for pcs

  
  // does not set the parent topic
  static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  > (this: T, entryId: string): Promise<InstanceType<T> | null> {
    const entry = await super.fromUuid(entryId) as unknown as (Entry | null);

    if (!entry)
      return null;

    if (entry.topic === Topics.PC)
      await entry.getActor();

    return entry as InstanceType<T>;
  }

  /** return the topicFolder */
  public async getTopicFolder(): Promise<TopicFolder> {
    const setting = await this.getSetting();

    return setting.topicFolders[this._clone.system.topic];
  }
  
  /**
   * Gets the Actor associated with the PC. If the actor is already loaded, the promise resolves
   * to the existing actor; otherwise, it loads the actor and then resolves to it.
   * 
   * @note It's possible the actorId is populated but the actor has been deleted.  In this case, 
   * will return null and also set the actorId to null.
   * @returns {Promise<Actor | null>} A promise to the actor associated with the PC.
   */
  public async getActor(): Promise<Actor | null> {
    if (this.topic !== Topics.PC)
      throw new Error('Attempt to getActor on non-PC entry');

    if (this._actor)
      return this._actor;
    else if (!this._clone.system.actorId)
      return null;

    this._actor = await fromUuid<Actor>(this._clone.system.actorId);

    if (!this._actor) {
      this.actorId = '';  // clean up if the actor is gone
      await this.save();
    }

    return this._actor;
  }

  /** note: this should only be used if you know getActor() has already been called */
  public get actor(): Actor | null {
    return this._actor;
  }
  
  // creates a new entry in the proper compendium in the given setting
  // if name is populated will skip the dialog
  static async create(topicFolder: TopicFolder, options: CreateEntryOptions): Promise<Entry | null> 
  {
    const topicText = getTopicText(topicFolder.topic);
    const promptText = topicFolder.topic === Topics.PC ? localize('dialogs.createPC.playerName') : `${topicText} Name:`;
    let folderName = '';
    switch (topicFolder.topic) {
      case Topics.Character:
        folderName = localize('topics.characters');
        break;
      case Topics.Location:
        folderName = localize('topics.locations');
        break;
      case Topics.Organization:
        folderName = localize('topics.organizations');
        break;
      case Topics.PC:
        folderName = localize('topics.pcs');
        break;
    }
    const setting = topicFolder.setting;

    let nameToUse: string | null = options.name || '';
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(`Create ${topicText}`, promptText);
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    // create the entry
    const entry = await super._create(
      setting.compendiumId,
      nameToUse,
      folderName,
      { system: {
        playerName: topicFolder.topic === Topics.PC ? nameToUse : '',
        type: topicFolder.topic === Topics.PC ? 'PC' : options.type || '',
        topic: topicFolder.topic,
      }
    }) as unknown as Entry;

    if (!entry)
      return null;

    let entryItem = topicFolder.entryIndex.find((e)=> e.uuid === entry.uuid);
    if (!entryItem) {
      entryItem = {
        uuid: entry.uuid,
        name: entry.name,
        type: entry.type,
      };
      topicFolder.entryIndex.push(entryItem);
    } else {
      entryItem.name = entry.name;
    }

    // if there's no parent, add it to topnodes
    if (!options.parentId) {
      topicFolder.topNodes = [...topicFolder.topNodes, entry.uuid];
    }
    await topicFolder.save();
    await entry.save();

    if (options.type) {
      await Entry.addTypeIfNeeded(topicFolder, options.type);
    }
 
    // Add to search index
    try {
      await searchService.addOrUpdateEntryIndex(entry, setting);
    } catch (error) {
      console.error('Failed to add entry to search index:', error);
    }
      
    return entry;
  }

  /** note that you need to load the actor before calling this */
  get name(): string {
    if (this.topic !== Topics.PC || this._clone.name)
      return super.name;
    else 
      return `<${localize('placeholders.linkToActor')}>`;
  }

  /** required because get name() exists */
  set name(value: string) {
    super.name = value;
  }
  
  get tags(): string[] {
    // @ts-ignore
    return this._clone.system.tags;
  }

  set tags(value: string[]) {
    // @ts-ignore
    this._clone.system.tags = value;
  }

  get playerName(): string {
    return this._clone.system.playerName || '';
  }

  set playerName(value: string | null) {
    this._clone.system.playerName = value;
  }

  get speciesId(): string | undefined {
    if (!this._clone.system.speciesId)
      return undefined;

    return this._clone.system.speciesId;
  }
  
  set speciesId(value: string | undefined) {
    if (this.topic !== Topics.Character)
      throw new Error('Attempt to set species on non-character');

    this._clone.system.speciesId = value;
  }

  get actorId(): string {
    if (this.topic !== Topics.PC)
      throw new Error('Attempt to get actorId on non-PC entry');
    
    return this._clone.system.actorId || '';
  }

  set actorId(value: string | null) {
    if (this.topic !== Topics.PC && value)
      throw new Error('Attempt to set actorId on non-PC entry');
    
    this._clone.system.actorId = value;
  }

  // topic is read-only
  get topic(): ValidTopic {
    return this._clone.system.topic;
  }

  get type(): string {
    if (this.topic===Topics.PC)
      return 'PC';
    else
      return this._clone.system.type || '';
  }

  set type(value: string) {
    this._clone.system.type = value;
  }

  get description(): string {
    return this._clone.text?.content || '';
  }

  set description(value: string) {
    this._clone.text.content = value;
  }

  get img(): string | undefined {
    return this._clone.system.img || undefined;
  }

  set img(value: string | undefined) {
    this._clone.system.img = value || '';
  }

  // keyed by topic then by entryId
  get relationships(): ValidTopicRecord<Record<string, RelatedEntryDetails<any, any>>> {
    return this._clone.system.relationships as unknown as ValidTopicRecord<Record<string, RelatedEntryDetails<any, any>>>;
  }  

  set relationships(value: ValidTopicRecord<Record<string, RelatedEntryDetails<any, any>>>) {
    this._clone.system.relationships = value;
  }

  get scenes(): string[] {
    // create the array if it doesn't exist
    if (!this._clone.system.scenes)
      this._clone.system.scenes = [];

    return this._clone.system.scenes;
  }  

  // we don't track cumulative update - save just always saves the arrays
  set scenes(value: string[]) {
    this._clone.system.scenes = value;
  }

  get actors(): string[] {
    // create the array if it doesn't exist
    if (!this._clone.system.actors)
      this._clone.system.actors = [];

    return this._clone.system.actors;
  }  

  // we don't track cumulative update - save just always saves the arrays
  set actors(value: string[]) {
    this._clone.system.actors = value;
  }

  public get journals(): RelatedJournal[] {
    // create the array if it doesn't exist
    if (!this._clone.system.journals)
      this._clone.system.journals = [];

    return this._clone.system.journals as unknown as RelatedJournal[];
  }

  // we don't track cumulative update - save just always saves the arrays
  public set foundryDocuments(value: string[]) {
    this._clone.system.foundryDocuments = value;
  }

  public get foundryDocuments(): string[] {
    // create the array if it doesn't exist
    if (!this._clone.system.foundryDocuments)
      this._clone.system.foundryDocuments = [];

    return this._clone.system.foundryDocuments;
  }

  // we don't track cumulative update - save just always saves the arrays
  public set journals(value: RelatedJournal[]) {
    this._clone.system.journals = value;
  }

  public async getParentId(): Promise<string | null> {
    const setting = await this.getSetting();
    return getParentId(setting, this);
  }

  protected _prepData(data: EntryDocClass): void {
    data.system.relationships = CleanKeysService.cleanTopicKeysOnSave(data.system.relationships);
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates an entry in the database
   * 
   * @returns {Promise<void>} A promise that resolves after the update
   */
  public async save(): Promise<void> {
    const needToAddType = this._doc.system.type !== this._clone.system.type;

    // we attempt to save first - because if it fails, we don't 
    //    want to adjust anything else
    try {
      // this will reload relationships with a valid value
      await super.save();        
    } catch (error) {
      throw error;
    }

    const setting = await this.getSetting();

    // add the type to the master list if it was changed and doesn't exist
    if (needToAddType) {
      const topicFolder = setting.topicFolders[this.topic];

      await Entry.addTypeIfNeeded(topicFolder!, this._clone.system.type);
    }

    // update index
    const topicFolder = await this.getTopicFolder();

    let entryItem = topicFolder.entryIndex.find((e)=> e.uuid === this.uuid);
    if (!entryItem) {
      entryItem = {
        uuid: this.uuid,
        name: this._clone.name,
        type: this._clone.system.type,
      };
      topicFolder.entryIndex.push(entryItem);
    } else {
      entryItem.name = this._clone.name;
      entryItem.type = this._clone.system.type;
    }
    await topicFolder.save();
 
    // Update the search index and to-do list
    await searchService.addOrUpdateEntryIndex(this, setting);

    // Update the to-do list if in play mode
    const campaign = usePlayingStore().currentPlayedCampaign;
    const sessionNumber = campaign?.currentSessionNumber;
    if (useMainStore().isInPlayMode && campaign && sessionNumber!==null) {
      await campaign.mergeToDoItem(ToDoTypes.Entry, `Edited during session ${sessionNumber}`, this.uuid);
    }

    // if we might have added a type, refresh the tree
    if (needToAddType) {
      await useSettingDirectoryStore().refreshSettingDirectoryTree();
    }
  }

  /** 
   * @param skipDelete - if true, don't delete the Foundry document itself; used when Foundry deletes something outside the app
   */
  public async delete(skipDelete = false) {
    const setting = await this.getSetting();

    const uuid = this.uuid;
    const topicFolder = await this.getTopicFolder();
    
    await super._delete(skipDelete);

    // remove from master entry index and topnodes    
    topicFolder.entryIndex = topicFolder.entryIndex.filter((e)=> e.uuid !== uuid);
    topicFolder.topNodes = topicFolder.topNodes.filter((node) => node !== uuid);
    await topicFolder.save();

    await setting.deleteEntryFromSetting(topicFolder, uuid);

    // Remove from search index
    searchService.removeSearchEntry(uuid);
  }

  // /**
  //  * Retrieves a list of all uuids that are linked to the current entry for a specified topic.
  //  * 
  //  * @param topic - The topic for which to retrieve related items.
  //  * @returns An array of related uuids. Returns an empty array if there is no current entry.
  //  */
  // public getAllRelatedEntries(topicFolder: TopicFolder): string[] {
  //   // get relationships
  //   const relationships = this.relationships || {};

  //   if (!relationships[topicFolder.topic])
  //     return [];

  //   // if the flag has this topic, it's a Record keyed by uuid
  //   return Object.keys(relationships[topicFolder.topic] || {});
  // }

  /** Adds the type to the list on the topic, if it's not there already.
   *  Requires the setting to be unlocked already
   */
  private static async addTypeIfNeeded(topicFolder: TopicFolder, type: string): Promise<void> {
    const currentTypes = topicFolder.types;

    // if not a duplicate, add to the valid type lists 
    if (!currentTypes?.includes(type)) {
      const updatedTypes = currentTypes.concat(type);

      topicFolder.types = updatedTypes;
      await topicFolder.save();
    }
  }
 
}