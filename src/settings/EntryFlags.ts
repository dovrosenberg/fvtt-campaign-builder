// handles flags set on an entry

import moduleJson from '@module';
import { Topic } from '@/types';
import { getGame } from '@/utils/game';
import { RelatedItem } from '@/utils/relationships';

export enum EntryFlagKey {
  topic = 'topic',   // is it a character, location, etc.
  type = 'type',  // note that this is the type field not the topic type
  relationships = 'relationships',  // an object keyed by topic with values that are arrays of RelatedItems
}

type EntryFlagType<K extends EntryFlagKey> =
    K extends EntryFlagKey.topic ? Topic :
    K extends EntryFlagKey.type ? string :
    K extends EntryFlagKey.relationships ? Record<Topic, Record<string, RelatedItem>> :  // internal record is keyed by uuid
    never;  


type FlagSettings<K extends EntryFlagKey, T extends EntryFlagType<any>> = {
  flagId: K;
  clean?: (value: T)=>void;  // clean converts the object to a "complex object" so that flatten/expand don't act on it
  default: EntryFlagType<K> | ((topic: Topic, type: string)=>EntryFlagType<K>);
};
        
const flagSetup = [
  {
    flagId: EntryFlagKey.topic,
    default: (topic: Topic) => topic,
  },
  {
    flagId: EntryFlagKey.relationships,
    clean: (value: Record<Topic, Record<string, RelatedItem>>) => { value.constructor = () => {return;}; },
    default: {
      [Topic.None]: {},
      [Topic.Character]: {},
      [Topic.Event]: {},
      [Topic.Location]: {},
      [Topic.Organization]: {},
    },
  },
  {
    flagId: EntryFlagKey.type,
    default: (_topic: Topic, type: string) => type,
  },
] as FlagSettings<any, any>[];


export abstract class EntryFlags {
  public static async setDefaults(entry: JournalEntry, topic: Topic, type: string): Promise<void> {
    if (!entry)
      return;

    for (let i=0; i<flagSetup.length; i++) {
      if (!entry.getFlag(moduleJson.id, flagSetup[i].flagId)) {
        const value = (typeof flagSetup[i].default==='function' ? (flagSetup[i].default as (topic:Topic, type: string)=> unknown)(topic, type) : foundry.utils.deepClone(flagSetup[i].default));

        if (flagSetup[i].clean) {
          flagSetup[i].clean(value);
        }

        await entry.setFlag(moduleJson.id, flagSetup[i].flagId, value);
      }
    }

    return;
  }

  public static get<T extends EntryFlagKey>(entry: JournalEntry, flag: T): EntryFlagType<T>  {
    let val = (entry.getFlag(moduleJson.id, flag) as EntryFlagType<T>);
    if (val === undefined)
      val = flagSetup.find((f)=>f.flagId===flag)?.default as EntryFlagType<T>;

    return val;
  }

  // note - setting a flag to null will delete it
  public static async set<T extends EntryFlagKey>(entry: JournalEntry, flag: T, value: EntryFlagType<T>): Promise<void> {
    // unlock it to make the change
    const pack = getGame().packs?.get(entry.pack || '');
    if (!pack)
      throw new Error('Bad compendia in EntryFlags.set()');
  
    await pack.configure({locked:false});
    await entry.setFlag(moduleJson.id, flag, value);
    await pack.configure({locked:true});
  }

  // special case because of nesting
  /**
   * Add/update a relationship on an entry 
   */
  public static async setRelationship(entryId: string, topic: Topic, relatedItem: RelatedItem): Promise<void> {
    const entry = await fromUuid(entryId) as JournalEntry | null;
    
    if (!entry)
      throw new Error('Invalid entryId in EntryFlags.setRelationship()');

    // pull the full structure
    let relationships = EntryFlags.get(entry, EntryFlagKey.relationships);
    if (!relationships) {
      // missing - set to default
      relationships = flagSetup.find((f)=>f.flagId===EntryFlagKey.relationships)?.default as Record<Topic, Record<string, RelatedItem>>;
    }

    // set the new one
    relationships[topic][relatedItem.uuid] = relatedItem;
    
    await EntryFlags.set(entry, EntryFlagKey.relationships, relationships);
  }

  /**
   * Remove a relationship from an entry
   */
  public static async unsetRelationship(entryId: string, topic: Topic, relatedItemId: string): Promise<void> {
    const entry = await fromUuid(entryId) as JournalEntry | null;
    
    if (!entry)
      throw new Error('Invalid entryId in EntryFlags.unsetRelationship()');

    // pull the full structure
    let relationships = EntryFlags.get(entry, EntryFlagKey.relationships);
    if (!relationships) {
      // missing - set to default
      relationships = flagSetup.find((f)=>f.flagId===EntryFlagKey.relationships)?.default as Record<Topic, Record<string, RelatedItem>>;
    }
    delete relationships[topic][relatedItemId];

    await EntryFlags.set(entry, EntryFlagKey.relationships, relationships);
  }
}
