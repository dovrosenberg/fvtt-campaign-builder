// this store handles main navigation (tabs, bookmarks, recent)

// library imports
import { defineStore, } from 'pinia';
import { ref, } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { localize } from '@/utils/game';
import { getTopicIcon, getTabTypeIcon } from '@/utils/misc';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { useMainStore } from './mainStore';

// types
import { Bookmark, TabHeader, WindowTabType, } from '@/types';
import { WindowTab, Entry, Campaign } from '@/classes';

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
 
  type OpenContentOptions = {
    activate?: boolean;
    newTab?: boolean;
    updateHistory?: boolean;
  }

  /**
   * Open a new tab to the given entry. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param contentId The uuid of the entry, campaign, or session to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the entry be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openEntry = async function(entryId = null as string | null, options?: OpenContentOptions) {
    await openContent(entryId, WindowTabType.Entry, options );
  }

  /**
   * Open a new tab to the given entry. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param campaignId The uuid of the entry, campaign, or session to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the entry be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openCampaign = async function(campaignId = null as string | null, options?: OpenContentOptions) {
    await openContent(campaignId, WindowTabType.Campaign, options);
  }

  /**
   * Open a new tab to the given entry. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param sessionId The uuid of the entry, campaign, or session to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the entry be added to the history of the tab? Defaults to true.
   * @returns The newly opened tab.
   */
  const openSession = async function(sessionId = null as string | null, options?: OpenContentOptions) {
    await openContent(sessionId, WindowTabType.Session, options);
  } 

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

    let name = localize('fwb.labels.newTab') || '';
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
      }; break;
      case WindowTabType.Campaign: {
        const campaign = contentId ? await Campaign.fromUuid(contentId) : null; 

        if (!campaign) {
          badId = true;
        } else {
          name = campaign.name; 
          icon = getTabTypeIcon(WindowTabType.Campaign);
        }
      }; break;
      case WindowTabType.Session: {
        // const session = contentId ? await Session.fromUuid(contentId) : null;
        if (true) { // (!session) {
          badId = true;
        } else {
          name = 'SESSION',
          icon = '';
        }
      }; break;
      case WindowTabType.NewTab: 
      default: {
        badId = true;
      }; break;
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

      // add to history
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
  // if findone is true, always returns one (i.e. if nothing active, returns the first one)
  const getActiveTab = function (findone = true): WindowTab | null {
    let tab = tabs.value.find(t => t.active);
    if (findone) {
      if (!tab && tabs.value.length > 0)  // nothing was marked as active, just pick the last one
        tab = tabs.value[tabs.value.length-1];
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
    if (newTab?.header?.uuid)
      await _updateRecent(newTab.header);

    await mainStore.setNewTab(newTab);

    return;
  };

  const propogateNameChange = async(contentId: string, newName: string):Promise<void> => {
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
    if (!currentWorldId.value)
      return;

    tabs.value = UserFlags.get(UserFlagKey.tabs, currentWorldId.value) || [];
    bookmarks.value = UserFlags.get(UserFlagKey.bookmarks, currentWorldId.value) || [];

    if (!tabs.value.length) {
      // if there are no tabs, add one
      await openEntry();
    } else {
      // activate the active one
      await mainStore.setNewTab(getActiveTab(true) as WindowTab);
    }
  }
 
  const cleanupDeletedEntry = async(entryId: string): Promise<void> => {
    let activeTabId = '';

    // remove any matching tabs
    for (let i=tabs.value.length-1; i>=0; i--) {
      if (tabs.value[i].header.uuid===entryId) {
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
      if (bookmarks.value[i].header.uuid===entryId) {
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
  const _updateRecent = async function (header: TabHeader): Promise<void> {
    if (!currentWorldId.value)
      return;

    let recent = UserFlags.get(UserFlagKey.recentlyViewed, currentWorldId.value) || [] as TabHeader[];

    // remove any other places in history this already appears
    recent.findSplice((h: TabHeader): boolean => h.uuid === header.uuid);

    // insert in the front
    recent.unshift(header);

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

    openEntry,
    openSession,
    openCampaign,
    openContent,
    getActiveTab,
    loadTabs,
    activateTab,
    removeBookmark,
    addBookmark,
    changeBookmarkPosition,
    propogateNameChange,
    cleanupDeletedEntry,
  };
});