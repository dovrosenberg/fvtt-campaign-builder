// this store handles character-specific functionality

// library imports
import { defineStore, } from 'pinia';
import { computed, ref } from 'vue';

// local imports
import { getCleanEntry } from '@/compendia';
import { getGame, localize } from '@/utils/game';
import { getIcon } from '@/utils/misc';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';

// types
import { EntryHeader, WindowTab } from '@/types';


// the store definition
export const useWorldBuilderStore = defineStore('worldBuilder', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
  const rootFolder = ref<Folder | null>(null);
  const currentWorldFolder = ref<Folder | null>(null);  // the current world folder
  const currentEntryId = ref<string | null>(null);  // uuid of current entry
  const tabs = ref<WindowTab[]>([]);       // the main tabs of entries (top of WBHeader)

  const currentWorldId = computed((): string | null => currentWorldFolder.value ? currentWorldFolder.value.uuid : null);

  ///////////////////////////////
  // actions
  // the ones with an underscore are intended to be called by itemStore
  // save tabs to database
  const _saveTabs = async function () {
    if (!currentWorldId.value)
      return;

    await UserFlags.set(UserFlagKey.tabs, tabs.value, currentWorldId.value);
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
  
  // set a new world from a uuid
  const setNewWorld = async function (worldId: string | null): Promise<void> {
    if (!worldId)
      return;

    // load the folder
    currentWorldFolder.value = getGame()?.folders?.find((f)=>f.uuid===worldId) || null;

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
  };

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

    currentEntryId.value = entry.uuid;

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
    //this.saveScrollPos();

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

    // add to recent, unless it's a "new tab"
    if (newTab?.entry?.uuid)
      await _updateRecent(newTab.entry);

    currentEntryId.value = newTab.entry.uuid;

    return;
  };

 
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    tabs,
    currentWorldId,
    currentWorldFolder,
    currentEntryId,
    rootFolder,

    openEntry,
    getActiveTab,
    activateTab,
    setNewWorld,
  };
});