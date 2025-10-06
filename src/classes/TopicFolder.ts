import { toRaw } from 'vue';
import { EntryDoc } from '@/documents';
import { Entry, FCBSetting } from '@/classes';
import { ValidTopic } from '@/types';

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
    this.setting.topics[this.topic].types = value);
  }
  
  TODO
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
    // it's on the setting
    await this.setting?.save();
    return this;
  }
}