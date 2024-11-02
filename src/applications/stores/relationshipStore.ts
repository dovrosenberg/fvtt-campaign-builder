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

  // we store the pagination info for each type like a preference
  const defaultPagination: TablePagination = {
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    rowsPerPage: 10, 
    totalRecords: undefined, 
    filters: {},
  };

  const relatedItemPagination = reactive({
    [ValidTopic.Character]: ref<TablePagination>(defaultPagination),
    [ValidTopic.Event]: ref<TablePagination>(defaultPagination),
    [ValidTopic.Location]: ref<TablePagination>(defaultPagination),
    [ValidTopic.Organization]: ref<TablePagination>(defaultPagination),
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
  async function getRelationships(topic: ValidTopic): Promise<RelatedItemDetails[]> {
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
          name: JournalEntry.get(relatedDocId, {})?.name,
        });
      }
    }
   
    return retval;
  }

  // refresh the the related items rows and pagination for the current entry and given topic
  async function refreshRelatedItems(topic: ValidTopic): Promise<void> {
    // get current pagination state
    const pagination = relatedItemPagination[topic];

    if (!currentEntry|| !topic) {
      relatedItemRows[topic] = { rowsAvailable: 0, rows: [], };
      relatedItemPagination[topic] = {
        ...pagination,
        totalRecords: 0
      };
      return;
    }

    // get all the related items
    let relatedItems = await getRelationships(topic);
    const relatedItemsAvailable = relatedItems.length;

    // filter the list
    for (const key in Object.keys(pagination.filters)) {
      relatedItems = relatedItems.filter((relatedItem) => relatedItem[key].toLowerCase().includes(pagination.filters[key].toLowerCase()));
    }

    // sort the list
    if (pagination.sortField && pagination.sortOrder) {
      relatedItems = relatedItems.sort((a, b) => {
        if (pagination.sortOrder > 1)
          return a[pagination.sortField].localeCompare(b[pagination.sortField]);
        else
          return b[pagination.sortField].localeCompare(a[pagination.sortField]);
      });
    }

    // paginate the list
    const start = (pagination.page - 1) * pagination.rowsPerPage;
    const end = pagination.page * pagination.rowsPerPage;
    relatedItems = relatedItems.slice(start, end);

    relatedItemRows[topic] = {
      rows: relatedItems,
      rowsAvailable: relatedItemsAvailable
    };
    relatedItemPagination[topic] = {
      ...pagination,
      first: start,
      totalRecords: relatedItemRows[topic].rowsAvailable,
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