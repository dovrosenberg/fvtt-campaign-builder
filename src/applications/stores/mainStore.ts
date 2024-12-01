// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref, } from 'vue';

// local imports
import { getGame } from '@/utils/game';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { WorldFlags, WorldFlagKey } from '@/settings/WorldFlags';

// types
import { Topic, WindowTabType } from '@/types';
import { WindowTab, Entry, Campaign, } from '@/classes';
import { SessionDoc } from '@/documents';

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
  const _currentSession = ref<SessionDoc  | null>(null);  // current session (when showing a session tab)
  const _currentTab = ref<WindowTab | null>(null);  // current tab

  ///////////////////////////////
  // external state
  const rootFolder = ref<Folder | null>(null);
  const currentWorldFolder = ref<Folder | null>(null);  // the current world folder

  const currentWorldId = computed((): string | null => currentWorldFolder.value ? currentWorldFolder.value.uuid : null);

  const currentWorldCompendium = computed((): CompendiumCollection<any> => {
    if (!currentWorldId.value)
      throw new Error('No currentWorldId in mainStore.currentWorldCompendium()');

    const pack = getGame().packs?.get(WorldFlags.get(currentWorldId.value, WorldFlagKey.worldCompendium)) || null;
    if (!pack)
      throw new Error('Bad compendia in mainStore.currentWorldCompendium()');

    return pack;
  });

  // these are the currently selected entry shown in the main tab
  // it's a little confusing because the ones called 'entry' mean our entries -- they're actually JournalEntryPage
  const currentEntry = computed((): Entry | null => _currentEntry?.value || null);
  const currentCampaign = computed((): Campaign | null => _currentCampaign?.value || null);
  const currentSession = computed((): SessionDoc | null => _currentSession?.value || null);
  const currentContentType = computed((): WindowTabType | null => _currentTab?.value?.tabType);  

  // the currently selected tab for the entry
  const currentContentTab = ref<string | null>(null);

  ///////////////////////////////
  // actions
  // set a new world from a uuid
  const setNewWorld = async function (worldId: string | null): Promise<void> {
    if (!worldId)
      return;

    // load the folder
    const folder = getGame()?.folders?.find((f)=>f.uuid===worldId) || null;
    
    if (!folder)
      throw new Error('Invalid folder id in mainStore.setNewWorld()');

    currentWorldFolder.value = folder;

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
  };

  const setNewTab = async function (tab: WindowTab): Promise<void> { 
    _currentTab.value = tab;

    switch (tab.tabType) {
      case WindowTabType.Entry:
        if (tab.header.uuid) {
          _currentEntry.value = await Entry.fromUuid(tab.header.uuid);
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
        throw new Error('Sessions not yet implemented in mainStore.setNewTab()');
        if (tab.header.uuid) {
          _currentSession.value = await Session.fromUuid(tab.header.uuid);
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
   * This is achieved by creating a shallow copy of the current entry, which triggers
   * reactivity updates throughout the application.
   */
  const refreshEntry = function (): void {
    if (!_currentEntry.value)
      return;

    // just force all reactivity to update
    _currentEntry.value = new Entry(_currentEntry.value.raw);
  };

  ///////////////////////////////
  // computed state
  const currentEntryTopic = computed((): Topic => {
    if (!currentEntry.value)
      return Topic.None;

    return currentEntry.value.topic || Topic.None;
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
    directoryCollapsed,
    currentWorldId,
    currentWorldFolder,
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
  };
});