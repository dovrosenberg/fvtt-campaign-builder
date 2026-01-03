import { FCBSetting } from '@/classes';
import { ValidTopic } from '@/types';

/**
 * Filters two lists of UUIDs to include only FCB entries of specific topics and 
 *  for the current setting/compendium.
 * @param setting - The current setting.
 * @param added - Array of UUIDs - will be returned filtered.
 * @param removed - Array of UUIDs - will be returned filtered.
 * @param topics - Array of topics to filter by.  If not provided, all topics are allowed.
 */
export const filterRelatedEntries = async (setting: FCBSetting, added: string[], removed: string[], topics?: ValidTopic[]) => {
  if (added.length === 0 && removed.length === 0) {
    return;
  }

  // combine for simplicity
  let allUUIDs = added.concat(removed);

  // we can only link to things in the current setting's compendium; filter others out quickly
  allUUIDs = allUUIDs.filter(uuid => uuid.startsWith(`Compendium.${setting.compendiumId}`));

  // pull all the topic indexes we need - get any entry of the appropriate topics on the setting
  const topicIndexes = Object.values(setting.topics).filter(topic => !topics || topics.includes(topic.topic));
  const validEntryUUIDs = topicIndexes.flatMap(topic => topic.entries.map(e => e.uuid));

  // filter down the ones we're looking at by things in the right topics
  allUUIDs = allUUIDs.filter(uuid => validEntryUUIDs.includes(uuid));

  // filter out anything that's not in that list
  // we're going to use splice to modify the argument arrays 
  added.splice(0, added.length, ...added.filter(uuid => allUUIDs.includes(uuid)));
  removed.splice(0, removed.length, ...removed.filter(uuid => allUUIDs.includes(uuid)));
};
