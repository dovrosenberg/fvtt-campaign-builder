// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { RelatedItem, RelatedItemDetails } from '@/utils/relationships';

// local imports
import { useMainStore } from './mainStore';

// types
import { Topic, TablePagination, AnyPaginationResult, CharacterRow, EventRow, LocationRow, OrganizationRow, ValidTopic } from '@/types';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { reactive, Ref } from 'vue';
import { ref } from 'vue';

// the store definition
export const useRelationshipStore = defineStore('relationship', () => {
  ///////////////////////////////
  // the state
  const relatedItemRows = reactive({
    [ValidTopic.Character]: { rowsAvailable:0, rows:[] as CharacterRow[]},
    [ValidTopic.Event]: { rowsAvailable:0, rows:[] as EventRow[]},
    [ValidTopic.Location]: { rowsAvailable:0, rows:[] as LocationRow[]},
    [ValidTopic.Organization]: { rowsAvailable:0, rows:[] as OrganizationRow[]},
  } as Record<ValidTopic, AnyPaginationResult>);
  const relatedItemPagination = reactive({
    [ValidTopic.Character]: ref<TablePagination>({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 10, rowsNumber: undefined, filter: ''} as TablePagination),
    [ValidTopic.Event]: ref<TablePagination>({ sortBy: 'date', descending: false, page: 1, rowsPerPage: 10, rowsNumber: undefined, filter: '' } as TablePagination),
    [ValidTopic.Location]: ref<TablePagination>({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 10, rowsNumber: undefined, filter: '' } as TablePagination),
    [ValidTopic.Organization]: ref<TablePagination>({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 10, rowsNumber: undefined, filter: '' } as TablePagination),
  } as Record<ValidTopic, Ref<TablePagination>>);

  // keyed by main entry topic, then the relationship topic
  const extraFields = reactive({
    [ValidTopic.Character]: {
      [ValidTopic.Character]: [{name:'role', label:'Role'}],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [{name:'role', label:'Role'}],
      [ValidTopic.Organization]: [],
    },
    [ValidTopic.Event]: {
      [ValidTopic.Character]: [],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [],
      [ValidTopic.Organization]: [],
    },
    [ValidTopic.Location]: {
      [ValidTopic.Character]: [{name:'role', label:'Role'}],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [],
      [ValidTopic.Organization]: [],
    },
    [ValidTopic.Organization]: {
      [ValidTopic.Character]: [{name:'role', label:'Role'}],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [],
      [ValidTopic.Organization]: [],
    },    
  } as Record<ValidTopic, Record<ValidTopic, {name: string; label: string; }[]>>); 
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentEntry, currentEntryTopic} = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  // add a relationship to the current entry
  // reverse role is the 
  async function addRelationship(relatedItemTopic: Topic, relatedItem: RelatedItem, reverseRole=''): Promise<void> {
    // create the relationship on current entry
    const entry1 = currentEntry.value;
    const entry2 = await fromUuid(relatedItem.uuid);

    if (!entry1 || !entry2)
      throw new Error('Invalid entry in relationshipStore.addRelationship()');

    const entry1Topic = currentEntryTopic.value;
    const entry1Type = EntryFlags.get(entry1, EntryFlagKey.type);

    if (!entry1Topic || !entry1Type)
      throw new Error('Invalid current entry in relationshipStore.addRelationship()');

    // create the reverse item
    const reverseRelatedItem = {
      uuid: entry1.uuid,
      type: entry1Type,
      role: reverseRole,
    };

    // update the entries
    await EntryFlags.setRelationship(entry1.uuid, relatedItemTopic, relatedItem);
    await EntryFlags.setRelationship(entry2.uuid, entry1Topic, reverseRelatedItem);
  }

  // remove a relationship to the current entry
  async function deleteRelationship(relatedItemTopic: Topic, relatedItemId: string): Promise<void> {
    if (!currentEntry.value)
      throw new Error('Invalid entry in relationshipStore.deleteRelationship()');

    // update the entries
    await EntryFlags.unsetRelationship(currentEntry.value.uuid, relatedItemTopic, relatedItemId);
    await EntryFlags.unsetRelationship(relatedItemId, currentEntryTopic.value, currentEntry.value.uuid);
  }

  // return all of the related items to this one for a given topic
  async function getRelationships(topic: Topic): Promise<RelatedItemDetails[]> {
    const retval = [] as RelatedItemDetails[];
    if (!currentEntry.value)
      throw new Error('Invalid current entry in relationshipStore.getRelationships()');

    const relatedItems = (EntryFlags.get(currentEntry.value, EntryFlagKey.relationships))[topic];

    // convert the map to an array and add the names
    if (relatedItems) {
      for (const relatedItem of Object.values(relatedItems)) {
        const relatedDocId = foundry.utils.parseUuid(relatedItem.uuid)?.documentId || '';

        if (!relatedDocId)
          throw new Error('Invalid related item in relationshipStore.getRelationships(): ' + relatedItem.uuid);
        
        retval.push({
          ...relatedItem,
          name: JournalEntry.get(relatedDocId)?.name,
        });
      }
    }
   
    return retval;
  }

  // refresh the the related items rows and pagination for the current entry and given topic
  async function refreshRelatedItems(topic: ValidTopic): Promise<void> {
    const pagination = relatedItemPagination[topic];

    if (!currentEntry|| !topic) {
      relatedItemRows[topic] = { rowsAvailable: 0, rows: [], };
      pagination.value = {
        ...pagination.value,
        rowsNumber: 0
      };
      return;
    }

    // get all the related items
    let relatedItems = await getRelationships(topic);
    const relatedItemsAvailable = relatedItems.length;

    // filter the list
    relatedItems = relatedItems.filter((relatedItem) => relatedItem.name.toLowerCase().includes(pagination.value.filter.toLowerCase()));

    // sort the list
    relatedItems = relatedItems.sort((a, b) => {
      if (pagination.value.descending)
        return a.name.localeCompare(b.name);
      else
        return b.name.localeCompare(a.name);
    });

    // paginate the list
    const start = (pagination.value.page - 1) * pagination.value.rowsPerPage;
    const end = pagination.value.page * pagination.value.rowsPerPage;
    relatedItems = relatedItems.slice(start, end);

    relatedItemRows[topic] = {
      rows: relatedItems,
      rowsAvailable: relatedItemsAvailable
    };
    pagination.value = {
      ...pagination.value,
      rowsNumber: relatedItemRows[topic].rowsAvailable
    };
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
    relatedItemRows,
    relatedItemPagination,
    extraFields,

    addRelationship,
    deleteRelationship,
    getRelationships,
    refreshRelatedItems,
  };
});