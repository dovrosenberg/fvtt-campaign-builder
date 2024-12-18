// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

import { getGame } from '@/utils/game';
import { Topic, ValidTopic } from '@/types';
import { Hierarchy } from '@/utils/hierarchy';
import { moduleId } from '.';

export enum WorldFlagKey {
  worldCompendium = 'worldCompendium',   // the uuid for the world compendium 
  topicEntries = 'topicEntries',   // the JournalEntry uuid for each topic
  campaignEntries = 'campaignEntries',   // name; keyed by journal entry uuid
  types = 'types',  // object where each key is a Topic and the value is an array of valid types
  expandedIds = 'expandedIds',   // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  expandedCampaignIds = 'expandedCampaignIds',   // ids of nodes that are expanded in the campaign tree
  hierarchies = 'hierarchies',   // the full tree hierarchy or null for topics without hierarchy
  topNodes = 'topNodes',  // array of top-level nodes 
}

export type WorldFlagType<K extends WorldFlagKey> =
    K extends WorldFlagKey.worldCompendium ? string :
    K extends WorldFlagKey.topicEntries ? Record<ValidTopic, string> : // keyed by topic 
    K extends WorldFlagKey.campaignEntries ? Record<string, string> : // name; keyed by journal entry uuid
    K extends WorldFlagKey.types ? Record<ValidTopic, string[]> :
    K extends WorldFlagKey.expandedIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
    K extends WorldFlagKey.expandedCampaignIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
    K extends WorldFlagKey.topNodes ? Record<ValidTopic, string[]> :    // keyed by topic
    K extends WorldFlagKey.hierarchies ? (Record<string, Hierarchy>) :   // keyed by entry id (don't need to key by topic since entry id is unique)
    never;  

type RequiresTopic = WorldFlagKey.topNodes;
type RequiresNoTopic = Exclude<WorldFlagKey, RequiresTopic>;

type FlagSettings<K extends WorldFlagKey> = {
  flagId: K;
  default: WorldFlagType<K>;

  clean?: (value: WorldFlagType<K>)=>void;  // clean converts the object to a "complex object" so that flatten/expand don't act on it

  // needsFlatten determines if flattenObject is called, which is needed when the key is a record with keys that might have '.'
  //    THIS IS ONLY SAFE SO LONG AS THE VALUES ARE NOT ALSO OBJECTS!!!
  // TODO: assess whether we can use clean instead 
  needsFlatten: boolean;
};

const flagSetup = [
  {
    flagId: WorldFlagKey.worldCompendium,
    default: '' as string,
    needsFlatten: false,      
  },
  {
    flagId: WorldFlagKey.topicEntries,
    default: {} as Record<Topic, string>,
    needsFlatten: false,      
  },
  {
    flagId: WorldFlagKey.campaignEntries,
    default: {} as Record<string, string>,
    needsFlatten: true,      
  },
  {
    flagId: WorldFlagKey.types,
    default: {
      [Topic.Character]: [],
      [Topic.Location]: [],
      [Topic.Event]: [],
      [Topic.Organization]: [],
    },
    needsFlatten: false,      
  },
  {
    flagId: WorldFlagKey.expandedIds,
    default: {} as Record<string, boolean | null>,
    needsFlatten: true,
  },
  {
    flagId: WorldFlagKey.expandedCampaignIds,
    default: {} as Record<string, boolean | null>,
    needsFlatten: true,
  },
  {
    flagId: WorldFlagKey.hierarchies,
    default: {},
    clean: (value:Record<string, Hierarchy>) => { value.constructor = () => {return;}; },
    needsFlatten: false,      
  },
  {
    flagId: WorldFlagKey.topNodes,
    default: {
      [Topic.Character]: [],
      [Topic.Location]: [],
      [Topic.Event]: [],
      [Topic.Organization]: [],
    },
    needsFlatten: false,      
  },
] as FlagSettings<any>[];

export abstract class WorldFlags {
  public static async setDefaults(worldId: string): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldId) as Folder;
    if (!f)
      return;

    for (let i=0; i<flagSetup.length; i++) {
      if (!f.getFlag(moduleId, flagSetup[i].flagId)) {
        const value =  foundry.utils.deepClone(flagSetup[i].default);

        if (flagSetup[i].clean && value) {
          flagSetup[i].clean(value);
        }

        await f.setFlag(moduleId, flagSetup[i].flagId, value);
      }
    }

    return;
  }

  public static get<T extends WorldFlagKey>(worldId: string, flag: T): WorldFlagType<T> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldId);
    
    const config = flagSetup.find((s)=>s.flagId===flag);

    if (!f)
      return config?.default as WorldFlagType<T>;

    const setting = (f.getFlag(moduleId, flag) || foundry.utils.deepClone(config?.default)) as WorldFlagType<T>;

    if (config?.needsFlatten)
      return foundry.utils.flattenObject(setting as unknown as object) as WorldFlagType<T>;
    else
      return setting;
  }

  public static async set<T extends WorldFlagKey>(worldId: string, flag: T, value: WorldFlagType<T> | null): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldId);
    if (!f)
      return;

    const config = flagSetup.find((s)=>s.flagId===flag);
    if (!config)
      throw new Error('Bad flag in WorldFlags.set()');

    if (config.clean && value) {
      config.clean(value);
    }

    await f.setFlag(moduleId, flag, value);
  }

  // remove a key from an object flag
  public static async unset<T extends RequiresNoTopic>(worldId: string, flag: T, key?: string): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldId);
    if (!f)
      return;

    await f.unsetFlag(moduleId, `${flag}${key ? '.' + key : ''}`);
  }

  // special case because of nesting and index
  /**
   * Set the hierarchy 
   *
   * @static
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   */
  public static async setHierarchy(worldId: string, entryId: string, hierarchy: Hierarchy): Promise<void> {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
    hierarchies[entryId] = hierarchy;

    await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
  }

  /**
   * Get the hierarchy.  Could just use get() but here for consistency with setHierarchy()
   *
   * @static
   * @param {string} entryId
   * @return {*}  {Promise<void>}
   */
  public static getHierarchy(worldId: string, entryId: string): Hierarchy | null {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);

    return hierarchies[entryId] || null;
  }

  /**
   * Remove an entry from hierarchy
   *
   * @static
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   */
  public static async unsetHierarchy(worldId: string, entryId: string): Promise<void> {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
    delete hierarchies[entryId];

    await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
  }

  // special cases because of indexes
  public static getTopicFlag<T extends RequiresTopic>(worldId: string, flag: T, topic: Topic): WorldFlagType<T>[keyof WorldFlagType<T>] {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldId);
    
    const config = flagSetup.find((s)=>s.flagId===flag);

    if (!f)
      return config?.default[topic];

    const setting = (f.getFlag(moduleId, flag) || foundry.utils.deepClone(config?.default)) as WorldFlagType<T>;

    if (config?.needsFlatten)
      return (foundry.utils.flattenObject(setting) as WorldFlagType<T>)[topic] as WorldFlagType<T>[keyof WorldFlagType<T>];
    else
      return setting[topic] as WorldFlagType<T>[keyof WorldFlagType<T>];
  }

  public static async setTopicFlag<T extends RequiresTopic>(worldId: string, flag: T, topic: Topic, value: WorldFlagType<T>[keyof WorldFlagType<T>]): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldId);
    if (!f)
      return;

    const config = flagSetup.find((s)=>s.flagId===flag);
    if (!config)
      throw new Error('Bad flag in WorldFlags.set()');

    // get the current value
    const currentValue = WorldFlags.get(worldId, flag) as WorldFlagType<T>;
    currentValue[topic] = value;

    if (config.clean) {
      config.clean(currentValue[topic]);
    }

    await WorldFlags.set(worldId, flag, currentValue as unknown as WorldFlagType<T>);
  }
}
