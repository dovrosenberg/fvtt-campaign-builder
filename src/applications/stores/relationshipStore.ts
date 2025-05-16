// this store handles relationships between entries (not campaigns/sessions)

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from './index';

// types
import { 
  Topics, ValidTopic,
  RelatedItemDetails, FieldDataByTopic,
  RelatedDocumentDetails,
  DocumentLinkType,
} from '@/types';
import { watch } from 'vue';
import { ref } from 'vue';
import { Entry } from '@/classes';

interface SessionReference {
  uuid: string;
  number: number;
  name: string;
  date: string | null;
  campaignName: string;
}

// the store definition
export const useRelationshipStore = defineStore('relationship', () => {
  ///////////////////////////////
  // the state
  const relatedItemRows = ref<RelatedItemDetails<any, any>[]>([]);
  const relatedDocumentRows = ref<RelatedDocumentDetails[]>([]);
  const sessionReferences = ref<SessionReference[]>([]);

  const extraFields = {
    [Topics.Character]: {
      [Topics.Character]: [],
      [Topics.Location]: [{field:'role', header:'Role'}],
      [Topics.Organization]: [{field:'role', header:'Role'}],
    },
    [Topics.Location]: {
      [Topics.Character]: [{field:'role', header:'Role'}],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },
    [Topics.Organization]: {
      [Topics.Character]: [{field:'role', header:'Role'}],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },    
  } as FieldDataByTopic;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentEntry, currentContentTab, currentDocumentType, currentWorld, } = storeToRefs(mainStore);

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

    await mainStore.refreshEntry();
  }

  /**
   * Add a scene to the current entry
   * @param sceneId The id of the scene to add
   */
  async function addScene(sceneId: string): Promise<void> {
    // create the relationship on current entry
    const entry = currentEntry.value;

    if (!entry || !sceneId)
      throw new Error('Invalid entry in relationshipStore.addScene()');

    // update the entry
    if (!entry.scenes.includes(sceneId)) {
      entry.scenes.push(sceneId);
      await entry.save();
    }

    await mainStore.refreshEntry();
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

    await mainStore.refreshEntry();
  }

  /**
   * Remove a scene from the current entry
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

    await mainStore.refreshEntry();
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

    await mainStore.refreshEntry();
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

    await mainStore.refreshEntry();
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

    await mainStore.refreshEntry();
  }

  /**
   * Propagate a field change to all related entries.
   * @param entry The entry whose field has changed
   * @param fields The fields to propagate (can include 'name' or 'type') - single field name or an array
   * @returns A promise that resolves when the field change has been propagated
   */
  type ValidFieldNames = 'name' | 'type';
  async function propagateFieldChange(entry: Entry, fields: ValidFieldNames | ValidFieldNames[]): Promise<void> {
    const fieldsArray = Array.isArray(fields) ? fields : [fields];

    // make sure only valid fields present, etc.
    if (!entry || !entry.relationships || fieldsArray.find(f => !['name', 'type'].includes(f)))
      return;
    
    // relationships are bi-directional, so look at all the relationships for the entry
    // for each one, go to the matching (reverse) relationship on the related item and update the field
    for (const topicRelationships of Object.values(entry.relationships)) {
      for (const relatedEntryId in topicRelationships) {
        const relatedEntry = await Entry.fromUuid(relatedEntryId);
        if (!relatedEntry || !relatedEntry.relationships || !entry.topic)
          continue;

        const relatedRelationship = relatedEntry.relationships[entry.topic][entry.uuid];

        if (!relatedRelationship)
          continue;

        // Update the field
        for (let i=0; i< fieldsArray.length; i++) {
          relatedRelationship[fieldsArray[i]] = entry[fieldsArray[i]];
        }
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
  const findReferencesInNotes = (notes: string, entryUuid: string): boolean => {
    // We could make sure it's in a link format, but really we just need to know if there's a UUID in it
    return notes.includes(entryUuid);
  };

  ///////////////////////////////
  // internal functions
  const _refreshRows = async () => {
    if (!currentEntry.value || !currentContentTab.value) {
      relatedItemRows.value = [];
      relatedDocumentRows.value = [];
      sessionReferences.value = [];
    } else {
      let topic: Topics;
      switch (currentContentTab.value) {
        case 'characters':
          topic = Topics.Character;
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
        case 'sessions':
          topic = Topics.None;
          await _refreshSessionReferences();
          break;
        default:
          topic = Topics.None;
      }

      if (topic !== Topics.None) {
        relatedItemRows.value = currentEntry.value.relationships ? Object.values(currentEntry.value.relationships[topic]) : [];
        relatedDocumentRows.value = [];
      } else if (currentDocumentType.value===DocumentLinkType.Scenes) {
        relatedItemRows.value = [];

        const sceneList = [] as RelatedDocumentDetails[];
        for (let i=0; i<currentEntry.value.scenes.length; i++) {
          const scene = (await fromUuid<Scene>(currentEntry.value.scenes[i]));

          if (!scene)
            continue;
          
          sceneList.push({
            uuid: currentEntry.value.scenes[i],
            name: scene.name,
            packId: scene.pack,
            packName: scene.pack ? game.packs?.get(scene.pack)?.title ?? null : null,
          });
        }
        relatedDocumentRows.value = sceneList;
      } else if (currentDocumentType.value===DocumentLinkType.Actors) {
        relatedItemRows.value = [];

        const actorList = [] as RelatedDocumentDetails[];
        for (let i=0; i<currentEntry.value.actors.length; i++) {
          const actor = await fromUuid<Actor>(currentEntry.value.actors[i]);
          if (!actor)
            continue;

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

  const _refreshSessionReferences = async () => {
    if (!currentEntry.value || !currentWorld.value) {
      sessionReferences.value = [];
      return;
    }

    const references: SessionReference[] = [];
    const campaigns = Object.values(currentWorld.value.campaigns);

    // Go through all campaigns in the world
    for (const campaign of campaigns) {
      // Get all sessions in the campaign
      const sessions = campaign.filterSessions(() => true);

      for (const session of sessions) {
        let isReferenced = false;

        // Check if entry is referenced as delivered content
        if (currentEntry.value.topic === Topics.Character) {
          const npcRef = session.npcs.find(npc => npc.uuid === currentEntry.value?.uuid);
          if (npcRef) {
            isReferenced = true;
          }
        } else if (currentEntry.value.topic === Topics.Location) {
          const locationRef = session.locations.find(loc => loc.uuid === currentEntry.value?.uuid);
          if (locationRef) {
            isReferenced = true;
          }
        }

        // Check if entry is referenced in notes
        if (!isReferenced && findReferencesInNotes(session.notes, currentEntry.value.uuid)) {
          isReferenced = true;
        }

        if (isReferenced) {
          references.push({
            uuid: session.uuid,
            number: session.number,
            name: session.name,
            date: session.date?.toLocaleDateString() || null,
            campaignName: campaign.name
          });
        }
      }
    }

    // Sort by session number
    references.sort((a, b) => a.number - b.number);
    sessionReferences.value = references;
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

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
    sessionReferences,

    addRelationship,
    deleteRelationship,
    editRelationship,
    getRelationships,
    propagateFieldChange,
    addScene,
    addActor,
    deleteScene,
    deleteActor,
  };
});