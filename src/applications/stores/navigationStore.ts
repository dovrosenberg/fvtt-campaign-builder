// this store handles main navigation (tabs, bookmarks, recent)

// library imports
import { defineStore, } from 'pinia';
import { ref, } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { getCleanEntry } from '@/compendia';
import { localize } from '@/utils/game';
import { getIcon } from '@/utils/misc';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { useMainStore } from './mainStore';

// types
import { Bookmark, EntryHeader, WindowTab } from '@/types';


// the store definition
export const useNavigationStore = defineStore('navigation', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentWorldId, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
  const tabs = ref<WindowTab[]>([]);       // the main tabs of entries (top of WBHeader)
  const bookmarks = ref<Bookmark[]>([]);

  ///////////////////////////////
  // actions
  // activate - switch to the tab after creating - defaults to true
  // newTab - should entry open in current tab or a new one - defaults to true
  // entryId = the uuid of the entry for the tab  (currently just journal entries); if missing, open a "New Tab"
  // updateHistory - should history be updated- defaults to true
  // if not !newTab and entryId is the same as currently active tab, then does nothign
  const openEntry = async function (entryId = null as string | null, options?: { activate?: boolean, newTab?: boolean, updateHistory?: boolean }): Promise<WindowTab> {
    // set defaults
    options = {
      activate: true,
      newTab: true,
      updateHistory: true,
      ...options,
    };

    const journal = entryId ? await getCleanEntry(entryId) as JournalEntry : null;
    const entryName = (journal ? journal.name : localize('fwb.labels.newTab')) || '';
    const entry = { uuid: journal ? entryId : null, name: entryName, icon: journal ? getIcon(EntryFlags.get(journal, EntryFlagKey.topic)) : '' };

    // see if we need a new tab
    let tab;
    if (options.newTab || !getActiveTab(false)) {
      tab = {
        id: foundry.utils.randomID(),
        active: false,
        entry: entry,
        history: [],
        historyIdx: -1,
      } as WindowTab;

      //add to tabs list
      tabs.value.push(tab);
    } else {
      tab = getActiveTab(false);

      // if same entry, nothing to do
      if (tab.entry?.uuid === entryId)
        return tab;

      // otherwise, just swap out the active tab info
      tab.entry = entry;
    }
    
    // add to history 
    if (entry.uuid && options.updateHistory) {
      tab.history.push(entryId);
      tab.historyIdx = tab.history.length - 1; 
    }

    if (options.activate)
      await activateTab(tab.id);  

    // activating doesn't always save (ex. if we added a new entry to active tab)
    await _saveTabs();

    // update the recent list (except for new tabs)
    if (entry.uuid)
      await _updateRecent(entry);

    await mainStore.setNewEntry(entry.uuid);

    return tab;
  };

  // return the active tab
  // if findone is true, always returns one (i.e. if nothing active, returns the first one)
  const getActiveTab = function (findone = true): WindowTab | null {
    let tab = tabs.value.find(t => t.active);
    if (findone) {
      if (!tab && tabs.value.length > 0)  // nothing was marked as active, just pick the 1st one
        tab = tabs.value[0];
    }

    return tab || null;
  };

  // activate the given tab, first closing the current subsheet
  // tabId must exist
  const activateTab = async function (tabId: string): Promise<void> {
    let newTab: WindowTab | undefined;
    if (!tabId || !(newTab = tabs.value.find((t)=>(t.id===tabId))))
      return;

    // see if it's already current
    const currentTab = getActiveTab(false);
    if (currentTab?.id === tabId) {
      return;
    }

    if (currentTab)
      currentTab.active = false;
    
    newTab.active = true;

    await _saveTabs();

    // add to recent, unless it's a "home page"
    if (newTab?.entry?.uuid)
      await _updateRecent(newTab.entry);

    await mainStore.setNewEntry(newTab.entry.uuid);

    return;
  };

  const propogateNameChange = async(entryId: string, newName: string):Promise<void> => {
    // update the tabs 
    let updated = false;
    tabs.value.forEach((t: WindowTab): void => {
      if (t.entry.uuid===entryId) {
        t.entry.name = newName;
        updated = true;
      }
    });

    if (updated)
      await _saveTabs();
  };
 
  const cleanupDeletedEntry = async(entryId: string): Promise<void> => {
    let activeTabId = '';

    // remove any matching tabs
    for (let i=tabs.value.length-1; i>=0; i--) {
      if (tabs.value[i].entry.uuid===entryId) {
        // if it's active, we need to move active to prior tab
        if (tabs.value[i].active)
          activeTabId = tabs.value[i-1].id;

        tabs.value.splice(i, 1);
      }
    }

    // reset active tab if needed
    if (activeTabId!=='')
      await activateTab(activeTabId);

    // remove any matching bookmarks
    for (let i=bookmarks.value.length-1; i>=0; i--) {
      if (bookmarks.value[i].entry.uuid===entryId) {
        bookmarks.value.splice(i, 1);
      }
    }

  };

  // removes the bookmark with given id
  const removeBookmark = async function (bookmarkId: string) {
    const bookmarksValue = bookmarks.value;
    bookmarksValue.findSplice(b => b.id === bookmarkId);
    bookmarks.value = bookmarksValue;
    await _saveBookmarks();
  };

  const addBookmark = async (bookmark: Bookmark) => {
    bookmarks.value.push(bookmark);

    await _saveBookmarks();
  };

  const changeBookmarkPosition = async(from: number, to: number) => {
    const bookmarksValue = bookmarks.value;
    bookmarksValue.splice(to, 0, bookmarksValue.splice(from, 1)[0]);
    bookmarks.value = bookmarksValue;

    // save bookmarks (we don't activate anything)
    await _saveBookmarks();
  };
  

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // save tabs to database
  const _saveTabs = async function () {
    if (!currentWorldId.value)
      return;

    await UserFlags.set(UserFlagKey.tabs, tabs.value, currentWorldId.value);
  };

  const _saveBookmarks = async function () {
    if (!currentWorldId.value)
      return;

    await UserFlags.set(UserFlagKey.bookmarks, bookmarks.value, currentWorldId.value);
  };

  // add a new entity to the recent list
  const _updateRecent = async function (entry: EntryHeader): Promise<void> {
    if (!currentWorldId.value)
      return;

    let recent = UserFlags.get(UserFlagKey.recentlyViewed, currentWorldId.value) || [] as EntryHeader[];

    // remove any other places in history this already appears
    recent.findSplice((h: EntryHeader): boolean => h.uuid === entry.uuid);

    // insert in the front
    recent.unshift(entry);

    // trim if too long
    if (recent.length > 5)
      recent = recent.slice(0, 5);

    await UserFlags.set(UserFlagKey.recentlyViewed, recent, currentWorldId.value);
  };
  

  ///////////////////////////////
  // watchers

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    tabs,
    bookmarks,
    currentWorldId,
    

    openEntry,
    getActiveTab,
    activateTab,
    removeBookmark,
    addBookmark,
    changeBookmarkPosition,
    propogateNameChange,
    cleanupDeletedEntry,
  };
});