// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref, } from 'vue';

// local imports
import { UserFlagKey, UserFlags, } from '@/settings';

// types
import { Topics, WindowTabType, DocumentLinkType } from '@/types';
import { TopicFolder, WBWorld, WindowTab, Entry, Campaign, Session, } from '@/classes';
import { EntryDoc, SessionDoc, CampaignDoc } from '@/documents';

// the store definition
export const useMainStore = defineStore('main', () => {
  ///////////////////////////////
  // the state

  // current sidebar collapsed state 
  const directoryCollapsed = ref<boolean>(false);

  ///////////////////////////////
  // internal state
  const _currentEntry = ref<Entry | null>(null);  // current entry (when showing an entry tab)
  const _currentCampaign = ref<Campaign | null>(null);  // current campaign (when showing a campaign tab)
  const _currentSession = ref<Session  | null>(null);  // current session (when showing a session tab)
  const _currentTab = ref<WindowTab | null>(null);  // current tab

  ///////////////////////////////
  // external state
  const rootFolder = ref<Folder | null>(null);
  const currentWorld = ref<WBWorld | null>(null);  // the current world folder

  const currentWorldCompendium = computed((): CompendiumCollection<any> => {
    if (!currentWorld.value)
      throw new Error('No currentWorld in mainStore.currentWorldCompendium()');

    const pack = currentWorld.value?.compendium || null;
    if (!pack)
      throw new Error('Bad compendia in mainStore.currentWorldCompendium()');

    return pack as CompendiumCollection<any>;
  });

  // these are the currently selected entry shown in the main tab
  // it's a little confusing because the ones called 'entry' mean our entries -- they're actually JournalEntryPage
  const currentEntry = computed((): Entry | null => (_currentEntry?.value || null) as Entry | null);
  const currentCampaign = computed((): Campaign | null => (_currentCampaign?.value || null) as Campaign | null);
  const currentSession = computed((): Session | null => (_currentSession?.value || null) as Session | null);
  const currentContentType = computed((): WindowTabType => _currentTab?.value?.tabType || WindowTabType.NewTab);  

  // the currently selected tab for the entry
  const currentContentTab = ref<string | null>(null);

  ///////////////////////////////
  // actions
  // set a new world from a uuid
  const setNewWorld = async function (worldId: string | null): Promise<void> {
    if (!worldId)
      return;

    // load the world
    const world = await WBWorld.fromUuid(worldId);
    
    if (!world)
      throw new Error('Invalid folder id in mainStore.setNewWorld()');

    currentWorld.value = world;

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
  };

  const setNewTab = async function (tab: WindowTab): Promise<void> { 
    if (!currentWorld.value)
      return;

    _currentTab.value = tab;

    switch (tab.tabType) {
      case WindowTabType.Entry:
        if (tab.header.uuid) {
          _currentEntry.value = await Entry.fromUuid(tab.header.uuid);
          if (!_currentEntry.value)
            throw new Error('Invalid entry uuid in mainStore.setNewTab()');

          _currentEntry.value.topicFolder = currentWorld.value.topicFolders[_currentEntry.value.topic];
        } else {
          _currentEntry.value = null;
        }
        _currentCampaign.value = null;
        _currentSession.value = null;
        break;
      case WindowTabType.Campaign:
        if (tab.header.uuid) {
          _currentCampaign.value = await Campaign.fromUuid(tab.header.uuid);
        } else {
          _currentCampaign.value = null;
        }
        _currentEntry.value = null;
        _currentSession.value = null;
        break;
      case WindowTabType.Session:
        if (tab.header.uuid) {
          _currentSession.value = await Session.fromUuid(tab.header.uuid);
          if (!_currentSession.value)
            throw new Error('Invalid entry uuid in mainStore.setNewTab()');

          _currentSession.value.campaign = currentWorld.value.campaigns[_currentSession.value.campaignId];
        } else {
          _currentSession.value = null;
        }
        _currentEntry.value = null;
        _currentCampaign.value = null;
        break;
      default:  // make it a 'new entry' window
        _currentSession.value = null;  
        _currentEntry.value = null;
        _currentCampaign.value = null;
        tab.tabType = WindowTabType.NewTab;
    }
  };

  /**
   * Refreshes the current entry by forcing all reactive properties to update.
   * This is achieved by simply creating a new entry based on the EntryDoc of the current one
   */
  const refreshEntry = function (): void {
    if (!_currentEntry.value)
      return;

    if (!_currentEntry.value.topicFolder)
      throw new Error('Invalid current parent topic in mainStore.refreshEntry()');

    // just force all reactivity to update
    _currentEntry.value = new Entry(_currentEntry.value.raw as EntryDoc, _currentEntry.value.topicFolder as TopicFolder);
  };

  const refreshCampaign = function (): void {
    if (!_currentCampaign.value || !currentWorld.value)
      return;

    // just force all reactivity to update
    _currentCampaign.value = new Campaign(_currentCampaign.value.raw as CampaignDoc, currentWorld.value as WBWorld);
  };

  const refreshSession = function (): void {
    if (!_currentSession.value)
      return;

    // just force all reactivity to update
    _currentSession.value = new Session(_currentSession.value.raw as SessionDoc);
  };

  ///////////////////////////////
  // computed state
  const currentEntryTopic = computed((): Topics => {
    if (!currentEntry.value)
      return Topics.None;

    return currentEntry.value.topic || Topics.None;
  });

  const currentDocumentTab = computed((): DocumentLinkType => {
    if (!currentContentTab.value)
      return DocumentLinkType.None;

    switch (currentContentTab.value) {
      case 'scenes':
        return DocumentLinkType.Scenes;
      case 'actors':
        return DocumentLinkType.Actors;
      default:
        return DocumentLinkType.None;
    }
  });

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // watchers

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentContentTab,
    currentDocumentTab,
    directoryCollapsed,
    currentWorld,
    currentEntryTopic,
    currentEntry,
    currentCampaign,
    currentSession,
    currentContentType,
    rootFolder,
    currentWorldCompendium,
   
    setNewWorld,
    setNewTab,
    refreshEntry,
    refreshCampaign,
    refreshSession,
  };
});