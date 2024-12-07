import { getGame } from '@/utils/game';
import moduleJson from '@module';
import { Bookmark, TabHeader, } from '@/types';
import { WindowTab, } from '@/classes';

export enum UserFlagKey {
  tabs = 'tabs',  // the open tabs
  bookmarks = 'bookmarks',  // stored bookmarks
  recentlyViewed = 'recentlyViewed',    // recent list
  currentWorld = 'currentWorld',   // the currently open world
}

type UserFlagType<K extends UserFlagKey> =
    K extends UserFlagKey.tabs ? WindowTab[] :
    K extends UserFlagKey.bookmarks ? Bookmark[] :
    K extends UserFlagKey.recentlyViewed ? TabHeader[] :
    K extends UserFlagKey.currentWorld ? string :
    never;  

export abstract class UserFlags {
  // for world-specific settings, we concatenate the flag and worldId... why? worldId has dots in it, which cannot be used in a key because they
  //    are dereferenced by foundry when saving to the database, making it hard to get back in proper format
  // we could just concatenate in the calling code, but then it would be much harder to type check
  public static get<T extends UserFlagKey>(flag: T, worldId = ''): UserFlagType<T> | null {
    if (!getGame().user)
      return null;

    if (flag === UserFlagKey.tabs) {
      return (getGame().user?.getFlag(moduleJson.id, `${flag}.${worldId}`) || []).map((t: any) => new WindowTab(
        t.active, 
        t.header,
        null,
        null,
        t.id,
        t.history,
        t.historyIdx
      )) as unknown as UserFlagType<T>;
    } else {
      return (getGame().user?.getFlag(moduleJson.id, `${flag}.${worldId}`) || []) as UserFlagType<T>;
    }
  }

  // note - setting a flag to null will delete it
  public static async set<T extends UserFlagKey>(flag: T, value: UserFlagType<T> | null, worldId = ''): Promise<void> {
    if (!getGame().user)
      return;

    await getGame().user?.setFlag(moduleJson.id, `${flag}.${worldId}`, value);
  }
}
