// this store handles relationships between entries (not campaigns/sessions)

// library imports
import { storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from '@/applications/stores';

// types
import {
  Topics, ValidTopic,
  RelatedEntryDetails, ColumnsByTopic,
} from '@/types';
import { Entry } from '@/classes';

// the store definition
export const relationshipStore = () => {
  // note that the field attribute becomes the key in the storage
  //    and that key is used as part of the search index, so they should
  //    be meaningful words/phrases
  const extraFields = {
    [Topics.Character]: {
      [Topics.Character]: [{field:'relationship', header:'Relationship'}],
      [Topics.Location]: [{field:'relationship', header:'Relationship'}],
      [Topics.Organization]: [{field:'relationship', header:'Relationship'}],
      [Topics.PC]: [{field:'relationship', header:'Relationship'}],
    },
    [Topics.Location]: {
      [Topics.Character]: [{field:'relationship', header:'Relationship'}],
      [Topics.Location]: [{field:'relationship', header:'Relationship'}],
      [Topics.Organization]: [],
      [Topics.PC]: [{field:'relationship', header:'Relationship'}],
    },
    [Topics.Organization]: {
      [Topics.Character]: [{field:'relationship', header:'Relationship'}],
      [Topics.Location]: [],
      [Topics.Organization]: [{field:'relationship', header:'Relationship'}],
      [Topics.PC]: [{field:'relationship', header:'Relationship'}],
    },
    [Topics.PC]: {
      [Topics.Character]: [{field:'relationship', header:'Relationship'}],
      [Topics.Location]: [{field:'relationship', header:'Relationship'}],
      [Topics.Organization]: [{field:'relationship', header:'Relationship'}],
      [Topics.PC]: [],
    },
  } as ColumnsByTopic;

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentEntry, currentSetting, currentEntryTopic, } = storeToRefs(mainStore);

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

    // Use addArbitraryRelationship to handle the actual relationship creation
    await addArbitraryRelationship(entry.uuid, relatedEntry.uuid, extraFields);

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
   * Add an arbitrary Foundry document to the current entry
   * @param uuid The uuid of the document to add
   */
  async function addFoundryDocument(uuid: string): Promise<void> {
    // create the relationship on current entry
    const entry = currentEntry.value;

    if (!entry || !uuid)
      throw new Error('Invalid entry in relationshipStore.addFoundryDocument()');

    // update the entry
    if (!entry.foundryDocuments.includes(uuid)) {
      entry.foundryDocuments.push(uuid);
      await entry.save();
    }

    await mainStore.refreshEntry();
  }

  /**
   * Remove a foundry document from the current entry
   * @param uuid The uuid of the foundry document to remove
   */
  async function deleteFoundryDocument(uuid: string): Promise<void> {
    // edit the current entry
    const entry = currentEntry.value;

    if (!entry || !uuid)
      throw new Error('Invalid entry in relationshipStore.deleteFoundryDocument()');

    // update the entry
    if (entry.foundryDocuments.includes(uuid)) {
      entry.foundryDocuments.splice(entry.foundryDocuments.indexOf(uuid), 1);
      await entry.save();
    }
    await entry.save();

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

  /** remove a relationship to the current entry */
  async function deleteRelationship(relatedId: string): Promise<void> {
    if (!currentEntry.value)
      throw new Error('Invalid entry in relationshipStore.deleteRelationship()');

    await deleteArbitraryRelationship(currentEntry.value.uuid, relatedId);

    await mainStore.refreshEntry();
  }

  // used to delete the relationship between two entries
  async function deleteArbitraryRelationship(entry1Uuid: string, entry2Uuid: string): Promise<void> {
    const entry = await Entry.fromUuid(entry1Uuid);
    if (!entry)
      throw new Error('Invalid entry1 in relationshipStore.deleteRelationship()');

    const relatedEntry = await Entry.fromUuid(entry2Uuid);
    if (!relatedEntry)
      throw new Error('Invalid entry2 in relationshipStore.deleteRelationship()');

    const entryTopic = entry.topic;
    const relatedEntryTopic = relatedEntry.topic;

    if (!entryTopic || !relatedEntryTopic)
      throw new Error('Missing topic in relationshipStore.deleteRelationship()');

    // update the entries
    const entryRelationships = foundry.utils.deepClone(entry.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.relationships);

    if (entryRelationships && entryRelationships[relatedEntryTopic] && entryRelationships[relatedEntryTopic][relatedEntry.uuid]) {
      delete entryRelationships[relatedEntryTopic][relatedEntry.uuid];

      entry.relationships = entryRelationships;
      await entry.save();
    }
    if (relatedEntryRelationships && relatedEntryRelationships[entryTopic] && relatedEntryRelationships[entryTopic][entry.uuid]) {
      delete relatedEntryRelationships[entryTopic][entry.uuid];

      relatedEntry.relationships = relatedEntryRelationships;
      await relatedEntry.save();
    }
  }

  // used to add a relationship between two entries
  async function addArbitraryRelationship(entry1Uuid: string, entry2Uuid: string, extraFields: Record<string, string>): Promise<void> {
    const entry = await Entry.fromUuid(entry1Uuid);
    if (!entry)
      throw new Error('Invalid entry1 in relationshipStore.addArbitraryRelationship()');

    const relatedEntry = await Entry.fromUuid(entry2Uuid);
    if (!relatedEntry)
      throw new Error('Invalid entry2 in relationshipStore.addArbitraryRelationship()');

    const entryTopic = entry.topic;
    const relatedEntryTopic = relatedEntry.topic;

    if (!entryTopic || !relatedEntryTopic)
      throw new Error('Missing topic in relationshipStore.addArbitraryRelationship()');

    // create the relationship items
    const relatedEntry1 = {
      uuid: relatedEntry.uuid,
      name: relatedEntry.name,
      topic: relatedEntry.topic,
      type: relatedEntry.type || '',
      extraFields: extraFields,
    };
    const relatedEntry2 = {
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
        [relatedEntry.uuid]: relatedEntry1
      };
    } else {
      entryRelationships[relatedEntryTopic][relatedEntry.uuid] = relatedEntry1;
    }
    if (!relatedEntryRelationships[entryTopic]) {
      relatedEntryRelationships[entryTopic] = {
        [entry.uuid]: relatedEntry2
      };
    } else {
      relatedEntryRelationships[entryTopic][entry.uuid] = relatedEntry2;
    }

    entry.relationships = entryRelationships;
    await entry.save();
    relatedEntry.relationships = relatedEntryRelationships;
    await relatedEntry.save();
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

        const relatedEntryRelationships = relatedEntry.relationships;

        if (!relatedEntryRelationships[entry.topic]![entry.uuid])
          continue;

        // Update the field
        for (let i=0; i< fieldsArray.length; i++) {
          relatedEntryRelationships[entry.topic]![entry.uuid][fieldsArray[i]] = entry[fieldsArray[i]];
        }

        // Reassign the cloned relationships back to the entry
        relatedEntry.relationships = relatedEntryRelationships;
        await relatedEntry.save();
      }
    }
  }

  // return all of the related items to this one for a given topic
  async function getRelationships<PrimaryTopic extends ValidTopic, RelatedTopic extends ValidTopic>(topic: RelatedTopic):
      Promise<RelatedEntryDetails<PrimaryTopic, RelatedTopic>[]> {
    const retval = [] as RelatedEntryDetails<PrimaryTopic, RelatedTopic>[];

    if (!currentEntry.value)
      throw new Error('Invalid current entry in relationshipStore.getRelationships()');

    const relatedEntries = (currentEntry.value.relationships ? currentEntry.value.relationships[topic] || {} : {}) as Record<string, RelatedEntryDetails<PrimaryTopic, RelatedTopic>>;

    // convert the map to an array and add the names
    for (const relatedEntry of Object.values(relatedEntries)) {
      if (relatedEntry)
        retval.push(relatedEntry as RelatedEntryDetails<PrimaryTopic, RelatedTopic>);
    }

    return retval;
  }

  ///////////////////////////////
  // return the public interface
  return {
    extraFields,

    addRelationship,
    deleteRelationship,
    deleteArbitraryRelationship,
    addArbitraryRelationship,
    editRelationship,
    getRelationships,
    propagateFieldChange,
    addScene,
    addActor,
    deleteScene,
    deleteActor,
    addFoundryDocument,
    deleteFoundryDocument,
  };
};
