// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

import { getGame } from '@/utils/game';
import moduleJson from '@module';
import { Topic } from '@/types';

export enum WorldFlagKey {
  compendia = 'compendia',   // ids of the contained compendia
  packTopNodes = 'packTopNodes',  // maps compendium id to array of top-level nodes 
  packTopics = 'packTopics',    // maps compendium id to the topics it contains
  types = 'types',  // object where each key is a Topic and the value is an array of valid types
}

type WorldFlagType<K extends WorldFlagKey> =
    K extends WorldFlagKey.compendia ? Record<Topic, string> :
    K extends WorldFlagKey.packTopNodes ? Record<string, string[]> :   // keyed by compendium id
    K extends WorldFlagKey.packTopics ? Record<string, Topic> :   // keyed by compendium id
    K extends WorldFlagKey.types ? Record<Topic, string[]> :
    never;  

type FlagSettings<K extends WorldFlagKey> = {
  flagId: K;
  default: WorldFlagType<K>;
};

const flagSetup = [
  {
    flagId: WorldFlagKey.compendia,
    default: {},
  },
  {
    flagId: WorldFlagKey.packTopNodes,
    default: {},
  },
  {
    flagId: WorldFlagKey.packTopics,
    default: {},
  },
  {
    flagId: WorldFlagKey.types,
    default: {
      [Topic.Character]: [],
      [Topic.Location]: [],
      [Topic.Event]: [],
      [Topic.Organization]: [],
    },
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
    
    if (!f)
      return flagSetup.find((s)=>s.flagId===flag)?.default as WorldFlagType<T>;

    const setting = (f.getFlag(moduleJson.id, flag) || flagSetup.find((s)=>s.flagId===flag)?.default) as WorldFlagType<T>;

    return setting;
  }

  // note - setting a flag to null will delete it
  public static async set<T extends WorldFlagKey>(worldFolderUuid: string, flag: T, value: WorldFlagType<T> | null): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldFolderUuid);
    if (!f)
      return;

    await f.setFlag(moduleJson.id, flag, value);
  }
}
