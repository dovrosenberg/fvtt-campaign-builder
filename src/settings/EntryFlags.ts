// handles flags set on an entry

import moduleJson from '@module';
import { Topic } from '@/types';

export enum EntryFlagKey {
  topic = 'topic',   // is it a character, location, etc.
  type = 'type',  // note that this is the type field not the topic type
}

type EntryFlagType<K extends EntryFlagKey> =
    K extends EntryFlagKey.topic ? Topic :
    K extends EntryFlagKey.type ? string :
    never;  

export abstract class EntryFlags {
  public static get<T extends EntryFlagKey>(entry: JournalEntry, flag: T): EntryFlagType<T> | null {
    return (entry.getFlag(moduleJson.id, flag) as EntryFlagType<T>);
  }

  // note - setting a flag to null will delete it
  public static async set<T extends EntryFlagKey>(entry: JournalEntry, flag: T, value: EntryFlagType<T> | null): Promise<void> {
    await entry.setFlag(moduleJson.id, flag, value);
  }
}
