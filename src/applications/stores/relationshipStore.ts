// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { RelatedItem } from '@/utils/relationships';
import { reactive } from 'vue';

// local imports

// types
import { Topic } from '@/types';
import { EntryFlags } from 'src/settings/EntryFlags';


// the store definition
export const useRelationshipStore = defineStore('relationship', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  // add a relationship
  // reverse role is the 
  async function addRelationship(entry1Id: string, entry1Topic: Topic, entry1Type: string, entry2Topic: Topic, relationship: RelatedItem, reverseRole=''): Promise<void> {
    // create the relationship on item1
    const entry1 = await fromUuid(entry1Id);
    const entry2 = await fromUuid(relationship.uuid);

    if (!entry1 || !entry2)
      throw new Error('Invalid entry in relationshipStore.addRelationship()');

    // create the reverse item
    const reverseRelatedItem = {
      uuid: entry1Id,
      type: entry1Type,
      role: reverseRole,
    };

    // update the entries
    await EntryFlags.setRelationship(entry1Id, entry2Topic, relationship);
    await EntryFlags.setRelationship(relationship.uuid, entry1Topic, reverseRelatedItem);
  }

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    addRelationship,
  };
});