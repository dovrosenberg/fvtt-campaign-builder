// handles flags set on the world root folder

import { getGame } from '@/utils/game';
import moduleJson from '@module';
import { Topic } from '@/types';

export enum WorldFlagKey {
  compendia = 'compendia',   // ids of the contained compendia
}

type WorldFlagType<K extends WorldFlagKey> =
    K extends WorldFlagKey.compendia ? Record<Topic, string> :
    never;  

export abstract class WorldFlags {
  public static get<T extends WorldFlagKey>(worldFolderUuid: string, flag: T): WorldFlagType<T> | null {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldFolderUuid);
    if (!f)
      return null;

    return (f.getFlag(moduleJson.id, flag) as WorldFlagType<T>);
  }

  // note - setting a flag to null will delete it
  public static async set<T extends WorldFlagKey>(worldFolderUuid: string, flag: T, value: WorldFlagType<T> | null): Promise<void> {
    const f = getGame()?.folders?.find((f)=>f.uuid===worldFolderUuid);
    if (!f)
      return;

    await f.setFlag(moduleJson.id, flag, value);
  }
}
