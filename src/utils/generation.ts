// library imports

// local imports
import { useMainStore, useSettingDirectoryStore, useBackendStore, } from '@/applications/stores';

// types
import { 
  CharacterDetails, 
  LocationDetails, 
  OrganizationDetails, 
  Species, 
  Topics, 
} from '@/types';
import { Entry, TopicFolder, FCBSetting, } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { notifyError, notifyInfo } from './notifications';

/**
 * Union type representing all possible generated content details.
 */
export type GeneratedDetails = 
  CharacterDetails |
  OrganizationDetails |
  LocationDetails;

/**
 * Handles the creation and setup of a newly generated entry.
 * Creates the entry, sets its properties based on the generated details,
 * and optionally triggers image generation.
 * 
 * @param details - The generated content details containing name, description, type, and topic-specific data
 * @param topicFolder - The topic folder to create the entry in
 * @returns A promise that resolves to the created entry, or undefined if creation failed
 */
export const handleGeneratedEntry = async (details: GeneratedDetails, topicFolder: TopicFolder): Promise<Entry | undefined> => {
  const { name, description, type, roleplayingNotes } = details;
  const settingDirectoryStore = useSettingDirectoryStore();
  
  if (!topicFolder)
    return undefined;

  // create the entry
  const entry = await settingDirectoryStore.createEntry(topicFolder, { name: name, type: type });

  if (!entry)
    throw new Error('Failed to create entry in generation.handleGeneratedEntry()');

  // if they return empty string then don't set it
  if (description)
    entry.description = description;
  if (roleplayingNotes)
    entry.roleplayingNotes = details.roleplayingNotes;

  // add the other things based on topic
  switch (topicFolder.topic) {
    case Topics.Character:
    case Topics.PC:
      // For character entries
      // @ts-ignore
      entry.speciesId = details.speciesId || undefined;
      break;
    case Topics.Location:
    case Topics.Organization:
      // @ts-ignore
      if (details.parentId)
        // @ts-ignore
        await settingDirectoryStore.setNodeParent(topicFolder, entry.uuid, details.parentId);
      break;
  }
  
  await entry.save();
  
  if (details.generateImage)
    void generateImage(topicFolder.setting, entry);

  return entry;
};

/**
 * Generates an AI image for an entry based on its type, description, and setting context.
 * Handles different generation logic for characters, locations, and organizations.
 * Shows user notifications during the generation process and updates the entry with the result.
 * 
 * @param forSetting - The setting containing the entry (used for genre and setting feeling)
 * @param entry - The entry to generate an image for
 * @returns A promise that resolves when image generation is complete
 * @throws {Error} If image generation fails or the entry type is not supported
 */
export const generateImage = async (forSetting: FCBSetting, entry: Entry): Promise<void> => {
  if (!entry || !forSetting || ![Topics.Character, Topics.Location, Topics.Organization].includes(entry.topic)) {
    return;
  }

  if (useBackendStore().isGeneratingImage[entry.uuid]) {
    return;
  }

  const entryGenerated = entry.uuid;
  useBackendStore().isGeneratingImage[entryGenerated] = true;

  try {
    // Show a notification that we're generating an image
    notifyInfo(`Generating image for ${entry.name}. This may take a minute...`);

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
         result = await useBackendStore().generateCharacterImage({
          genre: forSetting.genre,
          settingFeeling: forSetting.settingFeeling,
          name: entry.name,
          type: entry.type,
          species: species?.name || '',
          speciesDescription: species?.description || '',
          briefDescription: entry.description,
          textModel: ModuleSettings.get(SettingKey.selectedTextModel),
          imageModel: ModuleSettings.get(SettingKey.selectedImageModel),
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
          genre: forSetting.genre,
          settingFeeling: forSetting.settingFeeling,
          type: entry.type,
          name: entry.name,
          parentName: parent?.name,
          parentType: parent?.type,
          parentDescription: parent?.description,
          grandparentName: grandparent?.name,
          grandparentType: grandparent?.type,
          grandparentDescription: grandparent?.description,
          briefDescription: entry.description,
          textModel: ModuleSettings.get(SettingKey.selectedTextModel),
          imageModel: ModuleSettings.get(SettingKey.selectedImageModel),
        };

        if (entry.topic === Topics.Location)  {
          result = await useBackendStore().generateLocationImage(options);
        } else if (entry.topic === Topics.Organization) {
          result = await useBackendStore().generateOrganizationImage(options);
        }
        break;
    }

    // Update the entry with the generated image
    if (result.data.filePath) {
      entry.img = result.data.filePath;
      await entry.save();
      notifyInfo(`Image completed for ${entry.name}.`);

      // refresh the current content, just in case
      await useMainStore().refreshCurrentContent();
    } else {
      throw new Error('No image path returned');
    }
  } catch (error) {
    const message = `Failed to generate image: ${(error as Error).message}.`;
    notifyError(message);
    throw new Error(message);
  } finally {
    useBackendStore().isGeneratingImage[entryGenerated] = false;
  }
};