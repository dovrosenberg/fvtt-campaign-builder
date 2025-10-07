/** converts to a record that uses uuids (or anything with . in it) from a record that uses #&# */

import { RelatedItemDetails, ValidTopic } from '@/types';

/** use after loading data from db */
export const cleanKeysOnLoad = <InnerType extends any, T extends Record<string, InnerType>>(obj: T): T => {
  const result = {} as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    // filter out the bad ones
    if (key !== 'Compendium')
      result[key.replaceAll('#&#','.')] = value;
  }

  return result as T;
}

/** converts a record that uses uuids (or anything with . in it) to a record that uses #&# */
/** use before saving data to db */
export const cleanKeysOnSave = <InnerType extends any, T extends Record<string, InnerType>>(obj: T): T => {
  const result = {} as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    // filter out the bad ones
    result[key.replaceAll('.','#&#')] = value;
  }

  return result as T;
}


type RelationshipFieldType = Record<ValidTopic, Record<string,RelatedItemDetails<any, any>>>; 

// can't just use cleanKeysOnLoad because it's the second layer in
export const cleanRelationshipKeysOnLoad = (relationships: RelationshipFieldType): RelationshipFieldType => {
  const newRelationships = {} as RelationshipFieldType;

  for (const topic in relationships) {
    newRelationships[topic] = cleanKeysOnLoad(relationships[topic]);  
  }

  return newRelationships;
};

export const cleanRelationshipKeysOnSave = (relationships: RelationshipFieldType): RelationshipFieldType => {
  const newRelationships = {} as RelationshipFieldType;

  for (const topic in relationships) {
    newRelationships[topic] = cleanKeysOnSave(relationships[topic]);  
  }

  return newRelationships;
};
