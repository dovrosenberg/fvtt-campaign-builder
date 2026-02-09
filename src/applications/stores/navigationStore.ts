// this store handles main navigation (tabs, bookmarks, recent)
// tabs is a 2D array: tabs[panelIndex][tabIndex]. Each inner array is one panel's tabs.

// library imports
import { ref, } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { localize } from '@/utils/game';
import { getTopicIcon, getTabTypeIcon } from '@/utils/misc';
import { ModuleSettings, SettingKey, UserFlagKey, UserFlags } from '@/settings';
import { useMainStore } from '@/applications/stores';
import DirectoryScrollService from '@/utils/directoryScroll';
import { hasUnsavedChanges, saveAndCloseAllActiveEditors, closeAllActiveEditors } from '@/utils/editorChangeDetection';
import { FCBDialog } from '@/dialogs';
import { SaveChangesResult } from '@/dialogs/saveChanges';
import { notifyError, notifyInfo } from '@/utils/notifications';
import GlobalSettingService from '@/utils/globalSettings';

// types
import { Bookmark, SessionDisplayMode, TabHeader, WindowTabType, } from '@/types';
import { WindowTab, Entry, Campaign, Session, Front, Arc, StoryWeb } from '@/classes';
import type { TabPanelState } from '@/composables/useTabPanelState';

interface OpenContentOptions {
  activate?: boolean;
  newTab?: boolean;
  updateHistory?: boolean;
  contentTabId?: string;
  forceTab?: boolean; // when true, use contentTabId even if subTabsSavePosition is false
  panelIndex?: number; // which panel to open in; defaults to focusedPanelIndex
}

interface ContentMetadata {
  name: string;
  icon: string;
  contentType: WindowTabType;
  defaultContentTab: string;
  badId: boolean;
}

// the store definition
export const navigationStore = () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentSetting, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state
  const _panelStates = new Map<number, TabPanelState>();

  ///////////////////////////////
  // external state
  const tabs = ref<WindowTab[][]>([[]]);       // main tabs - tabs[panelIndex][tabIndex]
  const focusedPanelIndex = ref<number>(0);
  const bookmarks = ref<Bookmark[]>([]);
  const sessionBookmarks = ref<Bookmark[]>([]); // special, derived bookmarks for latest sessions
  const recent = ref<TabHeader[]>([]);
  const _sessionBookmarksRefreshToken = ref<number>(0);
  const MAX_PANELS = 3;   // maximum number of split panels allowed

  // stable unique keys for each panel, so Vue can track component identity across removals
  const panelKeys = ref<string[]>([]);

  ///////////////////////////////
  // actions

  /**
   * Load metadata for content including name, icon, and default content tab.
   * This is shared logic used by both openContent and when creating tabs before switching settings.
   * 
   * @param contentId - The uuid of the content to load
   * @param contentType - The type of content
   * @returns Content metadata including name, icon, type, default content tab, and whether the ID was invalid
   */
  const loadContentMetadata = async function(contentId: string | null, contentType: WindowTabType): Promise<ContentMetadata> {
    // these are the default content tabs to open to
    const defaultContentTabMap = {
      [WindowTabType.Entry]: 'description',
      [WindowTabType.Setting]: 'description',
      [WindowTabType.Campaign]: 'description',
      [WindowTabType.Front]: 'description',
      [WindowTabType.Session]: 'notes',
      [WindowTabType.Arc]: 'description',
      [WindowTabType.StoryWeb]: '', // no tabs
      [WindowTabType.TagResults]: '', // no tabs
      [WindowTabType.NewTab]: '',  // no tabs
    } as Record<WindowTabType, string>;

    let name = localize('labels.newTab') || '';
    let icon = '';
    let badId = false;

    if (!contentId) {
      contentType = WindowTabType.NewTab;
    } else {
      switch (contentType) {
        case WindowTabType.Entry: {
          const entry = await Entry.fromUuid(contentId);
          if (!entry) {
            badId = true;
          } else {
            name = entry.name;
            icon = getTopicIcon(entry.topic);
          }
          break;
        }
        case WindowTabType.Setting: {
          const setting = await GlobalSettingService.getGlobalSetting(contentId);
          if (!setting) {
            badId = true;
          } else {
            name = setting.name;
            icon = getTabTypeIcon(WindowTabType.Setting);
          }
          break;
        }
        case WindowTabType.Campaign: {
          const campaign = await Campaign.fromUuid(contentId);
          if (!campaign) {
            badId = true;
          } else {
            name = campaign.name;
            icon = getTabTypeIcon(WindowTabType.Campaign);
          }
          break;
        }
        case WindowTabType.Front: {
          const front = await Front.fromUuid(contentId);
          if (!front) {
            badId = true;
          } else {
            name = front.name;
            icon = getTabTypeIcon(WindowTabType.Front);
          }
          break;
        }
        case WindowTabType.Session: {
          const session = await Session.fromUuid(contentId);
          if (!session) {
            badId = true;
          } else {
            name = `${localize('labels.session.session')} ${session.number}`;
            icon = getTabTypeIcon(WindowTabType.Session);
          }
          break;
        }
        case WindowTabType.Arc: {
          const arc = await Arc.fromUuid(contentId);
          if (!arc) {
            badId = true;
          } else {
            name = arc.name;
            icon = getTabTypeIcon(WindowTabType.Arc);
          }
          break;
        }
        case WindowTabType.StoryWeb: {
          const storyWeb = await StoryWeb.fromUuid(contentId);
          if (!storyWeb) {
            badId = true;
          } else {
            name = storyWeb.name;
            icon = getTabTypeIcon(WindowTabType.StoryWeb);
          }
          break;
        }
        case WindowTabType.TagResults: {
          // For TagResults, contentId is the tag name
          name = `Tag: ${contentId}`;
          icon = getTabTypeIcon(WindowTabType.TagResults);
          break;
        }
        case WindowTabType.NewTab:
          break;
        default:
          badId = true;
          break;
      }
    }

    if (badId) {
      contentType = WindowTabType.NewTab;
    }

    return {
      name,
      icon,
      contentType,
      defaultContentTab: defaultContentTabMap[contentType],
      badId
    };
  }

  /**
   * Open a new tab to the given entry. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param contentId The uuid of the entry to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the entry be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openEntry = async function(entryId = null as string | null, options?: OpenContentOptions) {
    await openContent(entryId, WindowTabType.Entry, options );
  };

  /**
   * Open a new tab to the given setting. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param settingId The uuid of the setting to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the setting be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openSetting = async function(settingId = null as string | null, options?: OpenContentOptions) {
    await openContent(settingId, WindowTabType.Setting, options );
  };

  /**
   * Open a new tab to the given campaign. If no campaign is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param campaignId The uuid of the campaign to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the campaign open in a new tab? Defaults to true.
   * @param options.updateHistory Should the campaign be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openCampaign = async function(campaignId = null as string | null, options?: OpenContentOptions) {
    await openContent(campaignId, WindowTabType.Campaign, options);
  };

  /**
   * Open a new tab to the given session. If no session is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param sessionId The uuid of the session to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the session open in a new tab? Defaults to true.
   * @param options.updateHistory Should the session be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openSession = async function(sessionId = null as string | null, options?: OpenContentOptions) {
    await openContent(sessionId, WindowTabType.Session, options);
  }; 

  /**
   * Open a new tab to the given arc. If no arc is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param arcId The uuid of the arc to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the arc open in a new tab? Defaults to true.
   * @param options.updateHistory Should the arc be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openArc = async function(arcId = null as string | null, options?: OpenContentOptions) {
    await openContent(arcId, WindowTabType.Arc, options);
  }; 

  /**
   * Open a new tab to the given front. If no front is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param frontId The uuid of the front to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the front open in a new tab? Defaults to true.
   * @param options.updateHistory Should the front be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openFront = async function(frontId = null as string | null, options?: OpenContentOptions) {
    await openContent(frontId, WindowTabType.Front, options);
  };

  /**
   * Open a new tab to the given story web. If no story web is given, a blank "New Tab" is opened.
   * 
   * @param storyWebId The uuid of the story web to open in the tab. If null, a blank tab is opened.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the story web open in a new tab? Defaults to true.
   * @param options.updateHistory Should the story web be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openStoryWeb = async function(storyWebId = null as string | null, options?: OpenContentOptions) {
    await openContent(storyWebId, WindowTabType.StoryWeb, options);
  }; 

  /** 
   * Opens a tab showing all entries with a specific tag
   * @param tagName - The tag to search for
   * @param options - Options for opening the tab
   */
  const openTagResults = async function(tagName: string, options?: OpenContentOptions): Promise<WindowTab> {
    // Use openContent to handle the tab creation/management
    return await openContent(tagName, WindowTabType.TagResults, options);
  };

  const setActiveTab = async function(tab: WindowTab, panelIndex: number): Promise<void> {
    const ps = _panelStates.get(panelIndex);
    if (ps)
      await ps.setNewTab(tab);
  };

  /**
   * Open a new tab to the given entry. If no entry is given, a blank "New Tab" is opened.  if not !newTab and contentId is the same as currently active tab, then does nothing
   * 
   * @param contentId The uuid of the entry, campaign, or session to open in the tab. If null, a blank tab is opened.
   * @param contentType The type of content to open. If null, defaults to entry.
   * @param options Options for the tab.
   * @param options.activate Should we switch to the tab after creating? Defaults to true.
   * @param options.newTab Should the entry open in a new tab? Defaults to true.
   * @param options.updateHistory Should the entry be added to the history of the tab? Defaults to true.
   * @param options.contentTabId The id of the content tab to open. If null, defaults to the default content tab for the type.
   * @returns The newly opened tab.
   */
  const openContent = async function (contentId = null as string | null, contentType: WindowTabType, options?: OpenContentOptions,): Promise<WindowTab> { 
    // set defaults
    options = {
      activate: true,
      newTab: true,
      updateHistory: true,
      contentTabId: undefined,
      forceTab: false,
      ...options,
    };

    const panelIndex = options.panelIndex ?? focusedPanelIndex.value;

    // don't switch or activate a new tab if user doesn't want to deal with unsaved changes
    if (!await handleUnsavedChanges()) {
      // for there to be unsaved changes, there has to be an active tab, so this is safe
      // @ts-ignore
      return getActiveTab(false, panelIndex);
    }

    // Load content metadata (name, icon, type)
    const metadata = await loadContentMetadata(contentId, contentType);
    
    if (metadata.badId) {
      contentType = WindowTabType.NewTab;
      contentId = null;
    } else {
      contentType = metadata.contentType;
    }

    // targetContentTab is either:
    //  * if we are remembering tabs, then it's the tab passed in
    //  * we aren't remembering tabs, but forceTab is set, then it's the tab passed in
    //  * otherwise, its the default tab
    const targetContentTab = 
      ModuleSettings.get(SettingKey.subTabsSavePosition) ? options.contentTabId : 
      options.forceTab && options.contentTabId ? options.contentTabId : metadata.defaultContentTab;

    const headerData: TabHeader = { uuid: contentId || null, name: metadata.name, icon: metadata.icon };

    // ensure the panel array exists
    if (!tabs.value[panelIndex])
      tabs.value[panelIndex] = [];

    // see if we need a new tab
    let tab;
    if (options.newTab || !getActiveTab(false, panelIndex)) {
      tab = new WindowTab(
        false,
        headerData,
        headerData.uuid,
        contentType, 
        null,
        targetContentTab
      );

      // set the target content tab 
      tab.contentTab = targetContentTab;
      // add to this panel's tabs list
      tabs.value[panelIndex].push(tab);
    } else {
      tab = getActiveTab(false, panelIndex);

      // if same entry and same content tab, nothing to do
      if ((tab.header?.uuid === contentId || null) && tab.contentTab === targetContentTab)
        return tab;

      // otherwise, just swap out the active tab info
      tab.header = headerData;

      // add to history -- it should go immediately after the current tab and all other forward history should go away
      // this is a new thing so the contentTab should always be the default
      if (headerData.uuid && options.updateHistory) {
        // addToHistory sets the contentTab on the NEW entry - don't set it before or we'll overwrite the old entry!
        tab.addToHistory(contentId, contentType, targetContentTab);
      } else {
        // Not adding to history (e.g., navigating back) - set contentTab on current entry
        tab.contentTab = targetContentTab;
      }

      // force a refresh of reactivity
      tabs.value = [ ...tabs.value ];
    }
    
    if (options.activate) {
      await activateTab(tab.id, options.forceTab, panelIndex);
      await focusPanel(panelIndex);
    }

    // activating doesn't always save (ex. if we added a new entry to active tab)
    await _saveTabs();

    // update the recent list (except for new tabs)
    if (headerData.uuid)
      await _updateRecent(headerData);

    // load content in the target panel
    await setActiveTab(tab, panelIndex);

    // scroll to the entry (only if this is the focused panel)
    if (panelIndex === focusedPanelIndex.value)
      await DirectoryScrollService.scrollToActiveEntry();

    return tab;
  };

  /**
   * Return the active tab within a specific panel.
   * If findOne is true, always returns one (i.e. if nothing active, returns the last one).
   * @param findOne - Whether to return a fallback tab if none is active
   * @param panelIndex - The panel to search in; defaults to focusedPanelIndex
   */
  const getActiveTab = function (findOne = true, panelIndex?: number): WindowTab | null {
    const pi = panelIndex ?? focusedPanelIndex.value;
    const panelTabs = tabs.value[pi] || [];

    let tab = panelTabs.find(t => t.active);
    if (findOne) {
      if (!tab && panelTabs.length > 0)  // nothing was marked as active, just pick the last one
        tab = panelTabs[panelTabs.length - 1];
    }

    return tab || null;
  };

  /**
   * Remove the tab with the given id. If the tab is active, then activate the previous tab.
   * If it's the last tab in the only remaining panel, create a new default one.
   * If it's the last tab in any non-sole panel, remove the panel entirely.
   * @param tabId The id of the tab to remove.
   * @param panelIndex The panel the tab belongs to; defaults to focusedPanelIndex.
   */
  const removeTab = async function (tabId: string, panelIndex?: number): Promise<void> {
    const pi = panelIndex ?? focusedPanelIndex.value;
    const panelTabs = tabs.value[pi];
    if (!panelTabs)
      return;

    // find the tab within this panel
    const tab = panelTabs.find((t) => (t.id === tabId));
    const index = panelTabs.findIndex((t) => (t.id === tabId));

    if (!tab) return;

    // remove it from the panel's array
    panelTabs.splice(index, 1);

    if (panelTabs.length === 0) {
      if (tabs.value.length > 1) {
        // more than one panel — remove this panel entirely
        await removePanel(pi);
      } else {
        // only panel remaining — create a default tab
        await openEntry(null, { panelIndex: pi });
      }

      // note: pi is out of date now; need to adjust it if we have to do anything else
    } else if (tab.active) {
      // if it was active, make the one before it active (or after if it was up front)
      if (index===0) {
        await activateTab(panelTabs[0].id, false, pi); // will also save them
      } else {
        await activateTab(panelTabs[index-1].id, false, pi); // will also save them
      }
    } else {
      // the other branches save via removePanel, openEntry, or activateTab
      await _saveTabs();
    }

  };

  /**
   * Closes all open tabs, removes all but the first panel, and removes all bookmarks.
   * Should be used only when there is no setting available.
   */
  const clearTabsAndBookmarks = async function () {
    // unregister all panel states except the first
    for (const [idx] of _panelStates) {
      if (idx !== 0)
        _panelStates.delete(idx);
    }

    tabs.value = [[]];
    panelKeys.value = [];
    focusPanel(0);
    bookmarks.value = [];
  };

  /** Used when changing content or tabs. Check for unsaved changes and if
   *  any, prompt the user to save or discard.
   * 
   *  @return true if any changes were saved/discarded, false if we need to cancel the switch
   */
  const handleUnsavedChanges = async function (): Promise<boolean> {
    // Check for unsaved changes if we're going to activate (switch tabs)
    if (hasUnsavedChanges()) {
      const result = await FCBDialog.saveChangesDialog();
      
      if (result === SaveChangesResult.Cancel) {
        // User cancelled, don't activate but we can still create the tab if needed
        return false;
      } else if (result === SaveChangesResult.Save) {
        // Save all changes before switching
        try {
          await saveAndCloseAllActiveEditors();
        } catch (error) {
          notifyError('Failed to save editors: ' + error);

          // Don't continue with activate if save fails
          return false;
        }
      } else {
        // discard changes
        notifyInfo(localize('notifications.changesDiscarded'));

        // Close all editors after saving or discarding (but not canceling)
        await closeAllActiveEditors();
      }
    }

    return true;
  }

  /**
   * Activate the given tab within a specific panel, first closing the current subsheet.
   * @param tabId - The id of the tab to activate
   * @param forceTab - When true, preserve the contentTab even when subTabsSavePosition is off
   * @param panelIndex - The panel to operate on; defaults to focusedPanelIndex
   */
  const activateTab = async function (tabId: string, forceTab: boolean = false, panelIndex?: number): Promise<void> {
    const pi = panelIndex ?? focusedPanelIndex.value;
    const panelTabs = tabs.value[pi] || [];

    let newTab: WindowTab | undefined;
    if (!tabId || !(newTab = panelTabs.find((t) => (t.id === tabId))))
      return;

    // see if it's already current
    const currentTab = getActiveTab(false, pi);
    if (currentTab?.id === tabId) {
      return;
    }

    if (!await handleUnsavedChanges())
      return;
    
    if (currentTab)
      currentTab.active = false;
    
    newTab.active = true;

    // reset the contentTab to the default if that's the mode we're in
    if (!ModuleSettings.get(SettingKey.subTabsSavePosition) && !forceTab)
      newTab.contentTab = null;
    
    await _saveTabs();

    // add to recent, unless it's a "home page"
    if (newTab?.header?.uuid)
      await _updateRecent(newTab.header);

    // load content in the target panel
    await setActiveTab(newTab, pi);

    // Scroll to and expand the active entry in the directory tree (only if focused panel)
    if (pi === focusedPanelIndex.value)
      await DirectoryScrollService.scrollToActiveEntry();

    return;
  };

  /**
   * Update the contenttab on the current tab and save to DB
   * @param newContentTab - The new content tab identifier
   * @param panelIndex - The panel to operate on; defaults to focusedPanelIndex
   */
  const updateContentTab = async function (newContentTab: string, panelIndex?: number): Promise<void> {
    const pi = panelIndex ?? focusedPanelIndex.value;
    const currentTab = getActiveTab(false, pi);
    
    if (!currentTab) 
      return;

    // Update the history of the current tab with the new content tab
    if (currentTab.history.length > 0 && currentTab.historyIdx >= 0) {
      currentTab.history[currentTab.historyIdx].contentTab = newContentTab;
    }
    
    await _saveTabs();
  }

  /** Move forward/back across tab bar within the focused panel
   * @param numberOfTabs The number of tabs to move forward/back
   */
  const traverseTabs = async function (numberOfTabs: number): Promise<void> {
    const pi = focusedPanelIndex.value;
    const panelTabs = tabs.value[pi] || [];
    const currentTab = getActiveTab(false, pi);
    
    if (!currentTab) 
      return;

    const newIdx = panelTabs.findIndex((t) => (t.id === currentTab.id)) + numberOfTabs;
    if (newIdx < 0 || newIdx >= panelTabs.length)
      return;

    await activateTab(panelTabs[newIdx].id, false, pi);
  };

  /** Moves forward/back through the history "move" spaces within the focused panel */
  const navigateHistory = async function (move: number) {
    const pi = focusedPanelIndex.value;
    const tab = getActiveTab(true, pi);

    if (!tab) return;

    const newSpot = Math.clamp(tab.historyIdx + move, 0, tab.history.length-1);

    // if we didn't move, return
    if (newSpot === tab.historyIdx)
      return;

    // we need to make sure that any changes are saved or discarded before we modify the index
    if (!await handleUnsavedChanges())
      return;

    tab.historyIdx = newSpot;
    
    // Trigger reactivity by reassigning the tabs array
    tabs.value = [...tabs.value];
    
    await openContent(tab.history[tab.historyIdx].contentId, tab.history[tab.historyIdx].tabType, { activate: false, newTab: false, contentTabId: tab.history[tab.historyIdx].contentTab || undefined, updateHistory: false, panelIndex: pi });
  };

  /**
   * Used after deleting an entry/campaign/session to make sure that no current tab or tab history includes
   * the deleted item. Iterates ALL panels.
   *
   * @param contentId - The content ID to remove.
   * @returns A promise that resolves when the ID has been removed.
   */
  const cleanupDeletedEntry = async (contentId: string): Promise<void> => {
    // iterate all panels (backward, since removePanel may shift indices)
    for (let pi = tabs.value.length - 1; pi >= 0; pi--) {
      const panelTabs = tabs.value[pi];
      if (!panelTabs)
        continue;

      // go backward in case we need to remove one
      for (let i = panelTabs.length-1; i>=0; i--) {
        const tab = panelTabs[i];
        let tabRemoved = false;

        // loop over the whole history
        for (let j = tab.history.length-1; j>=0; j--) {
          const history = tab.history[j];

          if (history.contentId === contentId) {
            if (tab.historyIdx === j && tab.history.length===1) {
              tabRemoved = true;
              await removeTab(tab.id, pi);

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

        // Update the header if it was pointing to the deleted entry
        if (!tabRemoved && tab.header?.uuid === contentId) {
          // Update the header to match the current history item
          const currentHistory = tab.history[tab.historyIdx];
          if (currentHistory && currentHistory.contentId) {
            let name = '';

            // if it's an entry, we need to get the topic
            let topic;
            if (currentHistory.tabType===WindowTabType.Entry) {
              const entry = await Entry.fromUuid(currentHistory.contentId);
              if (!entry)
                throw new Error('Invalid entry uuid in cleanupDeletedEntry()');
              topic = entry.topic;
              name = entry.name;
            }

            // Update the header to match the current history item
            tab.header = {
              uuid: currentHistory.contentId,
              name: name,
              icon: currentHistory.tabType===WindowTabType.Entry ? getTopicIcon(topic) : getTabTypeIcon(currentHistory.tabType)
            };
          } else if (currentHistory) {
            // If there's no content ID, it's a new tab
            tab.header = {
              uuid: null,
              name: localize('labels.newTab') || '',
              icon: getTabTypeIcon(currentHistory.tabType)
            };
          }
        }
      }
    }

    // save tabs and refresh all active tabs
    await _saveTabs();
    for (let pi = 0; pi < tabs.value.length; pi++) {
      const activeTab = getActiveTab(false, pi);
      if (activeTab)
        await setActiveTab(activeTab, pi);
    }
    await DirectoryScrollService.scrollToActiveEntry();

    // now remove from bookmarks
    bookmarks.value = bookmarks.value.filter(b => b.header.uuid !== contentId);
    await _saveBookmarks();

    // remove from recent items list
    recent.value = recent.value.filter(r => r.uuid !== contentId);
    await _saveRecent();
  };
  
  /**
   * When an entry's name changes, propagate that change to the header of all open tabs (across ALL panels) and bookmarks.
   * @param contentId - The ID of the entry whose name changed.
   * @param newName - The new name of the entry.
   */
  const propagateNameChange = async (contentId: string, newName: string):Promise<void> => {
    // Update tabs across all panels
    let updated = false;
    for (const panelTabs of tabs.value) {
      panelTabs.forEach((t: WindowTab): void => {
        if (t.header.uuid === contentId) {
          t.header.name = newName;
          updated = true;
        }
      });
    }

    if (updated)
      await _saveTabs();

    // Update bookmarks
    updated = false;
    bookmarks.value.forEach((b: Bookmark): void => {
      if (b.header.uuid===contentId) {
        b.header.name = newName;
        updated = true;
      }
    });

    if (updated)
      await _saveBookmarks();

    // Update recent items
    updated = false;
    recent.value.forEach((r: TabHeader): void => {
      if (r.uuid===contentId) {
        r.name = newName;
        updated = true;
      }
    });

    if (updated)
      await _saveRecent();   
  };

  /** Loads tabs (2D array), bookmarks, and recent from UserFlags. Ensures at least one panel with one tab. */
  const loadTabs = async function () {
    if (!currentSetting.value)
      return;

    tabs.value = UserFlags.get(UserFlagKey.tabs, currentSetting.value.uuid) || [[]];
    bookmarks.value = UserFlags.get(UserFlagKey.bookmarks, currentSetting.value.uuid) || [];
    recent.value = UserFlags.get(UserFlagKey.recentlyViewed, currentSetting.value.uuid) || [];

    // ensure at least one panel exists
    if (tabs.value.length === 0)
      tabs.value = [[]];

    // generate stable keys for each loaded panel
    panelKeys.value = tabs.value.map(() => foundry.utils.randomID());

    // if the first panel has no tabs, create a default one
    if (!tabs.value[0].length) {
      await openEntry(null, { panelIndex: 0 });
    } else {
      // activate the active one in the first panel (focused by default)
      focusPanel(0);
      const tabToActivate = getActiveTab(true, 0) as WindowTab;
      if (!ModuleSettings.get(SettingKey.subTabsSavePosition))
        tabToActivate.contentTab = null;
      
      // the panel state will be set up by TabPanel.vue on mount; for now just scroll
      // TabPanel.onMounted will call setNewTab on the active tab for each panel
      await DirectoryScrollService.scrollToActiveEntry();
    }
  };
 
  /**
   * Refreshes the derived "session bookmarks" list (one per campaign), pointing at the most recent session.
   */
  const refreshSessionBookmarks = async function (): Promise<void> {
    const token = ++_sessionBookmarksRefreshToken.value;

    if (!ModuleSettings.get(SettingKey.sessionBookmark)) {
      sessionBookmarks.value = [];
      return;
    }

    if (!currentSetting.value) {
      sessionBookmarks.value = [];
      return;
    }

    // Ensure campaigns are loaded. (Avoid calling loadCampaigns if the directory already did.)
    const campaignIndexCount = currentSetting.value.campaignIndex?.length || 0;
    const loadedCampaignCount = Object.keys(currentSetting.value.campaigns || {}).length;
    if (campaignIndexCount > 0 && loadedCampaignCount < campaignIndexCount) {
      await currentSetting.value.loadCampaigns();
    }

    const displayMode = ModuleSettings.get(SettingKey.sessionDisplayMode);
    const newBookmarks: Bookmark[] = [];
    const campaigns = Object.values(currentSetting.value.campaigns);

    for (const campaign of campaigns) {
      // Skip campaigns with no sessions
      if (!campaign.sessionIndex?.length) {
        continue;
      }

      const lastSessionIndex = campaign.sessionIndex[campaign.sessionIndex.length - 1];
      if (!lastSessionIndex?.uuid) {
        continue;
      }

      const session = await Session.fromUuid(lastSessionIndex.uuid);
      if (!session) {
        continue;
      }

      // Get session display name based on setting
      let name = '';
      switch (displayMode) {
        case SessionDisplayMode.Date:
          if (session.date) {
            name = new Date(session.date).toLocaleDateString();
          } else {
            name = `${localize('labels.session.session')} ${session.number}`;
          }
          break;
        case SessionDisplayMode.Name:
          if (session.name && session.name.trim() !== '') {
            name = session.name;
          } else {
            name = `${localize('labels.session.session')} ${session.number}`;
          }
          break;
        case SessionDisplayMode.Number:
        default:
          name = `${localize('labels.session.session')} ${session.number}`;
          break;
      }

      newBookmarks.push({
        id: `session-${campaign.uuid}`,
        header: {
          uuid: session.uuid,
          name: `${name}`,
          icon: getTabTypeIcon(WindowTabType.Session)
        },
        tabInfo: {
          tabType: WindowTabType.Session,
          contentId: session.uuid,
        }
      } as Bookmark);
    }

    // Avoid out-of-order async updates overwriting newer results.
    if (_sessionBookmarksRefreshToken.value !== token) {
      return;
    }

    sessionBookmarks.value = newBookmarks;
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
  // panel management

  /**
   * Register a TabPanelState for a given panel index. Called by TabPanel on mount.
   * @param index - The panel index
   * @param state - The TabPanelState to register
   */
  const registerPanelState = function (index: number, state: TabPanelState): void {
    _panelStates.set(index, state);
  };

  /**
   * Unregister a TabPanelState. Called by TabPanel on unmount.
   * @param index - The panel index to unregister
   */
  const unregisterPanelState = function (index: number): void {
    _panelStates.delete(index);
  };

  /**
   * Focus a specific panel. Updates focusedPanelIndex and tells mainStore to delegate to this panel.
   * @param index - The panel index to focus
   */
  const focusPanel = function (index: number): void {
    // make sure index is valid
    const validTab = Math.clamp(index, 0, tabs.value.length -1);

    const previousIndex = focusedPanelIndex.value;
    focusedPanelIndex.value = validTab;
    const ps = _panelStates.get(validTab) || null;
    mainStore.setFocusedPanel(ps);

    // scroll directory to the newly focused panel's active entry
    if (validTab !== previousIndex)
      void DirectoryScrollService.scrollToActiveEntry();
  };

  /**
   * Split the rightmost panel: move its active tab into a newly created panel to the right.
   * Only callable when rightmost panel has >1 tab AND total panels < 3.
   */
  const splitToRight = async function (): Promise<void> {
    if (tabs.value.length >= MAX_PANELS)
      return;

    const rightmostIdx = tabs.value.length - 1;
    const rightmostTabs = tabs.value[rightmostIdx];
    if (rightmostTabs.length <= 1)
      return;

    // find the active tab in the rightmost panel
    const activeIdx = rightmostTabs.findIndex(t => t.active);
    if (activeIdx < 0)
      return;

    const movedTab = rightmostTabs.splice(activeIdx, 1)[0];

    // activate adjacent tab in the source panel
    const newActiveIdx = Math.min(activeIdx, rightmostTabs.length - 1);
    rightmostTabs[newActiveIdx].active = true;

    // tell the source panel to load its new active tab
    await setActiveTab(rightmostTabs[newActiveIdx], rightmostIdx);

    // create the new panel with the moved tab
    movedTab.active = true;
    tabs.value.push([movedTab]);
    panelKeys.value.push(foundry.utils.randomID());

    await _saveTabs();

    // focus the new panel (TabPanel.vue will mount and register its panelState,
    //    so we don't need to use focusPanel())
    focusedPanelIndex.value = tabs.value.length - 1;
  };

  /**
   * Remove a panel at the given index. Re-indexes remaining panels.
   * Focus adjusts to stay valid. The last remaining panel cannot be removed.
   * @param index - The panel index to remove
   */
  const removePanel = async function (index: number): Promise<void> {
    if (tabs.value.length <= 1)
      return;

    // unregister the panel state
    _panelStates.delete(index);

    // splice out the panel and its stable key
    tabs.value.splice(index, 1);
    panelKeys.value.splice(index, 1);

    // re-index panelStates: shift down all entries after the removed index
    const newMap = new Map<number, TabPanelState>();
    for (const [idx, ps] of _panelStates) {
      if (idx > index)
        newMap.set(idx - 1, ps);
      else
        newMap.set(idx, ps);
    }
    _panelStates.clear();
    for (const [idx, ps] of newMap) {
      _panelStates.set(idx, ps);
    }

    // adjust focused panel index
    if (focusedPanelIndex.value >= tabs.value.length)
      focusPanel(tabs.value.length - 1);
    else if (focusedPanelIndex.value >= index)
      focusPanel(focusedPanelIndex.value - 1);

    await _saveTabs();
  };

  /**
   * Move a tab from one panel to another. Handles activating an adjacent tab in the source panel,
   * appending to the target panel, activating it there, and removing the source panel if it becomes empty.
   * @param tabId - The ID of the tab to move
   * @param sourcePanelIndex - The panel the tab is currently in
   * @param targetPanelIndex - The panel to move the tab to
   */
  const moveTabToPanel = async function (tabId: string, sourcePanelIndex: number, targetPanelIndex: number): Promise<void> {
    const sourceTabs = tabs.value[sourcePanelIndex];
    if (!sourceTabs)
      return;

    // find and remove tab from source panel
    const tabIdx = sourceTabs.findIndex(t => t.id === tabId);
    if (tabIdx < 0)
      return;

    const movedTab = sourceTabs.splice(tabIdx, 1)[0];

    // if source panel lost its active tab, activate adjacent tab
    if (movedTab.active && sourceTabs.length > 0) {
      const newActiveIdx = Math.min(tabIdx, sourceTabs.length - 1);
      await activateTab(sourceTabs[newActiveIdx].id, false, sourcePanelIndex);
    }

    // append to target panel end and activate
    movedTab.active = false;
    tabs.value[targetPanelIndex].push(movedTab);
    await activateTab(movedTab.id, false, targetPanelIndex);

    // if source panel is now empty and not the only panel, remove it
    if (sourceTabs.length === 0 && tabs.value.length > 1) {
      await removePanel(sourcePanelIndex);
    }
  };

  /**
   * Find which panel contains a tab with the given content type and optionally content id.
   * Checks the focused panel first, then searches all other panels.
   * @param contentId - Content ID to match
   * @returns An object with panelIndex and tab, or null if not found
   */
  const findTabAcrossPanels = function (contentId: string): { panelIndex: number; tab: WindowTab } | null {
    // check focused panel first
    const focused = focusedPanelIndex.value;
    const focusedTabs = tabs.value[focused] || [];
    for (const tab of focusedTabs) {
      if (tab.header.uuid === contentId)
        return { panelIndex: focused, tab };
    }

    // search remaining panels
    for (let pi = 0; pi < tabs.value.length; pi++) {
      if (pi === focused)
        continue;
      const panelTabs = tabs.value[pi] || [];
      for (const tab of panelTabs) {
        if (tab.header.uuid === contentId)
          return { panelIndex: pi, tab };
      }
    }

    return null;
  };

  /**
   * Refresh content across all panels. If contentUuid is provided, only refreshes panels
   * whose current content matches that UUID. If omitted, refreshes all panels.
   * Used to synchronize panels showing the same content after saves or external changes.
   *
   * @param contentUuid - Optional UUID to match; if provided, only matching panels refresh
   */
  const refreshContentAcrossPanels = async function (contentUuid?: string): Promise<void> {
    for (const [_, ps] of _panelStates) {
      if (!contentUuid || ps.currentContentId.value === contentUuid) {
        await ps.refreshCurrentContent();
      }
    }
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // save tabs to database
  const _saveTabs = async function () {
    if (!currentSetting.value)
      return;

    await UserFlags.set(UserFlagKey.tabs, tabs.value, currentSetting.value.uuid);
  };

  const _saveBookmarks = async function () {
    if (!currentSetting.value)
      return;

    await UserFlags.set(UserFlagKey.bookmarks, bookmarks.value, currentSetting.value.uuid);
  };

  const _saveRecent = async function () {
    if (!currentSetting.value)
      return;

    await UserFlags.set(UserFlagKey.recentlyViewed, recent.value, currentSetting.value.uuid);
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
    panelKeys,
    focusedPanelIndex,
    bookmarks,
    sessionBookmarks,
    recent,
    MAX_PANELS,

    openEntry,
    openSession,
    openFront,
    openCampaign,
    openSetting,
    openContent,
    openArc,
    openStoryWeb,
    openTagResults,
    updateContentTab,
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
    traverseTabs,
    navigateHistory,
    loadContentMetadata,
    refreshSessionBookmarks,

    // panel management
    registerPanelState,
    unregisterPanelState,
    focusPanel,
    splitToRight,
    removePanel,
    moveTabToPanel,
    findTabAcrossPanels,
    refreshContentAcrossPanels,
  };
};