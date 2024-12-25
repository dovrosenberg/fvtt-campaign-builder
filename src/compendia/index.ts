// functions for managing folders and compendia
import { localize } from '@/utils/game';
import { Topic, } from '@/types';
import { SettingKey, moduleSettings, UserFlagKey, UserFlags,} from '@/settings';
import { toTopic } from '@/utils/misc';
import { WBWorld } from '@/classes';

/**
 * Gets the root folder.
 * If it is not stored in settings, creates a new folder and saves it to settings.
 * If there is a setting but the folder doesn't exist, creates a new one and saves it to settings.
 * @returns The root folder.
 */
export async function getRootFolder(): Promise<Folder> {
  const rootFolderId = moduleSettings.get(SettingKey.rootFolderId);
  let folder: Folder | null;

  if (!rootFolderId) {
    // no setting - create a new one
    folder = await createRootFolder();

    // save to settings for next time
    await moduleSettings.set(SettingKey.rootFolderId, folder.uuid);
  } else { 
    folder = game.folders?.find((f)=>f.uuid===rootFolderId) || null;

    // there is a setting, but does the folder exist?
    if (!folder) {
      // folder doesn't exist, so create a new one
      folder = await createRootFolder();
  
      // save to settings for next time
      await moduleSettings.set(SettingKey.rootFolderId, folder.uuid);
    }
  }

  return folder;
}


/**
 * Create a new root folder.
 * @param {string} [name] The name for the folder. If not provided, uses the default root folder name in the localization.
 * @returns The new folder.
 */
export async function createRootFolder(name?: string): Promise<Folder> {
  if (!name)
    name = localize('defaultRootFolderName');
  
  const folders = await Folder.createDocuments([{
    name,
    type: 'Compendium',
    sorting: 'a',
  }]);

  if (!folders)
    throw new Error('Couldn\'t create root folder');

  return folders[0];
}


/**
 * Gets the root and world folders.
 * Will create new folders if missing.
 * @returns The root and world folders.
 */
export async function getDefaultFolders(): Promise<{ rootFolder: Folder; world: WBWorld}> {
  const rootFolder = await getRootFolder(); // will create if needed
  const worldId = UserFlags.get(UserFlagKey.currentWorld);  // this isn't world-specific (obviously)

  // make sure we have a default and it exists
  let world = null as WBWorld | null;
  if (worldId) {
    world = WBWorld.fromUuid(worldId);
  }   

  if (!world) {
    // couldn't find it, default to top if one exists
    if (rootFolder.children.length>0) {
      world = WBWorld.fromUuid(rootFolder.children[0].folder);
    } else {
      // no world folder, so create one
      world = await WBWorld.create(true);

      // if we couldn't create one, then throw an error
      // TODO- handle this more gracefully... allow the dialog to exist without a world, I guess
      if (!world)
        throw new Error('Couldn\'t create world folder in compendia/index.getDefaultFolders()');
    }
  }

  return { rootFolder, world };
}


/**
 * Returns a localized string representing the name of a given topic.
 * 
 * @param {Topic} topic - The topic for which to retrieve the text.
 * @returns {string} A localized string for the topic.
 * @throws {Error} If the topic is invalid.
 */
export function getTopicText(topic: Topic): string {
  switch (toTopic(topic)) {
    case Topic.Character: return localize('topics.character') || ''; 
    case Topic.Event: return localize('topics.event') || ''; 
    case Topic.Location: return localize('topics.location') || ''; 
    case Topic.Organization: return localize('topics.organization') || ''; 
    case Topic.None:
    default: 
      throw new Error('Invalid topic in getTopicText()');
  }
}

/**
 * Returns a localized string representing the name of a given topic in plural form.
 * 
 * @param {Topic} topic - The topic for which to retrieve the text.
 * @returns {string} A localized string for the topic.
 * @throws {Error} If the topic is invalid.
 */
export function getTopicTextPlural(topic: Topic): string {
  switch (toTopic(topic)) {
    case Topic.Character: return localize('topics.characters') || ''; 
    case Topic.Event: return localize('topics.events') || ''; 
    case Topic.Location: return localize('topics.locations') || ''; 
    case Topic.Organization: return localize('topics.organizations') || ''; 
    case Topic.None:
    default: 
      throw new Error('Invalid topic in getTopicTextPlural()');
  }
}
