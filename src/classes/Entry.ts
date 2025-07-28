import { toRaw } from 'vue';

import { DOCUMENT_TYPES, EntryDoc, relationshipKeyReplace } from '@/documents';
import { RelatedJournal, RelatedItemDetails, ValidTopic, Topics, TagInfo, ToDoTypes } from '@/types';
import { FCBDialog } from '@/dialogs';
import { getTopicText } from '@/compendia';
import { TopicFolder, Setting } from '@/classes';
import { getParentId } from '@/utils/hierarchy';
import { searchService } from '@/utils/search';
import { useMainStore, usePlayingStore } from '@/applications/stores';
import { localize } from '@/utils/game';

export type CreateEntryOptions = { name?: string; type?: string; parentId?: string};

// represents a topic entry (ex. a character, location, etc.)
export class Entry {
  public topicFolder: TopicFolder | null;

  private _entryDoc: EntryDoc;
  private _actor: Actor | null;  // for pcs
  
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {EntryDoc} entryDoc - The entry Foundry document
   */
  constructor(entryDoc: EntryDoc, topicFolder?: TopicFolder) {
    // make sure it's the right kind of document
    if (entryDoc.type !== DOCUMENT_TYPES.Entry)
      throw new Error('Invalid document type in Entry constructor');

    // clone it to avoid unexpected changes
    this._entryDoc = foundry.utils.deepClone(entryDoc);
    this._cumulativeUpdate = {};
    this.topicFolder = topicFolder || null;
  }

  // does not set the parent topic
  static async fromUuid(entryId: string, topicFolder?: TopicFolder, options?: Record<string, any>): Promise<Entry | null> {
    const entryDoc = await fromUuid<EntryDoc>(entryId, options);

    if (!entryDoc || entryDoc.type !== DOCUMENT_TYPES.Entry)
      return null;
    else {
      const entry = new Entry(entryDoc, topicFolder);
      if (entry.topic === Topics.PC)
        await entry.getActor();

      return entry;
    }
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
      else if (!this._entryDoc.system.actorId)
        return null;
  
      this._actor = await fromUuid<Actor>(this._entryDoc.system.actorId);
  
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
  
  /**
   * Gets the TopicFolder associated with the entry. If the topic  is already loaded, the promise resolves
   * to the existing TopicFolder; otherwise, it loads the TopicFolder and then resolves to it.
   * @returns {Promise<TopicFolder>} A promise to the TopicFolder  associated with the entry.
   */
  public async loadTopic(): Promise<TopicFolder> {
    if (this.topicFolder)
      return this.topicFolder;
    
    if (!this._entryDoc.parent)
      throw new Error('call to Entry.loadTopic() without _sessionDoc');

    this.topicFolder = await TopicFolder.fromUuid(this._entryDoc.parent.uuid);

    if (!this.topicFolder)
      throw new Error('Invalid entry in Entry.getTopic()');

    return this.topicFolder;
  }
  
  // creates a new entry in the proper compendium in the given setting
  // if name is populated will skip the dialog
  static async create(topicFolder: TopicFolder, options: CreateEntryOptions): Promise<Entry | null> 
  {
    const topicText = getTopicText(topicFolder.topic);
    const promptText = topicFolder.topic === Topics.PC ? localize('dialogs.createPC.playerName') : `${topicText} Name:`;

    const setting = await topicFolder.getSetting();

    let nameToUse = options.name || '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(`Create ${topicText}`, promptText);
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    // create the entry
    let entryDoc: EntryDoc[] = [];
    await setting.executeUnlocked(async () => {
      entryDoc = await JournalEntryPage.createDocuments([{
        // @ts-ignore- we know this type is valid
        type: DOCUMENT_TYPES.Entry,
        name: topicFolder.topic === Topics.PC ? `<${localize('placeholders.linkToActor')}>` : nameToUse,
        system: {
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
      }],{
        parent: topicFolder.raw,
      }) as unknown as EntryDoc[];

      if (options.type) {
        await Entry.addTypeIfNeeded(topicFolder, options.type);
      }
    });

    if (entryDoc && entryDoc.length > 0) {
      const entry = new Entry(entryDoc[0], topicFolder);
      
      // Add to search index
      try {
        await searchService.addOrUpdateEntryIndex(entry, setting);
      } catch (error) {
        console.error('Failed to add entry to search index:', error);
      }
      
      return entry;
    } else {
      return null;
    }
  }

  get uuid(): string {
    return this._entryDoc.uuid;
  }

  /** note that you need to load the actor before calling this */
  get name(): string {
    if (this.topic !== Topics.PC || this._entryDoc.name)
      return this._entryDoc.name;
    else 
      return `<${localize('placeholders.linkToActor')}>`;
  }

  set name(value: string) {
    this._entryDoc.name = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      name: value,
    };
  }

  get tags(): TagInfo[] {
    return this._entryDoc.system.tags;
  }

  set tags(value: TagInfo[]) {
    this._entryDoc.system.tags = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        tags: value,
      }
    };
  }

  get playerName(): string {
    return this._entryDoc.system.playerName || '';
  }

  set playerName(value: string) {
    this._entryDoc.system.playerName = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        playerName: value,
      }
    };
  }

    get plotPoints(): string {
      return this._entryDoc.system.plotPoints || '';
    }
  
    set plotPoints(value: string) {
      this._entryDoc.system.plotPoints = value;
      this._cumulativeUpdate = {
        ...this._cumulativeUpdate,
        system: {
          ...this._cumulativeUpdate.system,
          plotPoints: value,
        }
      };
    }
  
    get background(): string {
      return this._entryDoc.system.background || '';
    }
  
    set background(value: string) {
      this._entryDoc.system.background = value;
      this._cumulativeUpdate = {
        ...this._cumulativeUpdate,
        system: {
          ...this._cumulativeUpdate.system,
          background: value,
        }
      };
    }
  
    get magicItems(): string {
      return this._entryDoc.system.magicItems || '';
    }
  
    set magicItems(value: string) {
      this._entryDoc.system.magicItems = value;
      this._cumulativeUpdate = {
        ...this._cumulativeUpdate,
        system: {
          ...this._cumulativeUpdate.system,
          magicItems: value,
        }
      };
    }
  
  

  get speciesId(): string | undefined {
    if (!this._entryDoc.system.speciesId)
      return undefined;

    return this._entryDoc.system.speciesId;
  }

  set speciesId(value: string | undefined) {
    if (this.topic !== Topics.Character)
      throw new Error('Attempt to set species on non-character');

    this._entryDoc.system.speciesId = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        speciesId: value,
      }
    };
  }

  get actorId(): string {
    if (this.topic !== Topics.PC)
      throw new Error('Attempt to get actorId on non-PC entry');
    
    return this._entryDoc.system.actorId || '';
  }

  set actorId(value: string) {
    if (this.topic !== Topics.PC)
      throw new Error('Attempt to set actorId on non-PC entry');
    
    this._entryDoc.system.actorId = value;
    this.name = value ? this.name : '';
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      name: this.name,
      system: {
        ...this._cumulativeUpdate.system,
        actorId: value,
      }
    };
  }

  // topic is read-only
  get topic(): ValidTopic {
    return this._entryDoc.system.topic;
  }

  get type(): string {
    if (this.topic===Topics.PC)
      return 'PC';
    else
      return this._entryDoc.system.type || '';
  }

  set type(value: string) {
    this._entryDoc.system.type = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        type: value,
      }
    };
  }

  get description(): string {
    return this._entryDoc.text?.content || '';
  }

  set description(value: string) {
    this._entryDoc.text.content = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      text: {
        content: value,
      }
    };
  }

  get rolePlayingNotes(): string {
    return this._entryDoc.system.rolePlayingNotes || '';
  }

  set rolePlayingNotes(value: string) {
    this._entryDoc.system.rolePlayingNotes = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        rolePlayingNotes: value,
      }
    };
  }

  get img(): string | undefined {
    return this._entryDoc.system.img || undefined;
  }

  set img(value: string | undefined) {
    if (!this._entryDoc.system)
      throw new Error('Call to Entry.img without _entryDoc');

    this._entryDoc.system.img = value || '';
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        img: value,
      }
    };
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): EntryDoc {
    return this._entryDoc;
  }

  // keyed by topic then by entryId
  get relationships(): Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>> {
    return this._entryDoc.system.relationships;
  }  

  set relationships(value: Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>) {
    this._entryDoc.system.relationships = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        relationships: value,
      }
    };
  }

  get scenes(): string[] {
    // create the array if it doesn't exist
    if (!this._entryDoc.system.scenes)
      this._entryDoc.system.scenes = [];

    return this._entryDoc.system.scenes;
  }  

  // we don't track cumulative update - save just always saves the arrays
  set scenes(value: string[]) {
    this._entryDoc.system.scenes = value;
  }

  get actors(): string[] {
    // create the array if it doesn't exist
    if (!this._entryDoc.system.actors)
      this._entryDoc.system.actors = [];

    return this._entryDoc.system.actors;
  }  

  // we don't track cumulative update - save just always saves the arrays
  set actors(value: string[]) {
    this._entryDoc.system.actors = value;
  }

  public get journals(): RelatedJournal[] {
    // create the array if it doesn't exist
    if (!this._entryDoc.system.journals)
      this._entryDoc.system.journals = [];

    return this._entryDoc.system.journals;
  }

  // we don't track cumulative update - save just always saves the arrays
  public set journals(value: RelatedJournal[]) {
    this._entryDoc.system.journals = value;
  }

  public async getParentId(): Promise<string | null> {
    const setting = await this.getSetting();
    return getParentId(setting, this);
  }

  /**
    * Gets the setting associated with a entry, loading into the topic
    * if needed.
    * 
    * @returns {Promise<Setting>} A promise to the setting associated with the entry.
    */
  public async getSetting(): Promise<Setting> {
    if (!this.topicFolder)
      await this.loadTopic();
  
    return await (this.topicFolder as TopicFolder).getSetting();
  }
  
  // used to set arbitrary properties on the entryDoc
  /**
   * Updates an entry in the database
   * 
   * @returns {Promise<Entry | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Entry | null> {
    const setting = await this.getSetting();

    // rather than try to monitor all changes to the arrays (which would require saving the originals or a proxy), we just always save them
    const updateData = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        scenes: this.scenes,
        actors: this.actors,
        journals: this.journals,
      }
    };

    let retval: EntryDoc | null = null;

    await setting.executeUnlocked(async () => {
      // add the type to the master list if it was changed and doesn't exist
      if (updateData.system?.type) {
        const topicFolder = setting.topicFolders[this.topic];

        await Entry.addTypeIfNeeded(topicFolder, updateData.system?.type);
      }

      let oldRelationships;
      
      if (updateData.system?.relationships) {
        // do the serialization of the relationships field
        oldRelationships = updateData.system.relationships;

        updateData.system.relationships = relationshipKeyReplace(updateData.system.relationships || {}, true);
      }

      retval = await toRaw(this._entryDoc).update(updateData) || null;
      if (retval) {
        this._entryDoc = retval;
      }

      // swap back
      if (updateData.system?.relationships) {
        this._entryDoc.system.relationships = oldRelationships;
      }

      this._cumulativeUpdate = {};
    });

    // Update the search index and to-do list
    try {
      if (retval) {
        await searchService.addOrUpdateEntryIndex(this, setting);

        // Update the to-do list if in play mode
        const campaign = usePlayingStore().currentPlayedCampaign;
        if (useMainStore().isInPlayMode && campaign) {
          await campaign.mergeToDoItem(ToDoTypes.Entry, `Edited during session ${campaign.currentSession?.number}`, this.uuid);
        }
      }
    } catch (error) {
      console.error('Failed to update todos or search index:', error);
    }

    return retval ? this : null;
  }

  public async delete() {
    const setting = await this.getSetting();

    const id = this.uuid;
    const topicFolder = this.topicFolder;
    
    if (!topicFolder)
      throw new Error('Attempting to delete entry without parent TopicFolder in Entry.delete()');

    await setting.executeUnlocked(async () => {
      await this._entryDoc.delete();

      await setting.deleteEntryFromSetting(topicFolder, id);
    });

    // Remove from search index
    try {
      searchService.removeEntry(id);
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
    let entries = await topicFolder.filterEntries(()=>true);

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
    const currentTypes = topicFolder.types;

    // if not a duplicate, add to the valid type lists 
    if (!currentTypes?.includes(type)) {
      const updatedTypes = currentTypes.concat(type);

      topicFolder.types = updatedTypes;
      await topicFolder.save();
    }
  }
 
}