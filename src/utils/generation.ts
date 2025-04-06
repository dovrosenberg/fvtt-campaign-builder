// library imports

// local imports
import { useTopicDirectoryStore, useNavigationStore } from '@/applications/stores';

// types
import { 
  GeneratedCharacterDetails, 
  GeneratedLocationDetails, 
  GeneratedOrganizationDetails, 
  Topics, 
} from '@/types';
import { Entry, TopicFolder, } from '@/classes';

/**
 * Type representing all possible generated content details
 */
export type GeneratedDetails = 
  GeneratedCharacterDetails |
  GeneratedOrganizationDetails |
  GeneratedLocationDetails;

/**
 * Handles the creation and setup of a newly generated entry
 * 
 * @param details The details of the generated content
 * @param topicFolder The topic folder to create the entry in 
 * @returns The created entry or undefined if creation failed
 */
export const handleGeneratedEntry = async (details: GeneratedDetails, topicFolder: TopicFolder): Promise<Entry | undefined> => {
  const { name, description, type } = details;
  const topicDirectoryStore = useTopicDirectoryStore();
  const navigationStore = useNavigationStore();
  
  if (!topicFolder)
    return undefined;

  // create the entry
  const entry = await topicDirectoryStore.createEntry(topicFolder, { name: name, type: type });

  if (!entry)
    throw new Error('Failed to create entry in generation.handleGeneratedEntry()');

  entry.description = description;

  // add the other things based on topic
  switch (topicFolder.topic) {
    case Topics.Character:
      // For character entries
      entry.speciesId = details.speciesId || undefined;
      break;
    case Topics.Location:
    case Topics.Organization:
      if (details.parentId)
        await topicDirectoryStore.setNodeParent(topicFolder, entry.uuid, details.parentId);
      break;
  }
  
  await entry.save();

  // open the entry in a new tab
  if (entry) {
    await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true });
  }
  
  return entry;
};