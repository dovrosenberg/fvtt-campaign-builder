import { toRaw } from 'vue';
import { moduleId, } from '@/settings'; 
import { TopicDoc, TopicFlagKey, topicFlagSettings, EntryDoc } from '@/documents';
import { DocumentWithFlags, Entry, Setting } from '@/classes';
import { ValidTopic } from '@/types';
import { getTopicTextPlural } from '@/compendia';

// represents a topic entry (ex. a character, location, etc.)
export class TopicFolder extends DocumentWithFlags<TopicDoc> {
  static override _documentName = 'JournalEntry';
  static override _flagSettings = topicFlagSettings;

  public setting: Setting | null;  // the setting the topic is in (if we don't setup up front, we can load it later)

  // saved in flags
  private _topNodes: string[];
  private _types: string[];
  private _topic: ValidTopic;

  /**
   * 
   * @param {TopicDoc} topicDoc - The topic Foundry document
   * @param {Setting} setting - The setting the campaign is in
   */
  constructor(topicDoc: TopicDoc, setting?: Setting) {
    super(topicDoc, TopicFlagKey.isTopic);

    this.setting = setting || null;

    this._topNodes = this.getFlag(TopicFlagKey.topNodes);
    this._types = this.getFlag(TopicFlagKey.types);
    this._topic = this.getFlag(TopicFlagKey.topic);
  }

  override async _getSetting(): Promise<Setting> {
    return await this.getSetting();
  };
  
  static async fromUuid(topicId: string, options?: Record<string, any>): Promise<TopicFolder | null> {
    const topicDoc = await fromUuid<TopicDoc>(topicId, options);

    if (!topicDoc)
      return null;
    else {
      return new TopicFolder(topicDoc);
    }
  }

  get uuid(): string {
    return this._doc.uuid;
  }

  /**
   * Gets the setting associated with a topic, loading into the campaign 
   * if needed.
   * 
   * @returns {Promise<Setting>} A promise to the setting associated with the campaign.
   */
  public async getSetting(): Promise<Setting> {
    if (!this.setting)
      await this.loadSetting();

    return (this.setting as Setting);
  }
  
  /**
   * Gets the Setting associated with the topic. If the setting is already loaded, the promise resolves
   * to the existing setting; otherwise, it loads the setting and then resolves to it.
   * @returns {Promise<Setting>} A promise to the setting associated with the topic.
   */
  public async loadSetting(): Promise<Setting> {
    if (this.setting)
      return this.setting;
    
    this.setting = await Setting.fromUuid(this.settingId);

    if (!this.setting)
      throw new Error('Error loading setting in TopicFolder.loadSetting()');

    return this.setting;
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
  public set topNodes(value: string[] | readonly string[]) {
    this._topNodes = value.slice();   // we clone it so it can't be edited outside
    this.updateCumulative(TopicFlagKey.topNodes, this._topNodes);
  }

  /**
   * The settingId for this topic folder
   */
  public get settingId(): string {
    // if it belongs to us, it's in a pack
    if (!this._doc.pack)
      throw new Error('Missing pack in TopicFolder.settingId()');
    
    return this._doc.pack;
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
    this.updateCumulative(TopicFlagKey.topic, value);
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
    this.updateCumulative(TopicFlagKey.types, value);
  }
  
  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): TopicDoc {
    return this._doc;
  }

  /**
   * Creates a new topic.  Does not add to setting.
   * 
   * @param {Setting} setting - The setting to create the topic in. 
   * @param {ValidTopic} topic - The topic for the TopicFolder
   * @returns A promise that resolves when the topic has been created, with either the resulting entry or null on error
   */
  static async create(setting: Setting, topic: ValidTopic): Promise<TopicFolder | null> {
    let newTopicDoc: TopicDoc | null = null;

    await setting.executeUnlocked(async () => {
      // create a journal entry for the campaign
      newTopicDoc = await JournalEntry.create({
        name: getTopicTextPlural(topic),
        folder: foundry.utils.parseUuid(setting.uuid).id,
      },{
        pack: setting.compendium.metadata.id,
      }) as unknown as TopicDoc;
    });

    if (!newTopicDoc)
      throw new Error('Couldn\'t create new topic');

    const newTopic = new TopicFolder(newTopicDoc, setting);
    await newTopic.setup();

    newTopic.topic = topic;
    await newTopic.save();

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
    return (toRaw(this._doc).pages.contents as unknown as EntryDoc[])
      .map((e: EntryDoc)=> new Entry(e, this))
      .filter((e: Entry)=> filterFn(e));
  }

  /**
   * Returns all the entries inside this topic
   * 
   * @returns {Entry[]} The entries
   */
  public allEntries(): Entry[] { 
    return this.filterEntries(() => true);
  }

   /**
   * Returns the specified entry from inside this topic, if it exists
   * 
   * @param {uuid: string} - The id to find
   * @returns {Entry | null} The matching entry
   */
   public findEntry(uuid: string): Entry | null { 
    const match: EntryDoc | undefined = (toRaw(this._doc).pages.contents as unknown as EntryDoc[]).find((e: EntryDoc)=> e.uuid === uuid);

    return match ? new Entry(match, this) : null;
  }

  /**
   * Updates a topic in the database 
   * 
   * @returns {Promise<TopicFolder | null>} The updated topic, or null if the update failed.
   */
  public async save(): Promise<TopicFolder | null> {
    const updateData = this._cumulativeUpdate;

    let setting = this.setting;

    if (!setting)
      setting = await this.loadSetting();

    let success = false;
    await setting.executeUnlocked(async () => {
      if (Object.keys(updateData).length !== 0) {
        // protect any complex flags
        if (updateData.flags && updateData.flags[moduleId])
          updateData.flags[moduleId] = this.prepareFlagsForUpdate(updateData.flags[moduleId]);

        const retval = await toRaw(this._doc).update(updateData) || null;
        if (retval) {
          this._doc = retval;
          this._cumulativeUpdate = {};

          success = true;
        }
      }
    });
    
    return success ? this : null;
  }

  /**
   * Deletes a topic from the database, along with all the related entries
   * 
   * @returns {Promise<void>}
   */
  public async delete() {
    if (!this._doc)
      return;

    let setting = this.setting;
    if (!setting)
      setting = await this.loadSetting();

    await setting.executeUnlocked(async () => {
      await this._doc.delete();
    });
  }   
}