import { Bookmark, TabHeader, } from '@/types';
import { WindowTab, } from '@/classes';
import { moduleId } from '.';

export enum UserFlagKey {
  tabs = 'tabs',  // the open tabs
  bookmarks = 'bookmarks',  // stored bookmarks
  recentlyViewed = 'recentlyViewed',    // recent list
  currentSetting = 'currentSetting',   // the currently open world
}

type UserFlagType<K extends UserFlagKey> =
    K extends UserFlagKey.tabs ? WindowTab[] :
    K extends UserFlagKey.bookmarks ? Bookmark[] :
    K extends UserFlagKey.recentlyViewed ? TabHeader[] :
    K extends UserFlagKey.currentSetting ? string :
    never;  

export abstract class UserFlags {
  // for world-specific settings, we concatenate the flag and worldId... why? worldId has dots in it, which cannot be used in a key because they
  //    are dereferenced by foundry when saving to the database, making it hard to get back in proper format
  // we could just concatenate in the calling code, but then it would be much harder to type check
  public static get<T extends UserFlagKey>(flag: T, worldId = ''): UserFlagType<T> | null {
    if (!game.user)
      return null;

    if (flag === UserFlagKey.tabs) {
      // We need to create the class instances
      return (game.user?.getFlag(moduleId, `${flag}.${worldId}`) || []).map((t: any) => new WindowTab(
        t.active, 
        t.header,
        null,
        null,
        t.id,
        null,
        t.history,
        t.historyIdx
      )) as unknown as UserFlagType<T>;
    } else if (flag === UserFlagKey.currentSetting) {
      return (game.user?.getFlag(moduleId, `${flag}.${worldId}`) ||  '') as UserFlagType<T>;
    } else {
      return (game.user?.getFlag(moduleId, `${flag}.${worldId}`) ||  []) as UserFlagType<T>;
    }
  }

  // note - setting a flag to null will delete it
  public static async set<T extends UserFlagKey>(flag: T, value: UserFlagType<T> | null, worldId = ''): Promise<void> {
    if (!game.user)
      return;

    // @ts-ignore - We don't want to setup the configuration with all the possible world/flag combos
    await game.user?.setFlag(moduleId, `${flag}.${worldId}`, value);
  }
}
