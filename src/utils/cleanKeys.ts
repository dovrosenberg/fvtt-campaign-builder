/** converts to a record that uses uuids (or anything with . in it) from a record that uses #&# */

import { RelatedItemDetails, ValidTopic, ValidTopicRecord } from '@/types';

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


// things like relationships and entries that are keyed by topic and then by uuid
type TopicFieldType = ValidTopicRecord<Record<string, unknown>>;

// can't just use cleanKeysOnLoad because it's the second layer in
export const cleanTopicKeysOnLoad = (objectToClean: TopicFieldType): TopicFieldType => {
  const newObject = {} as TopicFieldType;

  for (const topic in objectToClean) {
    newObject[topic] = cleanKeysOnLoad(objectToClean[topic]);  
  }

  return newObject;
};

export const cleanTopicKeysOnSave = (objectToClean: TopicFieldType): TopicFieldType => {
  const newObject = {} as TopicFieldType;

  for (const topic in objectToClean) {
    newObject[topic] = cleanKeysOnSave(objectToClean[topic]);  
  }

  return newObject;
};
