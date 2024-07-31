// packs don't actually have flags, so we manage them on the world in .packFlags.packID

// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

import { getGame } from '@/utils/game';
import moduleJson from '@module';
import { Topic } from '@/types';
import { Hierarchy } from '@/utils/hierarchy';

export enum PackFlagKey {
  hierarchies = 'hierarchies',   // the full tree hierarchy or null for topics without hierarchy
  topic = 'topic',   
  topNodes = 'topNodes',  // array of top-level nodes 
}

type PackFlagType<K extends PackFlagKey> =
    K extends PackFlagKey.hierarchies ? (Record<string, Hierarchy>) :   // keyed by entry id 
    K extends PackFlagKey.topic ? Topic :   
    K extends PackFlagKey.topNodes ? string[] :   
    never;  

type FlagSettings<K extends PackFlagKey, T extends PackFlagType<any>> = {
  flagId: K;
  clean?: (value: T)=>void;  // clean converts the object to a "complex object" so that flatten/expand don't act on it
  default: PackFlagType<K> | ((topic: Topic)=>PackFlagType<K>);
};

const flagSetup = [
  {
    flagId: PackFlagKey.hierarchies,
    default: {},
    clean: (value:Record<string, Hierarchy>) => { value.constructor = () => {return;}; }
  },
  {
    flagId: PackFlagKey.topic,
    default: (topic: Topic) => topic,
  },
  {
    flagId: PackFlagKey.topNodes,
    default: [],
  },
] as FlagSettings<any, any>[];

export abstract class PackFlags {
  public static async setDefaults(pack: CompendiumCollection<any>, topic: Topic): Promise<void> {
    if (!pack)
      return;

    const packId = pack.metadata.id;
    const wf = pack.folder as Folder;
    
    for (let i=0; i<flagSetup.length; i++) {
      if (!wf.getFlag(moduleJson.id, `packFlags.${packId}.${flagSetup[i].flagId}`)) {
        const value = (typeof flagSetup[i].default==='function' ? (flagSetup[i].default as (topic:Topic)=> unknown)(topic) : foundry.utils.deepClone(flagSetup[i].default));

        if (flagSetup[i].clean) {
          flagSetup[i].clean(value);
        }

        await wf.setFlag(moduleJson.id, `packFlags.${packId}.${flagSetup[i].flagId}`, value);
      }
    }

    return;
  }

  // if the pack doesn't exist, throws an error
  // should only be called after the pack topic flag has been set
  public static get<T extends PackFlagKey>(packId: string, flag: T): PackFlagType<T> {
    const p = getGame()?.packs?.find((p)=>p?.metadata.id===packId);
    
    const config = flagSetup.find((s)=>s.flagId===flag);

    if (!p || !config)
      throw new Error('Invalid flagId or packId in PackFlags.get()');

    const wf = p.folder as Folder;
    if (!wf)
      throw new Error('Bad folder in PackFlags.get()');

    let setting = wf.getFlag(moduleJson.id, `packFlags.${packId}.${config.flagId}`) as PackFlagType<T> | null | undefined;
    if (!setting) {
      const topic = wf.getFlag(moduleJson.id, `packFlags.${packId}.${config}.${PackFlagKey.topic}`) as Topic | null | undefined;

      if (!topic)
        throw new Error('Attempt to get a package flag before package topic set in PackFlags.get()'); 

      setting = (typeof config.default==='function' ? (config.default as (topic:Topic)=> unknown)(topic) : foundry.utils.deepClone(config.default)) as PackFlagType<T>;
    }

    return setting;
  }

  public static async set<T extends PackFlagKey>(packId: string, flag: T, value: PackFlagType<T>): Promise<void> {
    const p = getGame()?.packs?.find((p)=>p?.metadata.id===packId);
    
    if (!p)
      throw new Error('Invalid packId in PackFlags.set()');

    const wf = p.folder as Folder;
    if (!wf)
      throw new Error('Bad folder in PackFlags.set()');

    const config = flagSetup.find((s)=>s.flagId===flag);
    if (!config)
      throw new Error('Bad flag in PackFlags.set()');

    if (config.clean) {
      config.clean(value);
    }

    await wf.setFlag(moduleJson.id, `packFlags.${packId}.${flag}`, value);
  }

  /**
   * Remove a key from an object flag
   *
   * @static
   * @template T
   * @param {string} packId
   * @param {T} flag
   * @param {string} [key]
   * @return {*}  {Promise<void>}
   * @memberof PackFlags
   */
  public static async unset<T extends PackFlagKey>(packId: string, flag: T, key?: string): Promise<void> {
    const p = getGame()?.packs?.find((p)=>p?.metadata.id===packId);
    
    if (!p)
      throw new Error('Invalid packId in PackFlags.unset()');

    const wf = p.folder as Folder;
    if (!wf)
      throw new Error('Bad folder in PackFlags.geunsett()');

    await wf.unsetFlag(moduleJson.id, `packFlags.${packId}.${flag}${key ? '.' + key : ''}`);
  }

  // special case because of nesting
  /**
   * Set the hierarchy for a specific entry in a pack
   *
   * @static
   * @param {string} packId
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   * @memberof PackFlags
   */
  public static async setHierarchy(packId: string, entryId: string, hierarchy: Hierarchy): Promise<void> {
    const p = getGame()?.packs?.find((p)=>p?.metadata.id===packId);
    
    if (!p)
      throw new Error('Invalid packId in PackFlags.setHierarchy()');

    const wf = p.folder as Folder;
    if (!wf)
      throw new Error('Bad folder in PackFlags.setHierarchy()');

    // pull the full structure
    const hierarchies = PackFlags.get(packId, PackFlagKey.hierarchies);
    hierarchies[entryId] = hierarchy;

    await PackFlags.set(packId, PackFlagKey.hierarchies, hierarchies);
  }

  /**
   * Remove an entry from hierarchy
   *
   * @static
   * @param {string} packId
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   * @memberof PackFlags
   */
  public static async unsetHierarchy(packId: string, entryId: string): Promise<void> {
    const p = getGame()?.packs?.find((p)=>p?.metadata.id===packId);
    
    if (!p)
      throw new Error('Invalid packId in PackFlags.setHierarchy()');

    const wf = p.folder as Folder;
    if (!wf)
      throw new Error('Bad folder in PackFlags.setHierarchy()');

    // pull the full structure
    const hierarchies = PackFlags.get(packId, PackFlagKey.hierarchies);
    delete hierarchies[entryId];

    await PackFlags.set(packId, PackFlagKey.hierarchies, hierarchies);
  }
}

