import { toRaw } from 'vue';

import { DOCUMENT_TYPES, } from '@/documents';
import { RelatedJournal, RelatedItemDetails, ValidTopic, Topics, TagInfo, ToDoTypes, } from '@/types';
import { FCBDialog } from '@/dialogs';
import { getTopicText } from '@/compendia';
import { TopicFolder,  } from '@/classes';
import { getParentId } from '@/utils/hierarchy';
import { searchService } from '@/utils/search';
import { useMainStore, usePlayingStore } from '@/applications/stores';
import { localize } from '@/utils/game';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';
import { cleanTopicKeysOnSave } from '@/utils/cleanKeys';

export type CreateEntryOptions = { name?: string; type?: string; parentId?: string};

type EntryDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Entry>;

// represents a topic entry (ex. a character, location, etc.)
export class Entry extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Entry> {
  static override _folderName = 'Entries';
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
    speciesId: undefined,
    playerName: '',
    actorId: null,
    background: '',
    plotPoints: '',
    magicItems: '',
    img: '',
    rolePlayingNotes: ''
  } as unknown as EntryDocClass['system'];

  public topicFolder: TopicFolder | null;

  private _actor: Actor | null;  // for pcs

  /**
   * 
   * @param {EntryDoc} entryDoc - The entry Foundry document
   */
  constructor(entryDoc: EntryDocClass, topicFolder?: TopicFolder) {
    super(entryDoc);

    this.topicFolder = topicFolder || null;
  }

  // does not set the parent topic
  static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  > (this: T, entryId: string, topicFolder?: TopicFolder): Promise<InstanceType<T> | null> {
    const entry = await super.fromUuid(entryId) as unknown as (Entry | null);

    if (!entry)
      return null;

    if (topicFolder)
      entry.topicFolder = topicFolder;

    if (entry.topic === Topics.PC)
      await entry.getActor();

    return entry as InstanceType<T>;
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

    const setting = topicFolder.setting;

    let nameToUse: string | null = options.name || null;
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
      { system: {
        playerName: topicFolder.topic === Topics.PC ? nameToUse : '',
        actorId: null,
        plotPoints: '',
        background: '',
        magicItems: '',
        type: topicFolder.topic === Topics.PC ? 'PC' : options.type || '',
        topic: topicFolder.topic,
        relationships: {
          [Topics.Character]: {},
          [Topics.Location]: {},
          [Topics.Organization]: {},
          [Topics.PC]: {},
        },
        actors: [],
        scenes: [],
        img: '',
      }
    }) as unknown as Entry;

    if (!entry)
      return null;

    entry.topicFolder = topicFolder;
    topicFolder.entries[entry.uuid] = entry.name;
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

  get uuid(): string {
    return this._clone.uuid;
  }

  /** note that you need to load the actor before calling this */
  get name(): string {
    if (this.topic !== Topics.PC || this._clone.name)
      return this._clone.name;
    else 
      return `<${localize('placeholders.linkToActor')}>`;
  }

  set name(value: string) {
    this._clone.name = value;
  }

  get tags(): TagInfo[] {
    // @ts-ignore
    return this._clone.system.tags;
  }

  set tags(value: TagInfo[]) {
    // @ts-ignore
    this._clone.system.tags = value;
  }

  get playerName(): string {
    return this._clone.system.playerName || '';
  }

  set playerName(value: string | null) {
    this._clone.system.playerName = value;
  }

  get plotPoints(): string {
    return this._clone.system.plotPoints || '';
  }

  set plotPoints(value: string | null) {
    this._clone.system.plotPoints = value;
  }

  get background(): string {
    return this._clone.system.background || '';
  }

  set background(value: string | null) {
    this._clone.system.background = value;
  }

  get magicItems(): string {
    return this._clone.system.magicItems || '';
  }
  
  set magicItems(value: string | null) {
    this._clone.system.magicItems = value;
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

  get rolePlayingNotes(): string {
    return this._clone.system.rolePlayingNotes || '';
  }

  set rolePlayingNotes(value: string) {
    this._clone.system.rolePlayingNotes = value;
  }

  get img(): string | undefined {
    return this._clone.system.img || undefined;
  }

  set img(value: string | undefined) {
    this._clone.system.img = value || '';
  }

  // keyed by topic then by entryId
  get relationships(): Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>> {
    return this._clone.system.relationships as unknown as Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>;
  }  

  set relationships(value: Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>) {
    this._clone.system.relationships = value;
  }

  get scenes(): string[] {
    // create the array if it doesn't exist
    if (!this._clone.system.scenes)
      this._clone.system.scenes = [];

    return this._clone.system.scenes as unknown as string[];
  }  

  // we don't track cumulative update - save just always saves the arrays
  set scenes(value: string[]) {
    this._clone.system.scenes = value;
  }

  get actors(): string[] {
    // create the array if it doesn't exist
    if (!this._clone.system.actors)
      this._clone.system.actors = [];

    return this._clone.system.actors as unknown as string[];
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
  public set journals(value: RelatedJournal[]) {
    this._clone.system.journals = value;
  }

  public async getParentId(): Promise<string | null> {
    const setting = await this.getSetting();
    return getParentId(setting, this);
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates an entry in the database
   * 
   * @returns {Promise<void>} A promise that resolves after the update
   */
  public async save(): Promise<void> {
    const setting = await this.getSetting();

    // add the type to the master list if it was changed and doesn't exist
    if (this._clone.system.type !== this._doc.system.type) {
      const topicFolder = setting.topicFolders[this.topic];

      await Entry.addTypeIfNeeded(topicFolder, this._clone.system.type);
    }

    // update name index if it changed
    if (this._clone.name !== this._doc.name && this.topicFolder) {
      this.topicFolder.entries[this.uuid] = this._clone.name;
      await this.topicFolder?.save();
    }

    this._clone.system.relationships = cleanTopicKeysOnSave(this._clone.system.relationships)

    // this will reload relationships with a valid value
    await super.save();        

    // Update the search index and to-do list
    await searchService.addOrUpdateEntryIndex(this, setting);

    // Update the to-do list if in play mode
    const campaign = usePlayingStore().currentPlayedCampaign;
    if (useMainStore().isInPlayMode && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Entry, `Edited during session ${campaign.currentSession?.number}`, this.uuid);
    }
  }

  public async delete() {
    const setting = await this.getSetting();

    const uuid = this.uuid;
    const topicFolder = this.topicFolder;
    
    if (!topicFolder)
      throw new Error('Attempting to delete entry without parent TopicFolder in Entry.delete()');

    await toRaw(this._doc).delete();

    // remove from master entry list and topnodes
    delete topicFolder.entries[uuid];
    topicFolder.topNodes = topicFolder.topNodes.filter((node) => node !== uuid);
    await topicFolder.save();

    await setting.deleteEntryFromSetting(topicFolder, uuid);

    // Remove from search index
    try {
      searchService.removeEntry(uuid);
    } catch (error) {
      console.error('Failed to remove entry from search index:', error);
    }
  }

      
  /**
   * Find all journal entries of a given topic
   * @todo   At some point, may need to make reactive (i.e. filter by what's been entered so far) or use algolia if lists are too long; 
   *            might also consider making every topic a different subtype and then using DocumentIndex.lookup  -- that might give performance
   *            improvements in lots of places
   * @param topic the topic to search
   * @param notRelatedTo if present, only return entries that are not already linked to this entry
   * @returns a list of Entries
   */
  public static async getEntriesForTopic(topicFolder: TopicFolder, notRelatedTo?: Entry | undefined): Promise<Entry[]> {
    // we find all journal entries with this topic
    let entries = await topicFolder.allEntries(true);

    // filter unique ones if needed
    if (notRelatedTo) {
      const relatedEntries = notRelatedTo.getAllRelatedEntries(topicFolder);

      // also remove the current one
      entries = entries.filter((entry) => !relatedEntries.includes(entry.uuid) && entry.uuid !== notRelatedTo.uuid);
    }

    return entries;
  }
  
  /**
   * Retrieves a list of all uuids that are linked to the current entry for a specified topic.
   * 
   * @param topic - The topic for which to retrieve related items.
   * @returns An array of related uuids. Returns an empty array if there is no current entry.
   */
  public getAllRelatedEntries(topicFolder: TopicFolder): string[] {
    // get relationships
    const relationships = this.relationships || {};

    if (!relationships[topicFolder.topic])
      return [];

    // if the flag has this topic, it's a Record keyed by uuid
    return Object.keys(relationships[topicFolder.topic]);
  }

  /** Adds the type to the list on the topic, if it's not there already.
   *  Requires the setting to be unlocked already
   */
  private static async addTypeIfNeeded(topicFolder: TopicFolder, type: string): Promise<void> {
    if (!topicFolder)
        debugger;

    const currentTypes = topicFolder.types;

    // if not a duplicate, add to the valid type lists 
    if (!currentTypes?.includes(type)) {
      const updatedTypes = currentTypes.concat(type);

      topicFolder.types = updatedTypes;
      await topicFolder.save();
    }
  }
 
}