// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore } from './mainStore';

// types
import { 
  Topic, TablePagination, AnyPaginationResult, CharacterRow, EventRow, LocationRow, OrganizationRow, ValidTopic,
  RelatedItemDetails, FieldDataByTopic,
} from '@/types';
import { reactive, Ref } from 'vue';
import { ref } from 'vue';
import { updateEntry } from '@/compendia';
import { Entry } from '@/documents';

// the store definition
export const useRelationshipStore = defineStore('relationship', () => {
  ///////////////////////////////
  // the state
  const relatedItemRows = reactive({
    [Topic.Character]: { rowsAvailable:0, rows:[] as CharacterRow[]},
    [Topic.Event]: { rowsAvailable:0, rows:[] as EventRow[]},
    [Topic.Location]: { rowsAvailable:0, rows:[] as LocationRow[]},
    [Topic.Organization]: { rowsAvailable:0, rows:[] as OrganizationRow[]},
  } as Record<ValidTopic, AnyPaginationResult>);

  // we store the pagination info for each type like a preference
  const defaultPagination: TablePagination = {
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 0,
    rowsPerPage: 10, 
    totalRecords: undefined, 
    filters: {},
  };

  const relatedItemPagination = reactive({
    [Topic.Character]: ref<TablePagination>(defaultPagination),
    [Topic.Event]: ref<TablePagination>(defaultPagination),
    [Topic.Location]: ref<TablePagination>(defaultPagination),
    [Topic.Organization]: ref<TablePagination>(defaultPagination),
  } as Record<ValidTopic, Ref<TablePagination>>);

  const extraFields = {
    [Topic.Character]: {
      [Topic.Character]: [],
      [Topic.Event]: [],
      [Topic.Location]: [{field:'role', header:'Role'}],
      [Topic.Organization]: [{field:'role', header:'Role'}],
    },
    [Topic.Event]: {
      [Topic.Character]: [],
      [Topic.Event]: [],
      [Topic.Location]: [],
      [Topic.Organization]: [],
    },
    [Topic.Location]: {
      [Topic.Character]: [{field:'role', header:'Role'}],
      [Topic.Event]: [],
      [Topic.Location]: [],
      [Topic.Organization]: [],
    },
    [Topic.Organization]: {
      [Topic.Character]: [{field:'role', header:'Role'}],
      [Topic.Event]: [],
      [Topic.Location]: [],
      [Topic.Organization]: [],
    },    
  } as FieldDataByTopic;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentEntry, currentEntryTopic, currentWorldCompendium } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  /**
   * Add a relationship to the current entry
   * @param relatedItemTopic The topic of the other entry
   * @param relatedItem The other entry id
   * @param extraFields Extra fields to save with the relationship
   * @returns whether the relationship was successfully added
   */
  async function addRelationship(relatedItem: string, extraFields: Record<string, string>): Promise<boolean> {
    // create the relationship on current entry
    const entry1 = currentEntry.value;
    const entry2 = await fromUuid(relatedItem) as Entry;

    if (!entry1 || !entry2)
      throw new Error('Invalid entry in relationshipStore.addRelationship()');

    // create the relationship items
    const relatedItem1 = {
      uuid: relatedItem,
      name: entry2.name,
      topic: entry2.system.topic,
      type: entry2.system.type,
      extraFields: extraFields,
    };
    const relatedItem2 = {
      uuid: entry1.uuid,
      name: entry1.name,
      topic: entry1.system.topic,
      type: entry1.system.type,
      extraFields: extraFields,
    };

    // update the entries
    if (!entry1.system.relationships[relatedItemTopic]) {
      entry1.system.relationships[relatedItemTopic] = {
        [relatedItem]: relatedItem2
      };
    } else {
      entry1.system.relationships[entry2.system.topic][relatedItem] = relatedItem2;
    }
    if (!entry2.system.relationships[entry1Topic]) {
      entry2.system.relationships[entry1Topic] = {
        [entry1.uuid]: relatedItem1
      };
    } else {
      entry2.system.relationships[entry1.system.topic][entry1.uuid] = relatedItem1;
    }

    await updateEntry(currentWorldCompendium.value, entry1, entry1);
    await updateEntry(currentWorldCompendium.value, entry2, entry2);

    return true;
  }

  // remove a relationship to the current entry
  async function deleteRelationship(relatedItemTopic: Topic, relatedItemId: string): Promise<void> {
    if (!currentEntry.value)
      throw new Error('Invalid entry in relationshipStore.deleteRelationship()');

    const relatedEntry = await fromUuid(relatedItemId) as Entry;

    // update the entries
    await updateEntry(currentWorldCompendium.value, currentEntry.value, {
      [`system.relationships.${relatedItemTopic}`]: { [`-=${relatedItemId}`]: null }
    });
    await updateEntry(currentWorldCompendium.value, relatedEntry, {
      [`system.relationships.${currentEntry.value.system.topic}`]: { [`-=${currentEntry.value.uuid}`]: null }
    });
  }

  // return all of the related items to this one for a given topic
  async function getRelationships<PrimaryTopic extends ValidTopic, RelatedTopic extends ValidTopic>(topic: RelatedTopic): 
      Promise<RelatedItemDetails<PrimaryTopic, RelatedTopic>[]> {
    const retval = [] as RelatedItemDetails<PrimaryTopic, RelatedTopic>[];

    if (!currentEntry.value)
      throw new Error('Invalid current entry in relationshipStore.getRelationships()');

    const relatedItems = (currentEntry.value.system.relationships ? currentEntry.value.system.relationships[topic] || {} : {}) as Record<string, RelatedItemDetails<PrimaryTopic, RelatedTopic>>;

    // convert the map to an array and add the names
    for (const relatedItem of Object.values(relatedItems)) {
      if (relatedItem)
        retval.push(relatedItem as RelatedItemDetails<PrimaryTopic, RelatedTopic>);
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
        // negative means a comes before b so we want to return negative if localeCompare does and sortOrder is ascending (1) (or positive/negative)
        //    or positive in the opposite cases (both positive, both negative)
        return a[pagination.sortField].localeCompare(b[pagination.sortField]) * (pagination.sortOrder as number);
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