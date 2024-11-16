// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore } from './mainStore';

// types
import { 
  Topic, ValidTopic,
  RelatedItemDetails, FieldDataByTopic,
  TablePagination,
} from '@/types';
import { reactive, Ref, toRaw, watch } from 'vue';
import { ref } from 'vue';
import { updateEntry } from '@/compendia';
import { Entry } from '@/documents';

// the store definition
export const useRelationshipStore = defineStore('relationship', () => {
  ///////////////////////////////
  // the state
  const relatedItemRows = ref<RelatedItemDetails<any, any>[]>([]);

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
  const { currentEntry, currentWorldCompendium, currentTopicTab } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  /**
   * Add a relationship to the current entry
   * @param relatedItemTopic The topic of the other entry
   * @param relatedEntry The other entry id
   * @param extraFields Extra fields to save with the relationship
   * @returns whether the relationship was successfully added
   */
  async function addRelationship(relatedEntry: Entry, extraFields: Record<string, string>): Promise<boolean> {
    // create the relationship on current entry
    const entry = currentEntry.value;

    if (!entry || !relatedEntry)
      throw new Error('Invalid entry in relationshipStore.addRelationship()');
    if (!entry.system.relationships || !relatedEntry.system.relationships || !entry.system.topic || !relatedEntry.system.topic)
      throw new Error('Missing system variable in relationshipStore.addRelationship()');

    const entryTopic = entry.system.topic;
    const relatedEntryTopic = relatedEntry.system.topic;

    // create the relationship items
    const relatedItem1 = {
      uuid: relatedEntry.uuid,
      name: relatedEntry.name,
      topic: relatedEntry.system.topic,
      type: relatedEntry.system.type || '',
      extraFields: extraFields,
    };
    const relatedItem2 = {
      uuid: entry.uuid,
      name: entry.name,
      topic: entry.system.topic,
      type: entry.system.type || '',
      extraFields: extraFields,
    };

    // update the entries
    const entryRelationships = foundry.utils.deepClone(entry.system.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.system.relationships);

    if (!entryRelationships[relatedEntryTopic]) {
      entryRelationships[relatedEntryTopic] = {
        [relatedEntry.uuid]: relatedItem1
      };
    } else {
      entryRelationships[relatedEntryTopic][relatedEntry.uuid] = relatedItem1;
    }
    if (!relatedEntryRelationships[entryTopic]) {
      relatedEntryRelationships[entryTopic] = {
        [entry.uuid]: relatedItem2
      };
    } else {
      relatedEntryRelationships[entryTopic][entry.uuid] = relatedItem2;
    }

    await updateEntry(currentWorldCompendium.value, toRaw(entry), { system: { relationships: entryRelationships }});
    await updateEntry(currentWorldCompendium.value, toRaw(relatedEntry), { system: {relationships: relatedEntryRelationships }});

    mainStore.refreshEntry();

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

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _refreshRows = () => {
    if (!currentEntry.value || !currentTopicTab.value) {
      relatedItemRows.value = [];
    } else {
      let topic: Topic;
      switch (currentTopicTab.value) {
        case 'characters':
          topic = Topic.Character;
          break;
        case 'events':
          topic = Topic.Event;
          break;
        case 'locations':
          topic = Topic.Location;
          break;
        case 'organizations':
          topic = Topic.Organization;
          break;
        default:
          topic = Topic.None;
      }

      relatedItemRows.value = currentEntry.value.system.relationships && topic!==Topic.None ? Object.values(currentEntry.value.system.relationships[topic]) || []: [];
    }
  };

  ///////////////////////////////
  // watchers
  watch(()=> currentEntry.value, () => {
    _refreshRows();
  });

  watch(()=> currentTopicTab.value, () => {
    _refreshRows();
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    relatedItemRows,
    extraFields,

    addRelationship,
    deleteRelationship,
    getRelationships,
  };
});