// this store handles operations related to entries generally (finding, etc.)

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore } from './mainStore';

// types
import { ValidTopic } from '@/types';
import { Entry } from '@/documents';

// the store definition
export const useEntryStore = defineStore('entry', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentEntry, currentTopicJournals } = storeToRefs(mainStore);
  
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
  const getEntriesForTopic = async function(topic: ValidTopic, uniqueOnly = false): Promise<Entry[]> {
    if (!currentTopicJournals.value || !currentTopicJournals.value[topic])
      return [];

    // we find all journal entries with this topic
    let journalEntries = await currentTopicJournals.value[topic].collections.pages.contents as Entry[];

    // filter unique ones if needed
    if (uniqueOnly && currentEntry.value) {
      const relatedEntries = getAllRelatedEntries(topic);

      // also remove the current one
      journalEntries = journalEntries.filter((entry) => !relatedEntries.includes(entry.uuid) && entry.uuid !== currentEntry.value.uuid);
    }

    return journalEntries;
  };

  /**
   * Retrieves a list of all uuids that are linked to the current entry for a specified topic.
   * 
   * @param topic - The topic for which to retrieve related items.
   * @returns An array of related uuids. Returns an empty array if there is no current entry.
   */
  const getAllRelatedEntries = function(topic: ValidTopic): string[] {
    // make sure there's a current item
    if (!currentEntry.value)
      return [];

    // get relationships
    const relationships = currentEntry.value.system.relationships || {};

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