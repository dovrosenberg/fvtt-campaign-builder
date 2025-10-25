import { toRaw, } from 'vue';
import { entryIndexFields, } from '@/documents';
import { Entry, FCBSetting } from '@/classes';
import { EntryFilterIndex, ValidTopic } from '@/types';

// represents a topic entry (ex. a character, location, etc.)
export class TopicFolder {
  public setting: FCBSetting;  // the setting the topic is in (if we don't setup up front, we can load it later)
  public topic: ValidTopic;

  /**
   * 
   * @param {TopicDoc} topicDoc - The topic Foundry document
   * @param {FCBSetting} setting - The setting the campaign is in
   */
  constructor(topic: ValidTopic, setting: FCBSetting) {
    this.setting = setting;
    this.topic = topic;
  }


  /**
   * An array of top-level nodes.
   */
  public get topNodes(): readonly string[] {
    return this.setting.topics[this.topic].topNodes;
  }
  
  /**
   * An array of top-level nodes.
   */
  public set topNodes(value: string[] | readonly string[]) {
    this.setting.topics[this.topic].topNodes = value.slice();
  }

  /**
   * An object where each key is a topic, and the value is an array of valid types.
   */
  public get types(): string[] {
    return this.setting.topics[this.topic].types;
  }

  /**
   * An object where each key is a topic, and the value is an array of valid types.
   */
  public set types(value: string[]) {
    this.setting.topics[this.topic].types = value;
  }

  /** map of entry uuid to name for all entries in the folder */
  public get entries(): Record<string, string> {
    return this.setting.topics[this.topic].entries;
  }

  public set entries(value: Record<string, string>) {
    this.setting.topics[this.topic].entries = value;
  }
  
  /**
   * Given a filter function, returns all the matching entries
   * inside this topic
   * 
   * @param {(e: EntryFilterIndex) => boolean} filterFn - The filter function
   * @returns {Entry[]} The entries that pass the filter
   */
  public async filterEntries<T extends boolean>(filterFn: (s: EntryFilterIndex) => boolean, fullEntry: T): Promise<T extends true ? Entry[] : EntryFilterIndex[]> { 
    // get all the journal entries
    const indexes = await toRaw(this.setting.compendium).getIndex(entryIndexFields);
  
    // find the sessions connected to this entries in this folder
    const entries = indexes
      .filter((e)=> (
        // filter out just the ones that are in this folders' entries list
        !!e.pages && e.pages.length===1 &&
        !!this.entries[e.uuid]
      ))
      .map((e) => ({ 
        name: e.name, 
        id: e._id,
        uuid: e.uuid,
        actorId: e.pages![0].system.actorId,
        type: e.pages![0].system.type,
        topic: this.topic,
      } as EntryFilterIndex))

      // now filter by the function passed in 
      .filter((s: EntryFilterIndex)=> filterFn(s)) || [];

    // either fullEntry is false, so we return EntryFilterIndex or its an empty array
    if (!fullEntry || entries.length===0)
      return entries as T extends true ? Entry[] : EntryFilterIndex[];
    
    const idList = entries.map((e)=> e.id);
    const documentSet = await this.setting.compendium.getDocuments({ _id__in: idList });

    let retval = [] as Entry[];
    for (const doc of documentSet) {
      const entry = new Entry(doc);
      if (entry)
        retval.push(entry);
    }

    // to get here, fullEntry must be true
    return retval as T extends true ? Entry[] : EntryFilterIndex[];
  }
  
  /**
   * Returns all the entries inside this topic
   * 
   * @returns {Entry[] | EntryFilterIndex[]} The entries
   */
  public async allEntries<T extends boolean>(fullEntry: T): Promise<T extends true ? Entry[] : EntryFilterIndex[]> { 
    return await this.filterEntries(() => true, fullEntry);
  }

   /**
   * Returns the specified entry from inside this topic, if it exists
   * 
   * @param {uuid: string} - The id to find
   * @returns {Entry | null} The matching entry
   */
   public async findEntry(uuid: string): Promise<Entry | null> { 
    const entries = await this.filterEntries((e)=> e.uuid === uuid, true);

    return entries.length>0 ? entries[0] : null
  }

  /**
   * Updates a topic in the database 
   * 
   * @returns {Promise<TopicFolder | null>} The updated topic, or null if the update failed.
   */
  public async save(): Promise<TopicFolder | null> {
    // it's on the setting
    await this.setting?.save();
    return this;
  }
}