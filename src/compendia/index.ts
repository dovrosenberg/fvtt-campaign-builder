// functions for managing folders and compendia
import { inputDialog } from '@/dialogs/input';
import { getGame, localize } from '@/utils/game';
import { Topic, } from '@/types';
import { SettingKey, moduleSettings, UserFlagKey, UserFlags, WorldFlagKey, WorldFlags } from '@/settings';
import { toTopic } from '@/utils/misc';

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
    folder = getGame()?.folders?.find((f)=>f.uuid===rootFolderId) || null;

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
    name = localize('fwb.defaultRootFolderName');
  
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
 * Create a new world folder.
 * @param {boolean} [makeCurrent=false] If true, sets the new folder as the current world.
 * @returns The new folder, or null if the user cancelled the dialog.
 */
export async function createWorldFolder(makeCurrent = false): Promise<Folder | null> {
  const rootFolder = await getRootFolder(); // will create if needed

  // get the name
  let name;

  do {
    name = await inputDialog('Create World', 'World Name:');
    
    if (name) {
      // create the world folder
      const folders = await Folder.createDocuments([{
        name,
        type: 'Compendium',
        folder: rootFolder.id,
        sorting: 'a',
      }]);
  
      if (!folders)
        throw new Error('Couldn\'t create new folder');
  
      // set as the current world
      if (makeCurrent) {
        await UserFlags.set(UserFlagKey.currentWorld, folders[0].uuid);
      }
  
      await validateCompendia(folders[0]);
      await WorldFlags.setDefaults(folders[0].uuid);

      return folders[0];
    }
  } while (name==='');  // if hit ok, must have a value

  // if name isn't '' and we're here, then we cancelled the dialog
  return null;
}

/**
 * Gets the root and world folders.
 * Will create new folders if missing.
 * @returns The root and world folders.
 */
export async function getDefaultFolders(): Promise<{ rootFolder: Folder; worldFolder: Folder}> {
  const rootFolder = await getRootFolder(); // will create if needed
  const worldId = UserFlags.get(UserFlagKey.currentWorld);  // this isn't world-specific (obviously)

  // make sure we have a default and it exists
  let worldFolder = null as Folder | null;
  if (worldId) {
    const baseItem = rootFolder.children.find((c)=>c.folder.uuid===worldId) || null;
    worldFolder = baseItem?.folder || null;
  }   

  if (!worldId || !worldFolder) {
    // couldn't find it, default to top if one exists
    if (rootFolder.children.length>0) {
      worldFolder = rootFolder.children[0].folder as Folder;
    } else {
      // no world folder, so create one
      worldFolder = await createWorldFolder(true);

      // if we couldn't create one, then throw an error
      // TODO- handle this more gracefully... allow the dialog to exist without a world, I guess
      if (!worldFolder)
        throw new Error('Couldn\'t create world folder in compendia/index.getDefaultFolders()');
    }
  }

  return { rootFolder, worldFolder };
}


// ensure the root folder has all the required compendia

/**
 * Makes sure that the world folder has a compendium and that the compendium id is stored in the settings
 * If any are missing, creates them.
 * @privateRemarks  Note: compendia kind of suck.   You can't rename them or change the label.  And you can't have more than one with the same name/label
 * in a given world.  So we give them all unique names but then use a flag to display the proper label (which is the topic)
 * @param worldFolder The folder to check.
 */
export async function validateCompendia(worldFolder: Folder): Promise<void> {
  let updated = false;

  // the id for the compendia 
  let compendiumId: string = '';
  let compendium: CompendiumCollection<any> | undefined | null;

  const setting = WorldFlags.get(worldFolder.uuid, WorldFlagKey.worldCompendium); 

  if (setting) {
    compendiumId = setting;
    compendium = getGame().packs?.get(compendiumId);
  } else {
    updated = true;
  }

  // check it
  // if the value is blank or we can't find the compendia create a new one
  if (!getGame().packs?.get(compendiumId)) {
    // create a new one
    compendium = await createCompendium(worldFolder);
    compendiumId = compendium.metadata.id;
  }

  if (!compendium)
    throw new Error('Failed to create compendium in validateCompendia()');

  // also need to create the journal entries
  // check them all
  // Object.keys() on an enum returns an array with all the values followed by all the names
  const topics = [Topic.Character, Topic.Event, Topic.Location, Topic.Organization];
  const topicEntries = WorldFlags.get(worldFolder.uuid, WorldFlagKey.topicEntries);

  await compendium.configure({ locked:false });

  for (let i=0; i<topics.length; i++) {
    const t = topics[i];

    // if the value is blank or we can't find the entry create a new one
    let topicJournal = compendium.index.find((e)=> e.uuid===topicEntries[t]);
    if (!topicJournal) {
      // create the missing one
      topicJournal = await JournalEntry.create({
        name: getTopicTextPlural(t),
        folder: worldFolder.id,
      },{
        pack: compendiumId,
      });

      topicEntries[t] = topicJournal.uuid;  
    
      updated = true;
    }
  }

  await compendium.configure({ locked:true });

  // if we changed things, save new compendia flag
  if (updated) {
    await WorldFlags.set(worldFolder.uuid, WorldFlagKey.worldCompendium, compendiumId);
    await WorldFlags.set(worldFolder.uuid, WorldFlagKey.topicEntries, topicEntries);
  }
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
    case Topic.Character: return localize('fwb.topics.character') || ''; 
    case Topic.Event: return localize('fwb.topics.event') || ''; 
    case Topic.Location: return localize('fwb.topics.location') || ''; 
    case Topic.Organization: return localize('fwb.topics.organization') || ''; 
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
    case Topic.Character: return localize('fwb.topics.characters') || ''; 
    case Topic.Event: return localize('fwb.topics.events') || ''; 
    case Topic.Location: return localize('fwb.topics.locations') || ''; 
    case Topic.Organization: return localize('fwb.topics.organizations') || ''; 
    case Topic.None:
    default: 
      throw new Error('Invalid topic in getTopicTextPlural()');
  }
}

// returns the compendium
async function createCompendium(worldFolder: Folder): Promise<CompendiumCollection<any>> {
  const metadata = { 
    name: foundry.utils.randomID(), 
    label: worldFolder.name,
    type: 'JournalEntry' as const, 
  };

  const pack = await CompendiumCollection.createCompendium(metadata);

  await pack.setFolder(worldFolder.id);

  await pack.configure({ locked:true });

  return pack;
}