// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref, watch } from 'vue';

// local imports
import { getGame } from '@/utils/game';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { WorldFlags, WorldFlagKey } from '@/settings/WorldFlags';
import { getCleanEntry } from '@/compendia';

// types
import { Topic, ValidTopic } from '@/types';


// the store definition
export const useMainStore = defineStore('main', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state
  const _currentJournals = ref<Record<ValidTopic, JournalEntry> | null>(null);  // current journals (by topic)
  const _currentEntry = ref<JournalEntryPage | null>(null);  // current entry

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
  const currentWorldCompendiumId = computed((): string => {
    return currentWorldCompendium.value.metadata.id;
  });

  // it's a little confusing because the ones called 'entry' mean our entries -- they're actually JournalEntryPage
  const currentJournals = computed((): Record<ValidTopic, JournalEntry> | null => _currentJournals?.value || null);
  const currentEntryId = computed((): string | null => _currentEntry?.value?.uuid || null);
  const currentEntry = computed((): JournalEntryPage | null => _currentEntry?.value || null);


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

    // this will also trigger the _currentJournals to be updated
    currentWorldFolder.value = folder;

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
  };

  const setNewEntry = async function (entry: string | null | JournalEntryPage): Promise<void> {
    if (typeof entry === 'string') {
      _currentEntry.value = await getCleanEntry(entry);

      if (!_currentEntry.value)
        throw new Error('Attempted to setNewEntry with invalid uuid');
    } else
      _currentEntry.value = entry;
  };

  ///////////////////////////////
  // computed state
  const currentEntryTopic = computed((): Topic => {
    if (!currentEntry.value)
      return Topic.None;

    return currentEntry.value.system.topic || Topic.None;
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
    const topics = [ Topic.Character, Topic.Event, Topic.Location, Topic.Organization ] as ValidTopic[];
    const retval = {
      [Topic.Character]: null,
      [Topic.Event]: null,
      [Topic.Location]: null,
      [Topic.Organization]: null,
    } as Record<ValidTopic, JournalEntry | null>;

    for (let i=0; i<topics.length; i++) {
      retval[topics[i]] = currentWorldCompendium.value.find((j) => j.uuid===topicEntries[topics[i]]) as JournalEntry | null;

      if (!retval[topics[i]])
        throw new Error(`Could not find journal for topic ${topics[i]} in world ${currentWorldId.value}`);
    }

    _currentJournals.value = retval as Record<ValidTopic, JournalEntry>;
  });

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentWorldId,
    currentWorldFolder,
    currentEntryTopic,
    currentJournals,
    currentEntry,
    currentEntryId,
    rootFolder,
    currentWorldCompendium,
    currentWorldCompendiumId,

    setNewWorld,
    setNewEntry,
  };
});