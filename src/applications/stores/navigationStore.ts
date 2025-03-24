// this store handles main navigation (tabs, bookmarks, recent)

// library imports
import { defineStore, } from 'pinia';
import { ref, } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { localize } from '@/utils/game';
import { getTopicIcon, getTabTypeIcon } from '@/utils/misc';
import { UserFlagKey, UserFlags } from '@/settings';
import { useMainStore } from './mainStore';

// types
import { Bookmark, TabHeader, WindowTabType, } from '@/types';
import { WindowTab, Entry, Campaign, Session, PC, WBWorld } from '@/classes';

// the store definition
export const useNavigationStore = defineStore('navigation', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentWorld, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
  const tabs = ref<WindowTab[]>([]);       // the main tabs of entries (top of WBHeader)
  const bookmarks = ref<Bookmark[]>([]);
  const recent = ref<TabHeader[]>([]);

  ///////////////////////////////
  // actions
 
  type OpenContentOptions = {
    activate?: boolean;
    newTab?: boolean;
    updateHistory?: boolean;
  }

  /**
   * Open a new tab to the given entry. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param contentId The uuid of the entry to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the entry be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openEntry = async function(entryId = null as string | null, options?: OpenContentOptions) {
    await openContent(entryId, WindowTabType.Entry, options );
  };

  /**
   * Open a new tab to the given world. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param contentId The uuid of the world to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the world be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openWorld = async function(worldId = null as string | null, options?: OpenContentOptions) {
    await openContent(worldId, WindowTabType.World, options );
  };

  /**
   * Open a new tab to the given campaign. If no campaign is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param campaignId The uuid of the campaign to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the campaign open in a new tab? Defaults to true.
   * @param options.updateHistory Should the campaign be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openCampaign = async function(campaignId = null as string | null, options?: OpenContentOptions) {
    await openContent(campaignId, WindowTabType.Campaign, options);
  };

  /**
   * Open a new tab to the given PC. If no PC is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param pcId The uuid of the PC to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the PC open in a new tab? Defaults to true.
   * @param options.updateHistory Should the PC be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openPC = async function(pcId = null as string | null, options?: OpenContentOptions) {
    await openContent(pcId, WindowTabType.PC, options);
  };

  /**
   * Open a new tab to the given session. If no session is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param sessionId The uuid of the session to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the session open in a new tab? Defaults to true.
   * @param options.updateHistory Should the session be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openSession = async function(sessionId = null as string | null, options?: OpenContentOptions) {
    await openContent(sessionId, WindowTabType.Session, options);
  }; 

  /**
   * Open a new tab to the given entry. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param contentId The uuid of the entry, campaign, or session to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the entry be added to the history of the tab? Defaults to true.
   * @param contentType The type of content to open. If null, defaults to entry.
   * @returns The newly opened tab.
   */
  const openContent = async function (contentId = null as string | null, contentType: WindowTabType, options?: OpenContentOptions,): Promise<WindowTab> { 
    // set defaults
    options = {
      activate: true,
      newTab: true,
      updateHistory: true,
      ...options,
    };

    let name = localize('labels.newTab') || '';
    let icon = '';
    let badId = false;

    if (!contentId) 
      contentType = WindowTabType.NewTab;

    switch (contentType) {
      case WindowTabType.Entry: {
        const entry = contentId ? await Entry.fromUuid(contentId) : null;
        if (!entry) {
          badId = true;
        } else {
          name = entry.name;
          icon = getTopicIcon(entry.topic);
        }
      } break;
      case WindowTabType.World: {
        const world = contentId ? await WBWorld.fromUuid(contentId) : null;
        if (!world) {
          badId = true;
        } else {
          name = world.name;
          icon = getTabTypeIcon(WindowTabType.World);
        }
      } break;
      case WindowTabType.Campaign: {
        const campaign = contentId ? await Campaign.fromUuid(contentId) : null; 

        if (!campaign) {
          badId = true;
        } else {
          name = campaign.name; 
          icon = getTabTypeIcon(WindowTabType.Campaign);
        }
      } break;
      case WindowTabType.Session: {
        const session = contentId ? await Session.fromUuid(contentId) : null;
        if (!session) {
          badId = true;
        } else {
          name = `${localize('labels.session.session')} ${session.number}`;
          icon = getTabTypeIcon(WindowTabType.Session);
        }
      } break;
      case WindowTabType.PC: {
        const pc = contentId ? await PC.fromUuid(contentId) : null;
        if (!pc) {
          badId = true;
        } else {
          name = pc.name;
          icon = getTabTypeIcon(WindowTabType.PC);
        }
      } break;
      case WindowTabType.NewTab: 
        break;
      default: {
        badId = true;
      } break;
    }

    if (badId) {
      contentType = WindowTabType.NewTab;
      contentId = null;
    }

    const headerData: TabHeader = { uuid: contentId || null, name: name, icon: icon };

    // see if we need a new tab
    let tab;
    if (options.newTab || !getActiveTab(false)) {
      tab = new WindowTab(
        false,
        headerData,
        headerData.uuid,
        contentType, 
        null,
      );

      //add to tabs list
      tabs.value.push(tab);
    } else {
      tab = getActiveTab(false);

      // if same entry, nothing to do
      if (tab.header?.uuid === contentId || null)
        return tab;

      // otherwise, just swap out the active tab info
      tab.header = headerData;

      // add to history -- it should go immediately after the current tab and all other forward history should go away
      if (headerData.uuid && options.updateHistory) {
        tab.addToHistory(contentId, contentType);
      }

      // force a refresh of reactivity
      tabs.value = [ ...tabs.value ];
    }
    
    if (options.activate)
      await activateTab(tab.id);  

    // activating doesn't always save (ex. if we added a new entry to active tab)
    await _saveTabs();

    // update the recent list (except for new tabs)
    if (headerData.uuid)
      await _updateRecent(headerData);

    await mainStore.setNewTab(tab);

    return tab;
  };

  // return the active tab
  // if findOne is true, always returns one (i.e. if nothing active, returns the first one)
  const getActiveTab = function (findOne = true): WindowTab | null {
    let tab = tabs.value.find(t => t.active);
    if (findOne) {
      if (!tab && tabs.value.length > 0)  // nothing was marked as active, just pick the last one
        tab = tabs.value[tabs.value.length-1];
    }

    return tab || null;
  };

  /**
   * Remove the tab with the given id. If the tab is active, then activate the previous tab.
   * If it's the last tab, create a new default one.
   * @param tabId The id of the tab to remove.
   */
  const removeTab = async function (tabId: string): Promise<void> {
    // find the tab
    const tab = tabs.value.find((t) => (t.id === tabId));
    const index = tabs.value.findIndex((t) => (t.id === tabId));

    if (!tab) return;

    // remove it from the array
    tabs.value.splice(index, 1);

    if (tabs.value.length === 0) {
      await openEntry();  // make a default tab if that was the last one (will also activate it) and save them
    } else if (tab.active) {
      // if it was active, make the one before it active (or after if it was up front)
      if (index===0) {
        await activateTab(tabs.value[0].id);  // will also save them
      }
      else {
        await activateTab(tabs.value[index-1].id);  // will also save them
      }
    }

    // force a refresh
    // tabs.value = [ ...tabs.value ];
  };

/**
 * Closes all open tabs and removes all bookmarks. Should be used only when there is no
 * world available.
 */
  const clearTabsAndBookmarks = async function () {
    tabs.value = [];
    bookmarks.value = [];
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
    if (newTab?.header?.uuid)
      await _updateRecent(newTab.header);

    await mainStore.setNewTab(newTab);

    return;
  };

  /**
   * Used after deleting an entry/campaign/session to make sure that no current tab or tab history includes 
   * the deleted item.
   *
   * @param contentId - The content ID to remove.
   * @returns A promise that resolves when the ID has been removed.
   */
  const cleanupDeletedEntry = async (contentId: string): Promise<void> => {
    // get the current set of tabs
    const tempTabs = tabs.value;

    if (tempTabs) {
      // loop over each one and remove from the history; set tabIndex to point to the subsequent entry
      // if there is only one entry left, eliminate the tab altogether
      // go backward in case we need to remove one
      for (let i = tempTabs.length-1; i>=0; i--) {
        const tab = tempTabs[i];

        // loop over the whole history
        for (let j = tab.history.length-1; j>=0; j--) {
          const history = tab.history[j];

          if (history.contentId === contentId) {
            if (tab.historyIdx === j && tab.history.length===1) {
              await removeTab(tab.id);
              tempTabs.splice(i, 1);

              // let's say this way the only remaining tab; then when we
              //    delete it, there's a new tab 0 (the default) that we 
              //    need to retain
              // but if we finish the loop, we're going to screw it up because
              //    `tempTabs` doesn't reflect that change yet
              if (tempTabs.length===1 && i===0) {
                tempTabs[0] = tabs.value[0];
              }

              break;
            } else if (tab.historyIdx >= j && (j>0 || tab.historyIdx>0)) {
              // if the entry is the current one or after the current one, we need to move the index back one
              //  (unless we're on the first one and that's the match)
              tab.historyIdx--;
            } else if (tab.historyIdx === j && j===0) {
              // there are others, but we're looking at the first one - set tab to next one
              // but that one will be 0 in a sec, so we don't actually need to do anything

              // note that if the length is 1, we'll be in the case above
            }

            // remove the entry from the history
            tab.history.splice(j, 1);
          }
        }
      }

      // save the tabs
      tabs.value = tempTabs;
      await _saveTabs();
    }

    // now remove from bookmarks
    bookmarks.value = bookmarks.value.filter(b => b.id !== contentId);
    await _saveBookmarks();

    // remove from recent items list
    recent.value = recent.value.filter(r => r.uuid !== contentId);
    await _saveRecent();
  };
  
  /**
   * When an entry's name changes, propagate that change to the header of all open tabs referring to that entry.
   * @param contentId - The ID of the entry whose name changed.
   * @param newName - The new name of the entry.
   */
  const propagateNameChange = async (contentId: string, newName: string):Promise<void> => {
    // update the tabs 
    let updated = false;
    tabs.value.forEach((t: WindowTab): void => {
      if (t.header.uuid===contentId) {
        t.header.name = newName;
        updated = true;
      }
    });

    if (updated)
      await _saveTabs();
  };

  const loadTabs = async function () {
    if (!currentWorld.value)
      return;

    tabs.value = UserFlags.get(UserFlagKey.tabs, currentWorld.value.uuid) || [];
    bookmarks.value = UserFlags.get(UserFlagKey.bookmarks, currentWorld.value.uuid) || [];
    recent.value = UserFlags.get(UserFlagKey.recentlyViewed, currentWorld.value.uuid) || [];

    if (!tabs.value.length) {
      // if there are no tabs, add one
      await openEntry();
    } else {
      // activate the active one
      await mainStore.setNewTab(getActiveTab(true) as WindowTab);
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
    if (!currentWorld.value)
      return;

    await UserFlags.set(UserFlagKey.tabs, tabs.value, currentWorld.value.uuid);
  };

  const _saveBookmarks = async function () {
    if (!currentWorld.value)
      return;

    await UserFlags.set(UserFlagKey.bookmarks, bookmarks.value, currentWorld.value.uuid);
  };

  const _saveRecent = async function () {
    if (!currentWorld.value)
      return;

    await UserFlags.set(UserFlagKey.recentlyViewed, recent.value, currentWorld.value.uuid);
  };

  // add a new entity to the recent list
  const _updateRecent = async function (header: TabHeader): Promise<void> {
    let newRecent = recent.value;

    // remove any other places in history this already appears
    newRecent.findSplice((h: TabHeader): boolean => h.uuid === header.uuid);

    // insert in the front
    newRecent.unshift(header);

    // trim if too long
    if (newRecent.length > 5)
      newRecent = newRecent.slice(0, 5);

    recent.value = newRecent;
    await _saveRecent();
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
    recent,

    openEntry,
    openSession,
    openCampaign,
    openWorld,
    openPC,
    openContent,
    getActiveTab,
    loadTabs,
    activateTab,
    removeTab,
    removeBookmark,
    addBookmark,
    changeBookmarkPosition,
    propagateNameChange,
    cleanupDeletedEntry,
    clearTabsAndBookmarks,
  };
});