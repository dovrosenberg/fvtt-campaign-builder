// this store handles relationships between entries (not campaigns/sessions)

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from './index';

// types
import { 
  Topics, ValidTopic,
  RelatedItemDetails, FieldDataByTopic,
  TablePagination,
  RelatedDocumentDetails,
  DocumentLinkType,
} from '@/types';
import { reactive, Ref, watch } from 'vue';
import { ref } from 'vue';
import { Entry } from '@/classes';

// the store definition
export const useRelationshipStore = defineStore('relationship', () => {
  ///////////////////////////////
  // the state
  const relatedItemRows = ref<RelatedItemDetails<any, any>[]>([]);
  const relatedDocumentRows = ref<RelatedDocumentDetails[]>([]);

  // we store the pagination info for each type like a preference
  const defaultPagination: TablePagination = {
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 0,
    rowsPerPage: 10, 
    filters: {},
  };

  const extraFields = {
    [Topics.Character]: {
      [Topics.Character]: [],
      [Topics.Event]: [],
      [Topics.Location]: [{field:'role', header:'Role'}],
      [Topics.Organization]: [{field:'role', header:'Role'}],
    },
    [Topics.Event]: {
      [Topics.Character]: [],
      [Topics.Event]: [],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },
    [Topics.Location]: {
      [Topics.Character]: [{field:'role', header:'Role'}],
      [Topics.Event]: [],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },
    [Topics.Organization]: {
      [Topics.Character]: [{field:'role', header:'Role'}],
      [Topics.Event]: [],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },    
  } as FieldDataByTopic;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentEntry, currentContentTab, currentDocumentTab } = storeToRefs(mainStore);

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
    if (!entry.relationships || !relatedEntry.relationships || !entry.topic || !relatedEntry.topic)
      throw new Error('Missing system variable in relationshipStore.addRelationship()');

    const entryTopic = entry.topic;
    const relatedEntryTopic = relatedEntry.topic;

    // create the relationship items
    const relatedItem1 = {
      uuid: relatedEntry.uuid,
      name: relatedEntry.name,
      topic: relatedEntry.topic,
      type: relatedEntry.type || '',
      extraFields: extraFields,
    };
    const relatedItem2 = {
      uuid: entry.uuid,
      name: entry.name,
      topic: entry.topic,
      type: entry.type || '',
      extraFields: extraFields,
    };

    // update the entries
    const entryRelationships = foundry.utils.deepClone(entry.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.relationships);

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

    entry.relationships = entryRelationships;
    await entry.save();
    relatedEntry.relationships = relatedEntryRelationships;
    await relatedEntry.save();

    mainStore.refreshEntry();
  }

  /**
   * Add a scene to the current entry
   * @param sceneId The id of the scene to add
   */
  async function addScene(sceneId: string): Promise<void> {
    // create the relationship on current entry
    const entry = currentEntry.value;

    if (!entry || !sceneId)
      throw new Error('Invalid entry in relationshipStore.addSceme()');

    // update the entry
    if (!entry.scenes.includes(sceneId)) {
      entry.scenes.push(sceneId);
      await entry.save();
    }

    mainStore.refreshEntry();
  }

  /**
   * Add a actor to the current entry
   * @param actorId The id of the actor to add
   */
  async function addActor(actorId: string): Promise<void> {
    // create the relationship on current entry
    const entry = currentEntry.value;

    if (!entry || !actorId)
      throw new Error('Invalid entry in relationshipStore.addActor()');

    // update the entry
    if (!entry.actors.includes(actorId)) {
      entry.actors.push(actorId);
      await entry.save();
    }

    mainStore.refreshEntry();
  }

  /**
   * Removea scene from the current entry
   * @param sceneId The id of the scene to remove
   */
  async function deleteScene(sceneId: string): Promise<void> {
    // edit the current entry
    const entry = currentEntry.value;

    if (!entry || !sceneId)
      throw new Error('Invalid entry in relationshipStore.deleteScene()');

    // update the entry
    if (entry.scenes.includes(sceneId)) {
      entry.scenes.splice(entry.scenes.indexOf(sceneId), 1);
      await entry.save();
    }

    mainStore.refreshEntry();
  }

  /**
   * Remove a actor from the current entry
   * @param actorId The id of the actor to remove
   */
  async function deleteActor(actorId: string): Promise<void> {
    // edit the current entry
    const entry = currentEntry.value;

    if (!entry || !actorId)
      throw new Error('Invalid entry in relationshipStore.deleteScene()');

    // update the entry
    if (entry.actors.includes(actorId)) {
      entry.actors.splice(entry.actors.indexOf(actorId), 1);
      await entry.save();
    }

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
    const relatedEntry = await Entry.fromUuid(relatedEntryId); 

    if (!entry || !relatedEntry)
      throw new Error('Invalid entry in relationshipStore.addRelationship()');
    if (!entry.relationships || !entry.topic || !relatedEntry.relationships || !relatedEntry.topic)
      throw new Error('Missing system variable in relationshipStore.addRelationship()');

    const entryTopic = entry.topic;
    const relatedEntryTopic = relatedEntry.topic;

    // update the entries
    const entryRelationships = foundry.utils.deepClone(entry.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.relationships);

    if (entryRelationships[relatedEntryTopic] && entryRelationships[relatedEntryTopic][relatedEntryId]) {
      // update the current entry's relationships
      entryRelationships[relatedEntryTopic][relatedEntryId] = {
        ...entryRelationships[relatedEntryTopic][relatedEntryId],
        extraFields: extraFields
      };
      entry.relationships = entryRelationships;
      await entry.save();
    }
    if (relatedEntryRelationships[entryTopic] && relatedEntryRelationships[entryTopic][entry.uuid]) {
      // update the related entry's relationships
      relatedEntryRelationships[entryTopic][entry.uuid] = {
        ...relatedEntryRelationships[entryTopic][entry.uuid],
        extraFields: extraFields
      };
      relatedEntry.relationships = relatedEntryRelationships;
      await relatedEntry.save();
    }

    mainStore.refreshEntry();
  }

  // remove a relationship to the current entry
  async function deleteRelationship(relatedItemTopic: Topics, relatedItemId: string): Promise<void> {
    if (!currentEntry.value)
      throw new Error('Invalid entry in relationshipStore.deleteRelationship()');

    const entry = currentEntry.value;
    const relatedEntry = await Entry.fromUuid(relatedItemId); 
    if (!relatedEntry)
      throw new Error('Invalid entry in relationshipStore.deleteRelationship()');

    const entryTopic = entry.topic;
    const relatedEntryTopic = relatedEntry.topic;

    if (!entryTopic || !relatedEntryTopic)
      throw new Error('Missing topic in relationshipStore.deleteRelationship()');

    // update the entries
    const entryRelationships = foundry.utils.deepClone(currentEntry.value.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.relationships);

    if (entryRelationships && entryRelationships[relatedEntryTopic] && entryRelationships[relatedEntryTopic][relatedEntry.uuid]) {
      delete entryRelationships[relatedItemTopic][relatedEntry.uuid];

      // @ts-ignore - foundry code to delete the key
      entryRelationships[relatedItemTopic][`-=${relatedItemId}`] = null;
      entry.relationships = entryRelationships;
      await entry.save();

      // clean out the entry that tells foundry to delete the key
      delete entryRelationships[relatedItemTopic][`-=${relatedItemId}`];
    }
    if (relatedEntryRelationships && relatedEntryRelationships[entryTopic] && relatedEntryRelationships[entryTopic][entry.uuid]) {
      delete relatedEntryRelationships[entryTopic][entry.uuid];

      // @ts-ignore - foundry code to delete the key
      relatedEntryRelationships[entryTopic][`-=${entry.uuid}`] = null;
      relatedEntry.relationships = relatedEntryRelationships;
      await relatedEntry.save();

      // clean out the entry that tells foundry to delete the key
      delete relatedEntryRelationships[entryTopic][`-=${entry.uuid}`];
    }

    mainStore.refreshEntry();
  }

  /**
   * Propogate a name change to all related entries.  
   * @param entryId The id of the entry whose name has changed
   * @param newName The new name
   * @returns A promise that resolves when the name change has been propogated
   */
  async function propogateNameChange(entry: Entry): Promise<void> {
    // relationships are bi-directional, so look at all the relationships for the entry    
    if (!entry || !entry.relationships)
      return;

    // for each one, go to the matching (reverse) relationship on the related item and update the name
    for (const topicRelationships of Object.values(entry.relationships)) {
      for (const relatedEntryId in topicRelationships) {
        const relatedEntry = await Entry.fromUuid(relatedEntryId);
        if (!relatedEntry || !relatedEntry.relationships || !entry.topic)
          continue;

        const relatedRelationship = relatedEntry.relationships[entry.topic][entry.uuid];

        if (!relatedRelationship)
          continue;

        relatedRelationship.name = entry.name;
        await relatedEntry.save();
      }
    }
  }
  
  // return all of the related items to this one for a given topic
  async function getRelationships<PrimaryTopic extends ValidTopic, RelatedTopic extends ValidTopic>(topic: RelatedTopic): 
      Promise<RelatedItemDetails<PrimaryTopic, RelatedTopic>[]> {
    const retval = [] as RelatedItemDetails<PrimaryTopic, RelatedTopic>[];

    if (!currentEntry.value)
      throw new Error('Invalid current entry in relationshipStore.getRelationships()');

    const relatedItems = (currentEntry.value.relationships ? currentEntry.value.relationships[topic] || {} : {}) as Record<string, RelatedItemDetails<PrimaryTopic, RelatedTopic>>;

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
  const _refreshRows = async () => {
    if (!currentEntry.value || !currentContentTab.value) {
      relatedItemRows.value = [];
      relatedDocumentRows.value = [];
    } else {
      let topic: Topics;
      switch (currentContentTab.value) {
        case 'characters':
          topic = Topics.Character;
          break;
        case 'events':
          topic = Topics.Event;
          break;
        case 'locations':
          topic = Topics.Location;
          break;
        case 'organizations':
          topic = Topics.Organization;
          break;
        case 'scenes':
          topic = Topics.None;
          break;
        case 'actors':
          topic = Topics.None;
          break;
        default:
          topic = Topics.None;
      }

      if (topic !== Topics.None) {
        relatedItemRows.value = currentEntry.value.relationships ? Object.values(currentEntry.value.relationships[topic]) : [];
        relatedDocumentRows.value = [];
      } else if (currentDocumentTab.value===DocumentLinkType.Scenes) {
        relatedItemRows.value = [];

        const sceneList = [] as RelatedDocumentDetails[];
        for (let i=0; i<currentEntry.value.scenes.length; i++) {
          const scene = (await fromUuid(currentEntry.value.scenes[i])) as Scene;
          sceneList.push({
            uuid: currentEntry.value.scenes[i],
            name: scene.name,
            packId: scene.pack,
            packName: scene.pack ? game.packs?.get(scene.pack)?.title ?? null : null,
          });
        }
        relatedDocumentRows.value = sceneList;
      } else if (currentDocumentTab.value===DocumentLinkType.Actors) {
        relatedItemRows.value = [];

        const actorList = [] as RelatedDocumentDetails[];
        for (let i=0; i<currentEntry.value.actors.length; i++) {
          const actor = (await fromUuid(currentEntry.value.actors[i])) as Actor;
          actorList.push({
            uuid: currentEntry.value.actors[i],
            name: actor.name,
            packId: actor.pack,
            packName: actor.pack ? game.packs?.get(actor.pack)?.title ?? null : null,
          });
        }
        relatedDocumentRows.value = actorList;
      } else {
        relatedItemRows.value = [];
        relatedDocumentRows.value = [];
      }
    }
  };

  ///////////////////////////////
  // watchers
  watch(()=> currentEntry.value, async () => {
    await _refreshRows();
  });

  watch(()=> currentContentTab.value, async () => {
    await _refreshRows();
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    relatedItemRows,
    relatedDocumentRows,
    extraFields,

    addRelationship,
    deleteRelationship,
    editRelationship,
    getRelationships,
    propogateNameChange,
    addScene,
    addActor,
    deleteScene,
    deleteActor,
  };
});