import { toRaw } from 'vue';
import { getFlag, moduleId, setFlag, setFlagDefaults, } from '@/settings'; 
import { TopicDoc, WorldDoc, TopicFlagKey, topicFlagSettings, EntryDoc } from '@/documents';
import { Entry, WBWorld } from '@/classes';
import { ValidTopic } from '@/types';
import { getTopicTextPlural } from '@/compendia';

// represents a topic entry (ex. a character, location, etc.)
export class Topic {
  private _topicDoc: TopicDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  public world: WBWorld | null;  // the world the topic is in (if we don't setup up front, we can load it later)

  // saved on JournalEntry
  // private _name: string;   // topic names are hardcoded

  // saved in flags
  private _topNodes: string[];
  private _types: string[];
  private _topic: ValidTopic;

  /**
   * 
   * @param {TopicDoc} topicDoc - The topic Foundry document
   * @param {WBWorld} world - The world the campaign is in
   */
  constructor(topicDoc: TopicDoc, world?: WBWorld) {
    // make sure it's the right kind of document
    if (topicDoc.documentName !== 'JournalEntry' || !getFlag(topicDoc, TopicFlagKey.isTopic))
      throw new Error('Invalid document type in Campaign constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._topicDoc = foundry.utils.deepClone(topicDoc);
    this._cumulativeUpdate = {};
    this.world = world || null;

    this._topNodes = getFlag(this._topicDoc, TopicFlagKey.topNodes);
    this._types = getFlag(this._topicDoc, TopicFlagKey.types);
    this._topic = getFlag(this._topicDoc, TopicFlagKey.topic);
  }

  static async fromUuid(topicId: string, options?: Record<string, any>): Promise<Topic | null> {
    const topicDoc = await fromUuid(topicId, options) as TopicDoc;

    if (!topicDoc)
      return null;
    else {
      return new Topic(topicDoc);
    }
  }

  get uuid(): string {
    return this._topicDoc.uuid;
  }

  /**
   * Gets the world associated with a topic, loading into the campaign 
   * if needed.
   * 
   * @returns {Promise<WBWorld>} A promise to the world associated with the campaign.
   */
  public async getWorld(): Promise<WBWorld> {
    if (!this.world)
      await this.loadWorld();

    const world = this.world as WBWorld;

    return world;
  }
  
  /**
   * Gets the WBWorld associated with the topic. If the world is already loaded, the promise resolves
   * to the existing world; otherwise, it loads the world and then resolves to it.
   * @returns {Promise<WBWorld>} A promise to the world associated with the topic.
   */
  public async loadWorld(): Promise<WBWorld> {
    if (this.world)
      return this.world;
    
    const worldDoc = await fromUuid(this._topicDoc.folder) as WorldDoc;

    if (!worldDoc)
      throw new Error('Invalid folder id in Topics.loadWorld()');

    return new WBWorld(worldDoc);
  }
  
  /**
   * An array of top-level nodes.
   */
  public get topNodes(): readonly string[] {
    return this._topNodes;
  }
  
  /**
   * An array of top-level nodes.
   */
  public set topNodes(value: string[]) {
    this._topNodes = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.topNodes`]: value
    };
  }

  /**
   * The topic for this object
   */
  public get topic(): ValidTopic {
    return this._topic;
  }

  /**
   * The topic
   */
  public set topic(value: ValidTopic) {
    this._topic = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.topic`]: value
    };
  }

  /**
   * An object where each key is a topic, and the value is an array of valid types.
   */
  public get types(): string[] {
    return this._types;
  }

  /**
   * An object where each key is a topic, and the value is an array of valid types.
   */
  public set types(value: string[]) {
    this._types = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.types`]: value
    };
  }
  
  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): TopicDoc {
    return this._topicDoc;
  }

  /**
   * Creates a new topic.  Does not add to world.
   * 
   * @param {WBWorld} world - The world to create the topic in. 
   * @param {ValidTopic} topic - The topic for the Topic
   * @returns A promise that resolves when the topic has been created, with either the resulting entry or null on error
   */
  static async create(world: WBWorld, topic: ValidTopic): Promise<Topic | null> {
    // unlock the world to allow edits
    await world.unlock();

    // create a journal entry for the campaign
    const newTopicDoc = await JournalEntry.create({
      name: getTopicTextPlural(topic),
      folder: foundry.utils.parseUuid(world.uuid).id,
    },{
      pack: world.compendiumId,
    }) as unknown as TopicDoc;

    if (newTopicDoc) {
      await setFlagDefaults(newTopicDoc, topicFlagSettings);
    }

    await setFlag(newTopicDoc, TopicFlagKey.topic, topic);

    await world.lock();

    if (!newTopicDoc)
      throw new Error('Couldn\'t create new topic');

    const newTopic = new Topic(newTopicDoc, world);
    
    return newTopic;
  }
  
  /**
   * Given a filter function, returns all the matching Entries
   * inside this topic
   * 
   * @param {(e: Entry) => boolean} filterFn - The filter function
   * @returns {Entry[]} The entries that pass the filter
   */
  public filterEntries(filterFn: (e: Entry) => boolean): Entry[] { 
    return (this._topicDoc.pages.contents as unknown as EntryDoc[])
      .map((e: EntryDoc)=> new Entry(e, this))
      .filter((e: Entry)=> filterFn(e));
  }

  /**
   * Updates a topic in the database 
   * 
   * @returns {Promise<Topic | null>} The updated topic, or null if the update failed.
   */
  public async save(): Promise<Topic | null> {
    const updateData = this._cumulativeUpdate;

    let world = this.world;

    if (!world)
      world = await this.loadWorld();

    // unlock compendium to make the change
    await world.unlock();

    let success = false;
    if (Object.keys(updateData).length !== 0) {
      const retval = await toRaw(this._topicDoc).update(updateData) || null;
      if (retval) {
        this._topicDoc = retval;
        this._cumulativeUpdate = {};

        success = true;
      }
    }
    await world.lock();

    return success ? this : null;
  }

  /**
   * Deletes a topic from the database, along with all the related entries
   * 
   * @returns {Promise<void>}
   */
  public async delete() {
    if (!this._topicDoc)
      return;

    let world = this.world;
    if (!world)
      world = await this.loadWorld();

    // have to unlock the pack
    await world.unlock();

    await this._topicDoc.delete();

    await world.lock();
  }
}