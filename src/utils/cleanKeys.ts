/** converts to a record that uses uuids (or anything with . in it) from a record that uses #&# */

import { ValidTopicRecord } from '@/types';

// things like relationships and entries that are keyed by topic and then by uuid
type TopicFieldType = ValidTopicRecord<Record<string, unknown>>;

const CleanKeysService = {
  /** use after loading data from db */
  cleanKeysOnLoad: <InnerType extends any, T extends Record<string, InnerType>>(obj: T): T => {
    const result = {} as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      // filter out the bad ones
      if (key !== 'Compendium')
        result[key.replaceAll('#&#','.')] = value;
    }

    return result as T;
  },

  /** converts a record that uses uuids (or anything with . in it) to a record that uses #&# */
  /** use before saving data to db */
  cleanKeysOnSave: <InnerType extends any, T extends Record<string, InnerType>>(obj: T): T => {
    const result = {} as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      // filter out the bad ones
      result[key.replaceAll('.','#&#')] = value;
    }

    return result as T;
  },

  // can't just use cleanKeysOnLoad because it's the second layer in
  cleanTopicKeysOnLoad: (objectToClean: TopicFieldType): TopicFieldType => {
    const newObject = {} as TopicFieldType;

    for (const topic in objectToClean) {
      newObject[topic] = CleanKeysService.cleanKeysOnLoad(objectToClean[topic] || {});  
    }

    return newObject;
  },

  cleanTopicKeysOnSave: (objectToClean: TopicFieldType): TopicFieldType => {
    const newObject = {} as TopicFieldType;

    for (const topic in objectToClean) {
      newObject[topic] = CleanKeysService.cleanKeysOnSave(objectToClean[topic] || {});  
    }

    return newObject;
  }
};

export default CleanKeysService;
