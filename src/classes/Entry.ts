import { toRaw } from 'vue';

import { DOCUMENT_TYPES, EntryDoc, relationshipKeyReplace, WorldDoc, } from '@/documents';
import { RelatedItemDetails, ValidTopic, Topics } from '@/types';
import { inputDialog } from '@/dialogs/input';
import { getTopicText } from '@/compendia';
import { WBWorld } from '@/classes';

export type CreateEntryOptions = { name?: string; type?: string; parentId?: string};

// represents a topic entry (ex. a character, location, etc.)
export class Entry {
  static worldCompendium: CompendiumCollection<any>;
  static worldId: string;
  static currentTopicJournals: Record<ValidTopic, JournalEntry>;

  public world: WBWorld | null;

  private _entryDoc: EntryDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {EntryDoc} entryDoc - The entry Foundry document
   */
  constructor(entryDoc: EntryDoc, world?: WBWorld) {
    // make sure it's the right kind of document
    if (entryDoc.type !== DOCUMENT_TYPES.Entry)
      throw new Error('Invalid document type in Entry constructor');

    // clone it to avoid unexpected changes
    this._entryDoc = foundry.utils.deepClone(entryDoc);
    this._cumulativeUpdate = {};
    this.world = world || null;
  }

  static async fromUuid(entryId: string, options?: Record<string, any>): Promise<Entry | null> {
    const entryDoc = await fromUuid(entryId, options) as EntryDoc;

    if (!entryDoc)
      return null;
    else
      return new Entry(entryDoc);
  }

  /**
   * Gets the WBWorld associated with the entry. If the world is already loaded, the promise resolves
   * to the existing world; otherwise, it loads the world and then resolves to it.
   * @returns {Promise<WBWorld>} A promise to the world associated with the entry.
   */
  public async loadWorld(): Promise<WBWorld> {
    if (this.world)
      return this.world;
    
    const worldDoc = await fromUuid(this._entryDoc.parent.folder) as WorldDoc;

    if (!worldDoc)
      throw new Error('Invalid folder id in Entry.getWorld()');

    return new WBWorld(worldDoc);
  }
  
  // creates a new entry in the proper compendium in the given world
  // if name is populated will skip the dialog
  static async create(topic: ValidTopic, options: CreateEntryOptions): Promise<Entry | null> 
  {
    const topicText = getTopicText(topic);

    let nameToUse = options.name || '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await inputDialog(`Create ${topicText}`, `${topicText} Name:`);
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    // create the entry
    await Entry.worldCompendium.configure({locked:false});

    const entryDoc = await JournalEntryPage.createDocuments([{
      // @ts-ignore- we know this type is valid
      type: DOCUMENT_TYPES.Entry,
      name: nameToUse,
      system: {
        type: options.type || '',
        topic: topic,
        relationships: {
          [Topics.Character]: {},
          [Topics.Event]: {},
          [Topics.Location]: {},
          [Topics.Organization]: {},
        },
        actors: [],
        scenes: [],
      }
    }],{
      parent: Entry.currentTopicJournals[topic],
    }) as unknown as EntryDoc;

    await Entry.worldCompendium.configure({locked:true});

    return entryDoc[0] ? new Entry(entryDoc[0]) : null;
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

  get topic(): ValidTopic {
    return this._entryDoc.system.topic;
  }

  set topic(value: ValidTopic) {
    throw new Error('Entry.topic is read-only - otherwise need to update all the world metadata???');
    this._entryDoc.system.topic = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        topic: value,
      }
    };
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

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates an entry in the database
   * 
   * @returns {Promise<Entry | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Entry | null> {
    if (!Entry.worldCompendium)
      return null;

    // rather than try to monitor all changes to the arrays (which would require saving the originals or a proxy), we just always save them
    const updateData = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        scenes: this.scenes,
        actors: this.actors,
      }
    };

    // unlock compendium to make the change
    await Entry.worldCompendium.configure({locked:false});

    let oldRelationships;
    
    if (updateData.system?.relationships) {
      // do the serialization of the relationships field
      oldRelationships = updateData.system.relationships;

      updateData.system.relationships = relationshipKeyReplace(updateData.system.relationships || {}, true);
    }

    const retval = await toRaw(this._entryDoc).update(updateData) || null;
    if (retval) {
      this._entryDoc = retval;
    }

    // swap back
    if (updateData.system?.relationships) {
      this._entryDoc.system.relationships = oldRelationships;
    }

    this._cumulativeUpdate = {};

    await Entry.worldCompendium.configure({locked:true});

    return retval ? this : null;
  }

  /**
   * Given a topic and a filter function, returns all the matching Entries
   * 
   * @param {ValidTopic} topic - The topic to filter
   * @param {(e: Entry) => boolean} filterFn - The filter function
   * @returns {Entry[]} The entries that pass the filter
   */
  public static filter(topic: ValidTopic, filterFn: (e: Entry) => boolean): Entry[] { 
    if (!Entry.currentTopicJournals || !Entry.currentTopicJournals[topic])
      return [];
    
    return  (Entry.currentTopicJournals[topic].pages.contents as EntryDoc[])
      .map((e: EntryDoc)=> new Entry(e))
      .filter((e: Entry)=> filterFn(e));
  }

  public async deleteEntry() {
    if (!this.world)
      await this.loadWorld();

    const world = this.world as WBWorld;
    const id = this.uuid;
    const topic = this.topic;

    // have to unlock the pack
    await world.unlock();

    await this._entryDoc.delete();

    await world.deleteEntryFromWorld(topic, id);

    await world.lock();

    // TODO - remove from any relationships
    // TODO - remove from search
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
  public static async getEntriesForTopic(topic: ValidTopic, notRelatedTo?: Entry | undefined): Promise<Entry[]> {
    if (!Entry.currentTopicJournals || !Entry.currentTopicJournals[topic])
      return [];

    // we find all journal entries with this topic
    let entries = await Entry.filter(topic, ()=>true);

    // filter unique ones if needed
    if (notRelatedTo) {
      const relatedEntries = notRelatedTo.getAllRelatedEntries(topic);

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
  public getAllRelatedEntries(topic: ValidTopic): string[] {
    // get relationships
    const relationships = this.relationships || {};

    if (!relationships[topic])
      return [];

    // if the flag has this topic, it's a Record keyed by uuid
    return Object.keys(relationships[topic]);
  }
  
}