// this store handles operations related to entries generally (finding, etc.)

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { useMainStore } from './mainStore';

// types
import { Topic } from '@/types';

// the store definition
export const useEntryStore = defineStore('entry', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentWorldFolder, currentEntry, currentWorldCompendium } = storeToRefs(mainStore);
  
  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
   
  ///////////////////////////////
  // actions
  
  /**
   * Find all journal entries of a given topic
   * @todo   At some point, may need to make reactive (i.e. filter by what's been entered so far) or use algolia if lists are too long; 
   *            might also consider making every topic a different subtype and then using DocumentIndex.lookup  -- that might give performance
   *            improvements in lots of places
   * @param topic the topic to search
   * @param uniqueOnly if true, only return entries that are not already linked to the current entry
   * @returns a list of journal entries
   */
  const getEntriesForTopic = async function(topic: Topic, uniqueOnly = false): Promise<JournalEntry[]> {
    // we find all journal entries with this topic
    throw new error('getEntriesfortopic() needs to be fixed to use journalentrypage')
    let journalEntries = await topicCompendia[topic].find((j: JournalEntry) => EntryFlags.get(j, EntryFlagKey.topic) === topic);

    // filter unique ones if needed
    if (uniqueOnly && currentEntry.value) {
      const relatedEntries = getAllRelatedEntries(topic);
      journalEntries = journalEntries.filter((entry) => !relatedEntries.includes(entry.uuid));
    }

    return journalEntries;
  };

  /**
   * Retrieves a list of all uuids that are linked to the current entry for a specified topic.
   * 
   * @param topic - The topic for which to retrieve related items.
   * @returns An array of related uuids. Returns an empty array if there is no current entry.
   */
  const getAllRelatedEntries = function(topic: Topic): string[] {
    // make sure there's a current item
    if (!currentEntry.value)
      return [];

    // get relationships
    const relationships = EntryFlags.get(currentEntry.value, EntryFlagKey.relationships);

    if (!relationships[topic])
      return [];

    // if the flag has this topic, it's a Record keyed by uuid
    return Object.keys(relationships[topic]);
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // watchers
  
  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    getEntriesForTopic,
    getAllRelatedEntries,
  };
});