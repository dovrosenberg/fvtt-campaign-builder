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

// we concatenate the flag and worldId... why? worldId has dots in it, which cannot be used in a key because they
//    are dereferenced by foundry when saving to the database, making it hard to get back in proper format
// we could just concatenate in the calling code, but then it would be much harder to type check
export abstract class UserFlags {
  public static get<T extends UserFlagKey>(flag: T, worldId: string): UserFlagType<T> | null {
    if (!getGame().user)
      return null;

    return (getGame().user?.getFlag(moduleJson.id, flag + worldId) || []) as UserFlagType<T>;
  }

  // note - setting a flag to null will delete it
  public static async set<T extends UserFlagKey>(flag: T, worldId: string, value: UserFlagType<T> | null): Promise<void> {
    if (!getGame().user)
      return;

    await getGame().user?.setFlag(moduleJson.id, flag + worldId, value);
  }
}
