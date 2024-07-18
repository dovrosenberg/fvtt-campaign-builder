// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

import { getGame } from '@/utils/game';
import moduleJson from '@module';
import { Topic } from '@/types';

export enum WorldFlagKey {
  compendia = 'compendia',   // ids of the contained compendia (keyed by topic)
  packTopNodes = 'packTopNodes',  // maps compendium id to array of top-level nodes 
  packTopics = 'packTopics',    // maps compendium id to the topics it contains
  types = 'types',  // object where each key is a Topic and the value is an array of valid types
  expandedIds = 'expandedIds',   // ids of nodes that are expanded in the tree (could be compendia or entries or subentries)
}

type WorldFlagType<K extends WorldFlagKey> =
    K extends WorldFlagKey.compendia ? Record<Topic, string> :
    K extends WorldFlagKey.packTopNodes ? Record<string, string[]> :   // keyed by compendium id
    K extends WorldFlagKey.packTopics ? Record<string, Topic> :   // keyed by compendium id
    K extends WorldFlagKey.types ? Record<Topic, string[]> :
    K extends WorldFlagKey.expandedIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
    never;  

type FlagSettings<K extends WorldFlagKey> = {
  flagId: K;
  default: WorldFlagType<K>;

  // needsFlatten determines if flattenObject is called, which is needed when the key is a record with keys that might have '.'
  //    THIS IS ONLY SAFE SO LONG AS THE VALUES ARE NOT ALSO OBJECTS!!!
  needsFlatten: boolean;
};

const flagSetup = [
  {
    flagId: WorldFlagKey.compendia,
    default: {},
    needsFlatten: false,      
  },
  {
    flagId: WorldFlagKey.packTopNodes,
    default: {},
    needsFlatten: true,      
  },
  {
    flagId: WorldFlagKey.packTopics,
    default: {},
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
    default: {},
    needsFlatten: true,
  },
] as FlagSettings<any>[];

export abstract class WorldFlags {
  public static async setDefaults(worldFolderUuid: string): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldFolderUuid);
    if (!f)
      return;

    for (let i=0; i<flagSetup.length; i++) {
      if (!f.getFlag(moduleJson.id, flagSetup[i].flagId)) {
        await f.setFlag(moduleJson.id, flagSetup[i].flagId, flagSetup[i].default);
      }
    }

    return;
  }

  public static get<T extends WorldFlagKey>(worldFolderUuid: string, flag: T): WorldFlagType<T> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldFolderUuid);
    
    const config = flagSetup.find((s)=>s.flagId===flag);

    if (!f)
      return config?.default as WorldFlagType<T>;

    const setting = (f.getFlag(moduleJson.id, flag) || config?.default) as WorldFlagType<T>;

    if (config?.needsFlatten)
      return foundry.utils.flattenObject(setting) as WorldFlagType<T>;
    else
      return setting;
  }

  // note - setting a flag to null will delete it
  public static async set<T extends WorldFlagKey>(worldFolderUuid: string, flag: T, value: WorldFlagType<T> | null): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldFolderUuid);
    if (!f)
      return;

    await f.setFlag(moduleJson.id, flag, value);
  }

  // remove a key from an object flag
  public static async unset<T extends WorldFlagKey>(worldFolderUuid: string, flag: T, key?: string): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldFolderUuid);
    if (!f)
      return;

    await f.unsetFlag(moduleJson.id, `${flag}${key ? '.' + key : ''}`);
  }
}