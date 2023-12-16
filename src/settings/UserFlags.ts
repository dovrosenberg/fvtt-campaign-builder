import { getGame } from '@/utils/game';
import moduleJson from '@module';
import { Bookmark, EntryHeader, WindowTab } from '@/types';

export enum UserFlagKey {
  tabs = 'tabs',  // the open tabs
  bookmarks = 'bookmarks',  // stored bookmarks
  recentlyViewed = 'recentlyViewed',    // recent list
}

type UserFlagType<K extends UserFlagKey> =
    K extends UserFlagKey.tabs ? WindowTab[] :
    K extends UserFlagKey.bookmarks ? Bookmark[] :
    K extends UserFlagKey.recentlyViewed ? EntryHeader[] :
    never;  

export abstract class UserFlags {
  public static get<T extends UserFlagKey>(flag: T): UserFlagType<T> | null {
    if (!getGame().user)
      return null;

    return (getGame().user?.getFlag(moduleJson.id, flag) as UserFlagType<T>);
  }

  // note - setting a flag to null will delete it
  public static async set<T extends UserFlagKey>(flag: T, value: UserFlagType<T> | null): Promise<void> {
    if (!getGame().user)
      return;

    await getGame().user?.setFlag(moduleJson.id, flag, value);
  }
}
