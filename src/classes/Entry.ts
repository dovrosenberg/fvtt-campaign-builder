import { toRaw } from 'vue';

import { DOCUMENT_TYPES, EntryDoc, relationshipKeyReplace,  } from '@/documents';
import { RelatedItemDetails, ValidTopic, Topics, TagInfo } from '@/types';
import { FCBDialog } from '@/dialogs';
import { getTopicText } from '@/compendia';
import { TopicFolder, WBWorld } from '@/classes';
import { getParentId } from '@/utils/hierarchy';
import { searchService } from '@/utils/search';

export type CreateEntryOptions = { name?: string; type?: string; parentId?: string};

// represents a topic entry (ex. a character, location, etc.)
export class Entry {
  public topicFolder: TopicFolder | null;

  private _entryDoc: EntryDoc;
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
    const entryDoc = await fromUuid(entryId, options) as EntryDoc | null;

    if (!entryDoc || entryDoc.type !== DOCUMENT_TYPES.Entry)
      return null;
    else {
      return new Entry(entryDoc, topicFolder);
    }
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
  
  // creates a new entry in the proper compendium in the given world
  // if name is populated will skip the dialog
  static async create(topicFolder: TopicFolder, options: CreateEntryOptions): Promise<Entry | null> 
  {
    const topicText = getTopicText(topicFolder.topic);
    const world = await topicFolder.getWorld();

    let nameToUse = options.name || '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(`Create ${topicText}`, `${topicText} Name:`);
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    // create the entry
    let entryDoc: EntryDoc[] = [];
    await world.executeUnlocked(async () => {
      entryDoc = await JournalEntryPage.createDocuments([{
        // @ts-ignore- we know this type is valid
        type: DOCUMENT_TYPES.Entry,
        name: nameToUse,
        system: {
          type: options.type || '',
          topic: topicFolder.topic,
          relationships: {
            [Topics.Character]: {},
            // [Topics.Event]: {},
            [Topics.Location]: {},
            [Topics.Organization]: {},
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
        await searchService.addOrUpdateIndex(entry, world, true);
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

  get name(): string {
    return this._entryDoc.name;
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

  // topic is read-only
  get topic(): ValidTopic {
    return this._entryDoc.system.topic;
  }

  get type(): string {
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

  get img(): string | undefined {
    return this._entryDoc.system.img || undefined;
  }

  set img(value: string | undefined) {
    if (!this._entryDoc.system)
      throw new Error('Call to Entry.img without _entryDoc');

    this._entryDoc.system.img = value;
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

  set scenes(value: string[]) {
    this._entryDoc.system.scenes = value;
  }

  get actors(): string[] {
    // create the array if it doesn't exist
    if (!this._entryDoc.system.actors)
      this._entryDoc.system.actors = [];

    return this._entryDoc.system.actors;
  }  

  set actors(value: string[]) {
    this._entryDoc.system.actors = value;
  }

  public async getParentId(): Promise<string | null> {
    const world = await this.getWorld();
    return getParentId(world, this);
  }

  /**
    * Gets the world associated with a entry, loading into the topic
    * if needed.
    * 
    * @returns {Promise<WBWorld>} A promise to the world associated with the campaign.
    */
  public async getWorld(): Promise<WBWorld> {
    if (!this.topicFolder)
      await this.loadTopic();
  
    return await (this.topicFolder as TopicFolder).getWorld();
  }
  
  // used to set arbitrary properties on the entryDoc
  /**
   * Updates an entry in the database
   * 
   * @returns {Promise<Entry | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Entry | null> {
    const world = await this.getWorld();

    // rather than try to monitor all changes to the arrays (which would require saving the originals or a proxy), we just always save them
    const updateData = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        scenes: this.scenes,
        actors: this.actors,
      }
    };

    let retval: EntryDoc | null = null;

    await world.executeUnlocked(async () => {
      // add the type to the master list if it was changed and doesn't exist
      if (updateData.system?.type) {
        const topicFolder = world.topicFolders[this.topic];

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

    // Update the search index
    try {
      if (retval) {
        await searchService.addOrUpdateIndex(this, world, true);
      }
    } catch (error) {
      console.error('Failed to update search index:', error);
    }

    return retval ? this : null;
  }

  public async delete() {
    const world = await this.getWorld();

    const id = this.uuid;
    const topicFolder = this.topicFolder;
    
    if (!topicFolder)
      throw new Error('Attempting to delete entry without parent TopicFolder in Entry.delete()');

    await world.executeUnlocked(async () => {
      await this._entryDoc.delete();

      await world.deleteEntryFromWorld(topicFolder, id);
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
   *  Requires the world to be unlocked already
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