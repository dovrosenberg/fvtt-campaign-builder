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
  CustomFieldContentType,
  WindowTabType,
} from '@/types';
import { 
  Entry, 
  TopicFolder, 
  FCBSetting, 
  Campaign, 
  Arc, 
  Session, 
  Front,
} from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { notifyError, notifyInfo } from './notifications';
import { windowTabToCustomContentType } from './customFields';

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
  const { name, description, type, } = details;
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
    void generateImage(topicFolder.setting, WindowTabType.Entry, entry);

  return entry;
};

/**
 * Generates an AI image for an entry based on its type, description, and setting context.
 * Uses the custom image generation endpoint for all content types except PCs.
 * Shows user notifications during the generation process and updates the entry with the result.
 * 
 * @param forSetting - The setting containing the entry (used for genre and setting feeling)
 * @param windowTabType - The type of window tab the entry is in
 * @param entry - The entry to generate an image for (can be Entry, Campaign, Arc, Session, Front, or Setting)
 * @returns A promise that resolves when image generation is complete
 * @throws {Error} If image generation fails or the entry type is not supported
 */
export const generateImage = async (forSetting: FCBSetting, windowTabType: WindowTabType, entry: Entry | Campaign | Arc | Session | Front | FCBSetting): Promise<void> => {
  if (!entry || !forSetting) {
    return;
  }
  
  // Don't generate images for PCs
  if (entry instanceof Entry && entry.topic === Topics.PC) {
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

    // Get custom image prompt and configuration for this content type
    const aiImagePrompts = ModuleSettings.get(SettingKey.aiImagePrompts) || {};
    const aiImageConfigurations = ModuleSettings.get(SettingKey.aiImageConfigurations) || {};
    
    // Determine content type based on the document type
    let contentType = windowTabToCustomContentType(windowTabType, entry);   
    
    const baseConfig = aiImageConfigurations[contentType] || {};
    
    // Get the description based on the configuration
    let description: string;
    if (baseConfig.descriptionField === 'description' && contentType !== CustomFieldContentType.Session) {
      description = (entry as any).description || '';
    } else if (baseConfig.descriptionField === 'notes' && contentType === CustomFieldContentType.Session) {
      // For sessions, use the notes field directly
      description = (entry as Session).notes || '';
    } else {
      description = (entry as any).getCustomField(baseConfig.descriptionField);
    }  
        
    // Get setting info from the setting
    const settingInfo: { genre: string; settingFeeling?: string } = {
      genre: forSetting.genre,
      settingFeeling: forSetting.settingFeeling,
    };
    
    // get parent/grandparent for context (only for entries)
    let parent: Entry | null = null;
    let grandparent: Entry | null = null;

    if ([CustomFieldContentType.Location, CustomFieldContentType.Organization].includes(contentType)) {
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
    }

    // species for characters
    let species: Species | undefined;
    if (contentType === CustomFieldContentType.Character) {
      if (entry instanceof Entry && entry.speciesId) {
        const speciesList = ModuleSettings.get(SettingKey.speciesList);
        species = speciesList.find(s => s.id === entry.speciesId);
      }
    }
        
    // Build the prompt by replacing tokens
    let finalPrompt = aiImagePrompts[contentType] || '';
    const tokenMap: Record<string, string> = {
      name: entry.name || '',
      type: (entry as any).type || '',
      description: (entry as any).description || (entry as Session).notes || '',
      species: species?.name || '',
      parent: parent?.name || '',
    };
    
    // Replace tokens in the prompt
    for (const [token, value] of Object.entries(tokenMap)) {
      finalPrompt = finalPrompt.replace(new RegExp(`\{${token}\}`, 'g'), value);
    }
    
    // Call the custom image generation API
    const result = await useBackendStore().generateCustomImage({
      contentType: contentType as any,
      name: entry.name,
      prompt: finalPrompt,
      genre: settingInfo.genre,
      settingFeeling: settingInfo.settingFeeling,
      type: (entry as any).type,
      species: species?.name,
      speciesDescription: species?.description,
      parentName: parent?.name,
      parentType: parent?.type,
      parentDescription: parent?.description,
      grandparentName: grandparent?.name,
      grandparentType: grandparent?.type,
      grandparentDescription: grandparent?.description,
      description: description,
      textModel: ModuleSettings.get(SettingKey.selectedTextModel),
      imageModel: ModuleSettings.get(SettingKey.selectedImageModel),
      imageConfiguration: baseConfig,
    });

    // Update the entry with the generated image
    if (result?.data.filePath) {
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
