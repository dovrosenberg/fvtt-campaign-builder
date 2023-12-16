// functions for managing folders and compendia
import { inputDialog } from '@/dialogs/input';
import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
import { getGame, localize } from '@/utils/game';
import { Topic } from '@/types';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';

// returns the uuid of the root folder
// if it is not stored in settings, creates a new folder
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

// create a new root folder
export async function createRootFolder(name?: string): Promise<Folder> {
  if (!name)
    name = localize('fwb.defaultRootFolderName');
  
  const folders = await Folder.createDocuments([{
    name,
    // @ts-ignore
    type: 'Compendium',
    sorting: 'a',
  }]);

  if (!folders)
    throw new Error('Couldn\'t create root folder');

  return folders[0];
}

// create a new world folder
// returns the new folder
export async function createWorldFolder(rootFolder: Folder, name: string, makeDefault: boolean = false): Promise<Folder> {
  const folders = await Folder.createDocuments([{
    name,
    // @ts-ignore
    type: 'Compendium',
    folder: rootFolder.id,
    sorting: 'a',
  }]);

  if (!folders)
    throw new Error('Couldn\'t create new folder');

  // create the compendia inside
  
  // set as the default world
  if (makeDefault) {
    await moduleSettings.set(SettingKey.defaultWorldId, folders[0].uuid);
  }

  return folders[0];
}

// returns the root and world, creating if needed
export async function getDefaultFolders(): Promise<{ rootFolder: Folder, worldFolder: Folder}> {
  const rootFolder = await getRootFolder(); // will create if needed
  const worldId = moduleSettings.get(SettingKey.defaultWorldId);

  // make sure we have a default and it exists
  let worldFolder = null as Folder | null;
  if (worldId)
    worldFolder = getGame()?.folders?.find((f)=>f.uuid===worldId) || null;

  if (!worldId || !worldFolder) {
    // need to create a world
    let name;

    // TODO - differentiate between a blank name submitted and a cancellation - otherwise
    //    there's no way to cancel
    do {
      name = await inputDialog('Create World', 'World Name:');
      
      if (name) {
        worldFolder = await createWorldFolder(rootFolder, name, true);
      }
    } while (!name);
  }

  // make sure all the compedia exist
  await validateCompendia(worldFolder as Folder);

  return { rootFolder, worldFolder: worldFolder as Folder };
}


// ensure the root folder has all the required topic compendia
// Note: compendia kind of suck.   You can't rename them or change the label.  And you can't have more than one with the same name/label
//    in a given world.  So we give them all unique names but then use a flag to display the proper topic
async function validateCompendia(worldFolder: Folder): Promise<void> {
  let updated = false;

  // the uuid for the compendia of each topic
  let compendia: Record<Topic, string> = {
    [Topic.Character]: '',
    [Topic.Event]: '',
    [Topic.Location]: '',
    [Topic.Organization]: '',
  };
   
  const flag = WorldFlags.get(worldFolder.uuid, WorldFlagKey.compendia); 

  if (flag) {
    compendia = flag;
  } else {
    updated = true;
  }

  // check them all
  // Object.keys() on an enum returns an array with all the values followed by all the names
  for (let i=0; i<Object.keys(Topic).length/2; i++) {
    // if the key is blank or we can't find the compendia create a new one
    if (!compendia[i] || !getGame().packs?.get(compendia[i])) {
      // create a new one
      compendia[i] = await createCompendium(worldFolder, i as Topic);
      updated = true;
    }
  }
  
  // if we changed things, save new compendia flag
  if (updated) {
    await WorldFlags.set(worldFolder.uuid, WorldFlagKey.compendia, compendia);
  }
}

async function createCompendium(worldFolder: Folder, topic: Topic ): Promise<string> {
  let label: string;

  switch (topic) {
    case Topic.Character:
      label = localize('fwb.topics.characters');
      break;
    case Topic.Event:
      label = localize('fwb.topics.events');
      break;
    case Topic.Location:
      label = localize('fwb.topics.locations');
      break;
    case Topic.Organization:
      label = localize('fwb.topics.organizations');
      break;
    default:
      throw new Error('Invalid topic in createCompendium');
  }
  const metadata = { 
    name: randomID(), 
    label: label,
    type: 'JournalEntry', 
  };

  // @ts-ignore
  const compendium = await CompendiumCollection.createCompendium(metadata);

  // @ts-ignore
  await compendium.setFolder(worldFolder.id);
  await compendium.configure({locked:true});

  // @ts-ignore
  return compendium.metadata.id;
}

// creates a new entry in the proper compendium in the given world
export async function createEntry(worldFolder: Folder, name: string, topic: Topic): Promise<JournalEntry | null> {
  const compendia = WorldFlags.get(worldFolder.uuid, WorldFlagKey.compendia);

  if (!compendia || !compendia[topic])
    throw new Error('Missing compendia in createEntry()');

  // unlock it to make the change
  const pack = getGame().packs.get(compendia[topic]);
  if (!pack)
    throw new Error('Bad compendia in createEntry()');

  await pack.configure({locked:false});

  const entry = await JournalEntry.create({
    name,
    folder: worldFolder.id,
  },{
    pack: compendia[topic],
  });

  if (entry)
    await EntryFlags.set(entry, EntryFlagKey.topic, topic);

  await pack.configure({locked:true});

  return entry || null;
}

// updates an entry, unlocking compedium to do it
export async function updateEntry(entry: JournalEntry, data: any): Promise<JournalEntry | null> {
  if (!entry.pack)
    throw new Error('Invalid compedia in updateEntry()');

  // unlock compendium to make the change
  const pack = getGame().packs.get(entry.pack);
  if (!pack)
    throw new Error('Bad compendia in updateEntry()');

  await pack.configure({locked:false});
  const retval = await entry.update(data) || null;
  await pack.configure({locked:true});

  return retval;
}