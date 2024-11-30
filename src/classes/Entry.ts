import { toRaw } from 'vue';

import { DOCUMENT_TYPES, EntryDoc, relationshipKeyReplace } from '@/documents';
import { RelatedItemDetails, ValidTopic, Topic } from '@/types';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { cleanTrees } from '@/utils/hierarchy';

// represents a topic entry (ex. a character, location, etc.)
export class Entry {
  static worldCompendium: CompendiumCollection<any>;
  static currentTopicJournals: Record<ValidTopic, JournalEntry>;

  private _entryDoc: EntryDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {EntryDoc} entryDoc - The entry Foundry document
   */
  constructor(entryDoc: EntryDoc) {
    // clone it to avoid unexpected changes, also drop the proxy
    this._entryDoc = foundry.utils.deepClone(entryDoc);
    this._cumulativeUpdate = {};
  }

  static async fromUuid(entryId: string, options?: Record<string, any>): Promise<Entry | null> {
    const entryDoc = await fromUuid(entryId, options) as EntryDoc;

    if (!entryDoc)
      return null;
    else
      return new Entry(entryDoc);
  }

  static async create(name: string, topic: ValidTopic, type: string): Promise<Entry> 
  {
    if (!Entry.worldCompendium || !Entry.currentTopicJournals)
      throw new Error('No world compendium or topic journals in Entry.create()');

    await Entry.worldCompendium.configure({locked:false});

    const entryDoc = await JournalEntryPage.createDocuments([{
      type: DOCUMENT_TYPES.Entry,
      name: name,
      system: {
        type: type,
        topic: topic,
        relationships: {
          [Topic.Character]: {},
          [Topic.Event]: {},
          [Topic.Location]: {},
          [Topic.Organization]: {},
        }
      }
    }],{
      parent: Entry.currentTopicJournals[topic],
    }) as unknown as EntryDoc;

    await Entry.worldCompendium.configure({locked:true});

    return new Entry(entryDoc[0]);
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

  get topic(): ValidTopic | undefined {
    return this._entryDoc.system.topic;
  }

  set topic(value: ValidTopic) {
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
    }
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): EntryDoc {
    return this._entryDoc;
  }

  // keyed by topic then by entryId
  get relationships(): Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>> | undefined {
    return this._entryDoc.system.relationships;
  }  

  set relationships(value: Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>> | undefined) {
    this._entryDoc.system.relationships = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        relationships: value,
      }
    }
  }

  // used to set arbitrary properties on the entryDoc
  public setProperty(key: string, value: any) {
    this._entryDoc[key] = value;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [key]: value,
    };
  }

  /**
   * Updates an entry in the database
   * 
   * @returns {Promise<Entry | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Entry | null> {
    let updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    await Entry.worldCompendium.configure({locked:false});

    let oldRelationships;
    
    if (this._cumulativeUpdate.system.relationships) {
      // do the serialization of the relationships field
      oldRelationships = updateData.system.relationships;

      updateData.system.relationships = relationshipKeyReplace(updateData.system.relationships || {}, true);
    }

    const retval = await toRaw(this._entryDoc).update(updateData) || null;
    if (retval)
      this._entryDoc = retval;

    // swap back
    if (updateData?.system?.relationships) {
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
    
    return  Entry.currentTopicJournals[topic].collections.pages.contents
      .map((e: EntryDoc)=> new Entry(e))
      .filter((e: Entry)=> filterFn(e));
  }

  public static async deleteEntry(topic: ValidTopic, entryId: string) {
    const entryDoc = await fromUuid(entryId) as EntryDoc;

    if (!entryDoc || !Entry.worldCompendium)
      return;

    // have to unlock the pack
    await Entry.worldCompendium.configure({locked:false});

    const hierarchy = WorldFlags.getHierarchy(Entry.worldCompendium.id, entryId);

    if (hierarchy) {
      // delete from any trees
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(Entry.worldCompendium.id, topic, entryId, hierarchy);
      }
    }

    // remove from the top nodes
    const topNodes = WorldFlags.getTopicFlag(Entry.worldCompendium.id, WorldFlagKey.topNodes, topic);
    await WorldFlags.setTopicFlag(Entry.worldCompendium.id, WorldFlagKey.topNodes, topic, topNodes.filter((id) => id !== entryId));

    // remove from the expanded list
    await WorldFlags.unset(Entry.worldCompendium.id, WorkflagKey.expandedIds, entryId);

    await entryDoc.delete();

    await Entry.worldCompendium.configure({locked:true});

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
    };
  
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
  };
  
}