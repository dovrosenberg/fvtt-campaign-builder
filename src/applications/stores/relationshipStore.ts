// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, useCurrentEntryStore } from './index';

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
  const entryStore = useCurrentEntryStore();
  const { currentEntry, currentWorldCompendium, } = storeToRefs(mainStore);
  const { currentTopicTab } = storeToRefs(entryStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  /**
   * Add a relationship to the current entry
   * @param relatedEntry The other entry
   * @param extraFields Extra fields to save with the relationship
   * @returns whether the relationship was successfully added
   */
  async function addRelationship(relatedEntry: Entry, extraFields: Record<string, string>): Promise<void> {
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
  }

  /**
   * Edit a relationship to the current entry - specifically the extra fields
   * @param relatedEntryId The other entry id
   * @param extraFields Extra fields to save with the relationship
   * @returns whether the relationship was successfully added
   */
  async function editRelationship(relatedEntryId: string, extraFields: Record<string, string>): Promise<void> {
    // create the relationship on current entry
    const entry = currentEntry.value;
    const relatedEntry = await fromUuid(relatedEntryId) as Entry;

    if (!entry || !relatedEntry)
      throw new Error('Invalid entry in relationshipStore.addRelationship()');
    if (!entry.system.relationships || !entry.system.topic || !relatedEntry.system.relationships || !relatedEntry.system.topic)
      throw new Error('Missing system variable in relationshipStore.addRelationship()');

    const entryTopic = entry.system.topic;
    const relatedEntryTopic = relatedEntry.system.topic;

    // update the entries
    const entryRelationships = foundry.utils.deepClone(entry.system.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.system.relationships);

    if (entryRelationships[relatedEntryTopic] && entryRelationships[relatedEntryTopic][relatedEntryId]) {
      // update the current entry's relationships
      entryRelationships[relatedEntryTopic][relatedEntryId] = {
        ...entryRelationships[relatedEntryTopic][relatedEntryId],
        extraFields: extraFields
      };
      await updateEntry(currentWorldCompendium.value, toRaw(entry), { system: { relationships: entryRelationships }});
    }
    if (relatedEntryRelationships[entryTopic] && relatedEntryRelationships[entryTopic][entry.uuid]) {
      // update the related entry's relationships
      relatedEntryRelationships[entryTopic][entry.uuid] = {
        ...relatedEntryRelationships[entryTopic][entry.uuid],
        extraFields: extraFields
      };
      await updateEntry(currentWorldCompendium.value, toRaw(relatedEntry), { system: {relationships: relatedEntryRelationships }});
    }

    mainStore.refreshEntry();
  }

  // remove a relationship to the current entry
  async function deleteRelationship(relatedItemTopic: Topic, relatedItemId: string): Promise<void> {
    if (!currentEntry.value)
      throw new Error('Invalid entry in relationshipStore.deleteRelationship()');

    const entry = currentEntry.value;
    const relatedEntry = await fromUuid(relatedItemId) as Entry;

    const entryTopic = entry.system.topic;
    const relatedEntryTopic = relatedEntry.system.topic;

    if (!entryTopic || !relatedEntryTopic)
      throw new Error('Missing topic in relationshipStore.deleteRelationship()');

    // update the entries
    const entryRelationships = foundry.utils.deepClone(currentEntry.value.system.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.system.relationships);

    if (entryRelationships && entryRelationships[relatedEntryTopic] && entryRelationships[relatedEntryTopic][relatedEntry.uuid]) {
      delete entryRelationships[relatedItemTopic][relatedEntry.uuid];

      // @ts-ignore - foundry code to delete the key
      entryRelationships[relatedItemTopic][`-=${relatedItemId}`] = null;
      await updateEntry(currentWorldCompendium.value, toRaw(entry), { system: {relationships: entryRelationships }});

      // clean out the entry that tells foundry to delete the key
      delete entryRelationships[relatedItemTopic][`-=${relatedItemId}`];
    }
    if (relatedEntryRelationships && relatedEntryRelationships[entryTopic] && relatedEntryRelationships[entryTopic][entry.uuid]) {
      delete relatedEntryRelationships[entryTopic][entry.uuid];

      // @ts-ignore - foundry code to delete the key
      relatedEntryRelationships[entryTopic][`-=${entry.uuid}`] = null;
      await updateEntry(currentWorldCompendium.value, toRaw(relatedEntry), { system: {relationships: relatedEntryRelationships }});

      // clean out the entry that tells foundry to delete the key
      delete relatedEntryRelationships[entryTopic][`-=${entry.uuid}`];
    }

    mainStore.refreshEntry();
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
    editRelationship,
    getRelationships,
  };
});