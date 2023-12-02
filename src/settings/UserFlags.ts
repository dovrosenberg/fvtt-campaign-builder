import { getGame } from '@/utils/game';
import moduleJson from '@module';
import { Bookmark, RecentItem, WindowTab } from '@/types';

export enum UserFlagKeys {
  tabs = 'tabs',  // the open tabs
  bookmarks = 'bookmarks',  // stored bookmarks
  recentlyViewed = 'recentlyViewed',    // recent list
}

type UserFlagType<K extends UserFlagKeys> =
    K extends UserFlagKeys.tabs ? WindowTab[] :
    K extends UserFlagKeys.bookmarks ? Bookmark[] :
    K extends UserFlagKeys.recentlyViewed ? RecentItem[] :
    never;  

// the solo instance
export let userFlags: UserFlags;

// set the main application; should only be called once
export function updateUserFlags(newUserFlags: UserFlags): void {
  userFlags = newUserFlags;
}

export class UserFlags {
  constructor() {
  }

  public get<T extends UserFlagKeys>(flag: T): UserFlagType<T> | null {
    if (!getGame().user)
      return null;

    return (getGame().user?.getFlag(moduleJson.id, flag) as UserFlagType<T>) || null;
  }

  // note - setting a flag to null will delete it
  public async set<T extends UserFlagKeys>(flag: T, value: UserFlagType<T> | null): Promise<void> {
    if (!getGame().user)
      return;

    await getGame().user?.setFlag(moduleJson.id, flag, value);
  }
}
