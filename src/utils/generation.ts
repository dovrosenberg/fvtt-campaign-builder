// library imports

// local imports
import { useMainStore, useTopicDirectoryStore, } from '@/applications/stores';

// types
import { 
  CharacterDetails, 
  LocationDetails, 
  OrganizationDetails, 
  Species, 
  Topics, 
} from '@/types';
import { Entry, TopicFolder, WBWorld, } from '@/classes';
import { Backend } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';

/**
 * Type representing all possible generated content details
 */
export type GeneratedDetails = 
  CharacterDetails |
  OrganizationDetails |
  LocationDetails;

/**
 * Handles the creation and setup of a newly generated entry
 * 
 * @param details The details of the generated content
 * @param topicFolder The topic folder to create the entry in 
 * @param generateImage Whether to generate an image for the entry after creation
 * @returns The created entry or undefined if creation failed
 */
export const handleGeneratedEntry = async (details: GeneratedDetails, topicFolder: TopicFolder): Promise<Entry | undefined> => {
  const { name, description, type } = details;
  const topicDirectoryStore = useTopicDirectoryStore();
  
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
      // @ts-ignore
      entry.speciesId = details.speciesId || undefined;
      break;
    case Topics.Location:
    case Topics.Organization:
      // @ts-ignore
      if (details.parentId)
        // @ts-ignore
        await topicDirectoryStore.setNodeParent(topicFolder, entry.uuid, details.parentId);
      break;
  }
  
  await entry.save();
  
  if (details.generateImage)
    void generateImage(await topicFolder.getWorld(), entry);

  return entry;
};

export const generateImage = async (currentWorld: WBWorld, entry: Entry): Promise<void> => {
  if (!entry || !currentWorld || ![Topics.Character, Topics.Location, Topics.Organization].includes(entry.topic)) {
    return;
  }

  try {
    // Show a notification that we're generating an image
    ui.notifications?.info(`Generating image for ${entry.name}. This may take a minute...`);

    // Get species name if this is a character
    let species: Species | undefined;
    const speciesList = ModuleSettings.get(SettingKey.speciesList);
    if (entry.speciesId) {
      species = speciesList.find(s => s.id === entry.speciesId);
    }

    let result;
    switch (entry.topic) {
      case Topics.Character:
        // Call the API to generate an image
         result = await Backend.api.apiCharacterGenerateImagePost({
          genre: currentWorld.genre,
          worldFeeling: currentWorld.worldFeeling,
          type: entry.type,
          species: species?.name || '',
          speciesDescription: species?.description || '',
          briefDescription: entry.description,
        });
        break;
      case Topics.Location:
      case Topics.Organization:
        // get parent/grandparent
        let parent: Entry | null = null;
        let grandparent: Entry | null = null;

        let parentId = await entry.getParentId();
        if (parentId) {
          parent = await Entry.fromUuid(parentId);

          if (parent) {
            const grandparentId = await parent.getParentId();
            if (grandparentId) {
              grandparent = await Entry.fromUuid(grandparentId);
            }
          }
        }

        // Call the API to generate an image
        const options = {
          genre: currentWorld.genre,
          worldFeeling: currentWorld.worldFeeling,
          type: entry.type,
          name: entry.name,
          parentName: parent?.name,
          parentType: parent?.type,
          parentDescription: parent?.description,
          grandparentName: grandparent?.name,
          grandparentType: grandparent?.type,
          grandparentDescription: grandparent?.description,
          briefDescription: entry.description,
        };

        if (entry.topic === Topics.Location)  {
          result = await Backend.api.apiLocationGenerateImagePost(options);
        } else if (entry.topic === Topics.Organization) {
          result = await Backend.api.apiOrganizationGenerateImagePost(options);
        }
        break;
    }

    // Update the entry with the generated image
    if (result.data.filePath) {
      entry.img = result.data.filePath;
      await entry.save();
      ui.notifications?.info(`Image completed for ${entry.name}.`);

      // refresh the current content, just in case
      await useMainStore().refreshCurrentContent();
    } else {
      throw new Error('No image path returned');
    }
  } catch (error) {
    const message = `Failed to generate image: ${(error as Error).message}.`;
    ui.notifications?.error(message);
    throw new Error(message);
  } 
};