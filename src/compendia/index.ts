// functions for managing folders and compendia
import { inputDialog } from '@/dialogs/input';
import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
import { getGame, localize } from '@/utils/game';
import { Topic } from '@/types';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { Document } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs';
import { AnyDocumentData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/data.mjs';
import { toTopic } from '@/utils/misc';
import { hasHierarchy } from '@/utils/hierarchy';

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
export async function createWorldFolder(makeCurrent = false): Promise<Folder | null> {
  const rootFolder = await getRootFolder(); // will create if needed

  // get the name
  let name;

  do {
    name = await inputDialog('Create World', 'World Name:');
    
    if (name) {
      // create the folder
      const folders = await Folder.createDocuments([{
        name,
        // @ts-ignore
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
  
      return folders[0];
    }
  } while (name==='');  // if hit ok, must have a value

  // if name isn't '' and we're here, then we cancelled the dialog
  return null;
}

// returns the root and world, creating if needed
export async function getDefaultFolders(): Promise<{ rootFolder: Folder, worldFolder: Folder | null}> {
  const rootFolder = await getRootFolder(); // will create if needed
  const worldId = UserFlags.get(UserFlagKey.currentWorld);  // this isn't world-specific (obviously)

  // make sure we have a default and it exists
  let worldFolder = null as Folder | null;
  if (worldId)
    worldFolder = getGame()?.folders?.find((f)=>f.uuid===worldId) || null;

  if (!worldId || !worldFolder) {
    worldFolder = await createWorldFolder(true);
  }

  return { rootFolder, worldFolder: worldFolder as Folder };
}


// ensure the root folder has all the required topic compendia
// Note: compendia kind of suck.   You can't rename them or change the label.  And you can't have more than one with the same name/label
//    in a given world.  So we give them all unique names but then use a flag to display the proper topic
export async function validateCompendia(worldFolder: Folder): Promise<void> {
  let updated = false;

  // the uuid for the compendia of each topic
  let compendia: Record<Topic, string> = {
    [Topic.None]: '',
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
  const topics = [Topic.Character, Topic.Event, Topic.Location, Topic.Organization];
  for (let i=0; i<topics.length; i++) {
    const t = topics[i];

    // if the value is blank or we can't find the compendia create a new one
    if (!compendia[t] || !getGame().packs?.get(compendia[t])) {
      // create a new one
      compendia[t] = await createCompendium(worldFolder, t);
      updated = true;
    }
  }
  
  // if we changed things, save new compendia flag
  if (updated) {
    await WorldFlags.set(worldFolder.uuid, WorldFlagKey.compendia, compendia);
  }
}

function getTopicText(topic: Topic): string {
  switch (toTopic(topic)) {
    case Topic.Character: return localize('fwb.topics.character'); 
    case Topic.Event: return localize('fwb.topics.event'); 
    case Topic.Location: return localize('fwb.topics.location'); 
    case Topic.Organization: return localize('fwb.topics.organization'); 
    default: 
      throw new Error('Invalid topic in getTopicText()');
  }
}

async function createCompendium(worldFolder: Folder, topic: Topic ): Promise<string> {
  const label = getTopicText(topic);

  const metadata = { 
    name: randomID(), 
    label: label,
    type: 'JournalEntry', 
  };

  // @ts-ignore
  const compendium = await CompendiumCollection.createCompendium(metadata);

  // @ts-ignore
  await compendium.setFolder(worldFolder.id);

  // @ts-ignore
  await compendium.configure({ locked:true, topic: topic });

  // @ts-ignore
  return compendium.metadata.id;
}

// gets the entry and cleans it
export async function getCleanEntry(uuid: string): Promise<JournalEntry | null> {
  // we must use fromUuid because these are all in compendia
  const entry = await fromUuid(uuid) as JournalEntry;

  if (entry) {
    await cleanEntry(entry);
    return entry;
  } else {
    return null;
  }
}

// creates a new entry in the proper compendium in the given world
export async function createEntry(worldFolder: Folder, topic: Topic): Promise<JournalEntry | null> {
  const topicText = getTopicText(topic);

  let name;
  do {
    name = await inputDialog(`Create ${topicText}`, `${topicText} Name:`);
  } while (name==='');  // if hit ok, must have a value

  // if name is null, then we cancelled the dialog
  if (!name)
    return null;

  // create the entry
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

  await pack.configure({locked:true});

  if (entry) {
    await EntryFlags.set(entry, EntryFlagKey.topic, topic);

    // setup the hierarchy
    if (hasHierarchy(topic)) {
      await EntryFlags.set(entry, EntryFlagKey.hierarchy, {
        parentId: '',
        ancestors: [],
        children: [],
      });
    }
  }

  return entry || null;
}

// makes sure that the entry has all the correct pages
async function cleanEntry(entry: JournalEntry): Promise<void> {
  if (!entry.pages.find((p)=>p.name==='description')) { // TODO: replace with enum
    // @ts-ignore
    // this creates the page and adds to the parent
    const page = await JournalEntryPage.create({name:'description', type: 'text'}, {parent: entry, pack: entry.pack});  // TODO: replace this with an enum
  }
}

// updates an entry, unlocking compedium to do it
export async function updateDocument<T extends AnyDocumentData>(document: Document<T>, data: any): Promise<Document<T> | null> {
  if (!document.pack)
    throw new Error('Invalid compedia in updateDocument()');

  // unlock compendium to make the change
  const pack = getGame().packs.get(document.pack);
  if (!pack)
    throw new Error('Bad compendia in updateDocument()');

  await pack.configure({locked:false});
  const retval = await document.update(data) || null;
  await pack.configure({locked:true});

  return retval;
}