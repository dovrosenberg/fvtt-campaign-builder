import { toRaw, version } from 'vue';
import { EntryDoc, entryIndexFields } from '@/documents';
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
  
    // find the sessions connected to this campaign
    const entries = indexes
      // first find the relevant ones
      .filter((e)=> !!this.entries[`${e.uuid}.JournalEntryPage.${e.pages![0]._id}`])
      .map((e) => ({ 
        name: e.name, 
        uuid: `${e.uuid}.JournalEntryPage.${e.pages![0]._id}`,
        type: e.pages![0].system.type,
        topic: this.topic,
      } as EntryFilterIndex))

      // now filter by the function passed in 
      .filter((s: EntryFilterIndex)=> filterFn(s)) || [];

    if (!fullEntry)
      return entries;
    
    let retval = [] as Entry[];
    for (let i=0; i<entries.length; i++) {
      const entry = await Entry.fromUuid(entries[i].uuid);
      if (entry)
        retval.push(entry);
    }

    return retval;
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
    // it's on the setting
    await this.setting?.save();
    return this;
  }
}