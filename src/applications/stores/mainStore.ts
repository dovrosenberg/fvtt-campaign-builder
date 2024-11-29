// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref, watch } from 'vue';

// local imports
import { getGame } from '@/utils/game';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { WorldFlags, WorldFlagKey } from '@/settings/WorldFlags';
import { CollapsibleNode } from '@/classes';

// types
import { Topic, ValidTopic, WindowTabType } from '@/types';
import { WindowTab, } from '@/classes';
import { SessionDoc } from '@/documents';

// the store definition
export const useMainStore = defineStore('main', () => {
  ///////////////////////////////
  // the state

  // current sidebar collapsed state 
  const directoryCollapsed = ref<boolean>(false);

  ///////////////////////////////
  // internal state
  const _currentTopicJournals = ref<Record<ValidTopic, JournalEntry> | null>(null);  // current journals (by topic)
  const _currentCampaignJournals = ref<JournalEntry[] | null>(null);  // campaign journals for current world
  const _currentEntry = ref<Entry | null>(null);  // current entry (when showing an entry tab)
  const _currentCampaign = ref<JournalEntry | null>(null);  // current campaign (when showing a campaign tab)
  const _currentSession = ref<SessionDoc  | null>(null);  // current session (when showing a session tab)
  const _currentTab = ref<WindowTab | null>(null);  // current tab

  ///////////////////////////////
  // external state
  const rootFolder = ref<Folder | null>(null);
  const currentWorldFolder = ref<Folder | null>(null);  // the current world folder

  const currentWorldId = computed((): string | null => currentWorldFolder.value ? currentWorldFolder.value.uuid : null);

  const currentWorldCompendium = computed((): CompendiumCollection<any> => {
    if (!currentWorldId.value)
      throw new Error('No currentWorldId in currentEntryStore.createEntry()');

    const pack = getGame().packs?.get(WorldFlags.get(currentWorldId.value, WorldFlagKey.worldCompendium)) || null;
    if (!pack)
      throw new Error('Bad compendia in currentEntryStore.createEntry()');

    return pack;
  });

  // it's a little confusing because the ones called 'entry' mean our entries -- they're actually JournalEntryPage
  const currentTopicJournals = computed((): Record<ValidTopic, JournalEntry> | null => _currentTopicJournals?.value || null);
  const currentCampaignJournals = computed((): JournalEntry[] | null => _currentCampaignJournals?.value || null);
  const currentEntry = computed((): Entry | null => _currentEntry?.value || null);
  const currentCampaign = computed((): JournalEntry | null => _currentCampaign?.value || null);
  const currentSession = computed((): SessionDoc | null => _currentSession?.value || null);
  const currentContentType = computed((): WindowTabType | null => _currentTab?.value?.tabType);  

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

    // this will also trigger the _currentTopicJournals/_currentCampaignJournals to be updated
    currentWorldFolder.value = folder;

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
  };

  const setNewTab = async function (tab: WindowTab): Promise<void> { 
    _currentTab.value = tab;

    switch (tab.tabType) {
      case WindowTabType.Entry:
        if (tab.header.uuid) {
          _currentEntry.value = new Entry(tab.header.uuid);
        } else {
          _currentEntry.value = null;
        }
        _currentCampaign.value = null;
        _currentSession.value = null;
        break;
      case WindowTabType.Campaign:
        _currentCampaign.value = _currentCampaignJournals.value?.find((c)=>(c.uuid===tab.header.uuid)) || null;
        _currentEntry.value = null;
        _currentSession.value = null;
        break;
      case WindowTabType.Session:
        throw new Error('Sessions not yet implemented in mainStore.setNewTab()');
        _currentSession.value = null;  
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
    if (!currentEntry.value)
      return;

    // just force all reactivity to update
    _currentEntry.value = { ..._currentEntry.value };
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
  // when the world changes, load the JournalEntries
  watch(() => currentWorldFolder.value,  async (newValue: Folder) => {
    if (!newValue || !currentWorldCompendium.value)
      return;

    const topicEntries = WorldFlags.get(newValue.uuid, WorldFlagKey.topicEntries);
    const campaignEntries = WorldFlags.get(newValue.uuid, WorldFlagKey.campaignEntries);
    const topics = [ Topic.Character, Topic.Event, Topic.Location, Topic.Organization ] as ValidTopic[];
    const topicJournals = {
      [Topic.Character]: null,
      [Topic.Event]: null,
      [Topic.Location]: null,
      [Topic.Organization]: null,
    } as Record<ValidTopic, JournalEntry | null>;
    const campaignJournals = [] as JournalEntry[];

    for (let i=0; i<topics.length; i++) {
      const t = topics[i];

      // we need to load the actual entries - not just the index headers
      topicJournals[t] = await(fromUuid(topicEntries[t])) as JournalEntry | null;

      if (!topicJournals[t])
        throw new Error(`Could not find journal for topic ${t} in world ${currentWorldId.value}`);
    }

    for (let i=0; i<Object.keys(campaignEntries).length; i++) {
      // we need to load the actual entries - not just the index headers
      const j = await(fromUuid(Object.keys(campaignEntries)[i])) as JournalEntry | null;
      if (j)
        campaignJournals.push(j);
    }

    // have to do this first because of watchers that trigger when we set _currentTopicJournals and _currentCampaignJournals
    CollapsibleNode.currentTopicJournals = topicJournals;
    CollapsibleNode.currentCampaignJournals = campaignJournals;

    _currentTopicJournals.value = topicJournals as Record<ValidTopic, JournalEntry>;
    _currentCampaignJournals.value = campaignJournals;

    CollapsibleNode.currentWorldId = newValue.uuid;
  });

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    directoryCollapsed,
    currentWorldId,
    currentWorldFolder,
    currentEntryTopic,
    currentTopicJournals,
    currentCampaignJournals,
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