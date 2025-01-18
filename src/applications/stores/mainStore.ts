// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref, } from 'vue';

// local imports
import { UserFlagKey, UserFlags, } from '@/settings';

// types
import { Topics, WindowTabType, DocumentLinkType } from '@/types';
import { TopicFolder, WBWorld, WindowTab, Entry, Campaign, Session, PC, } from '@/classes';
import { EntryDoc, SessionDoc, CampaignDoc, PCDoc } from '@/documents';

// the store definition
export const useMainStore = defineStore('main', () => {
  ///////////////////////////////
  // the state

  // current sidebar collapsed state 
  const directoryCollapsed = ref<boolean>(false);

  ///////////////////////////////
  // internal state
  const _currentEntry = ref<Entry | null>(null);  // current entry (when showing an entry tab)
  const _currentPC = ref<PC | null>(null);  // current PC (when showing a PC tab)
  const _currentCampaign = ref<Campaign | null>(null);  // current campaign (when showing a campaign tab)
  const _currentSession = ref<Session  | null>(null);  // current session (when showing a session tab)
  const _currentTab = ref<WindowTab | null>(null);  // current tab

  ///////////////////////////////
  // external state
  const rootFolder = ref<Folder | null>(null);
  const currentWorld = ref<WBWorld | null>(null);  // the current world folder

  // can set this to tell current entry tab to refresh everything
  const refreshCurrentEntry = ref<boolean>(false);

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
  const currentPC = computed((): PC | null => (_currentPC?.value || null) as PC | null);
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

    // clear everything
    _currentEntry.value = null;
    _currentCampaign.value = null;
    _currentSession.value = null;
    _currentPC.value = null;

    switch (tab.tabType) {
      case WindowTabType.Entry:
        if (tab.header.uuid) {
          _currentEntry.value = await Entry.fromUuid(tab.header.uuid);
          if (!_currentEntry.value)
            throw new Error('Invalid entry uuid in mainStore.setNewTab()');

          _currentEntry.value.topicFolder = currentWorld.value.topicFolders[_currentEntry.value.topic];
        }
        break;
      case WindowTabType.Campaign:
        if (tab.header.uuid) {
          _currentCampaign.value = await Campaign.fromUuid(tab.header.uuid);

          if (!_currentCampaign.value)
            throw new Error('Invalid campaign uuid in mainStore.setNewTab()');
        }
        break;
      case WindowTabType.Session:
        if (tab.header.uuid) {
          _currentSession.value = await Session.fromUuid(tab.header.uuid);
          if (!_currentSession.value)
            throw new Error('Invalid session uuid in mainStore.setNewTab()');

          _currentCampaign.value = await _currentSession.value.loadCampaign();
        }
        break;
      case WindowTabType.PC:
        if (tab.header.uuid) {
          _currentPC.value = await PC.fromUuid(tab.header.uuid);
          if (!_currentPC.value)
            throw new Error('Invalid PC uuid in mainStore.setNewTab()');

          _currentCampaign.value = await _currentPC.value.loadCampaign();
        }
        break;
      default:  // make it a 'new entry' window
        tab.tabType = WindowTabType.NewTab;
    }
  };

  /**
   * Refreshes the current entry by forcing all reactive properties to update.
   * This is achieved by simply creating a new entry based on the EntryDoc of the current one
   */
  const refreshEntry = async function (): Promise<void> {
    if (!_currentEntry.value)
      return;

    if (!_currentEntry.value.topicFolder)
      throw new Error('Invalid current parent topic in mainStore.refreshEntry()');

    // just force all reactivity to update
    _currentEntry.value = new Entry(_currentEntry.value.raw as EntryDoc, _currentEntry.value.topicFolder as TopicFolder);
  };

  const refreshCampaign = async function (): Promise<void> {
    if (!_currentCampaign.value || !currentWorld.value)
      return;

    // just force all reactivity to update
    _currentCampaign.value = new Campaign(_currentCampaign.value.raw as CampaignDoc, currentWorld.value as WBWorld);
  };

  const refreshSession = async function (): Promise<void> {
    if (!_currentSession.value)
      return;

    // just force all reactivity to update
    _currentSession.value = new Session(_currentSession.value.raw as SessionDoc);
  };

  const refreshPC = async function (): Promise<void> {
    if (!_currentPC.value)
      return;

    // just force all reactivity to update
    _currentPC.value = new PC(_currentPC.value.raw as PCDoc);

    await _currentPC.value.getActor();
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
    currentPC,
    currentContentType,
    rootFolder,
    currentWorldCompendium,
    refreshCurrentEntry,
   
    setNewWorld,
    setNewTab,
    refreshEntry,
    refreshCampaign,
    refreshSession,
    refreshPC,
  };
});