// functions for managing folders and compendia
import { inputDialog } from '@/dialogs/input';
import { SettingKeys, moduleSettings } from "@/settings/ModuleSettings";
import { getGame, localize } from "@/utils/game";

// returns the uuid of the root folder
// if it is not stored in settings, creates a new folder
export async function getRootFolder(): Promise<string> {
  let retval = moduleSettings.get(SettingKeys.rootFolderId);

  if (!retval) {
    // no setting - create a new one
    const folder = await createRootFolder();
    retval = folder.uuid;

    // save to settings for next time
    await moduleSettings.set(SettingKeys.rootFolderId, retval);
  } else { 
    // there is a setting, but does the folder exist?
    if (!getGame()?.folders?.find((f)=>(f.uuid===retval))) {
      // folder doesn't exist, so create a new one
      const folder = await createRootFolder();
      retval = folder.uuid;
  
      // save to settings for next time
      await moduleSettings.set(SettingKeys.rootFolderId, retval);
    }
  }

  return retval;
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
    throw new Error('Couldn\'t create root folder')

  return folders[0];
}

// create a new world folder
// returns the new folder
export async function createWorldFolder(rootFolderId: string, name: string, makeDefault: boolean = false): Promise<Folder> {
  // find the root
  const rootFolder = (await fromUuid(rootFolderId)) as Folder | null;

  if (!rootFolder) {
    throw new Error('rootFolderId not found');
  }
  
  const folders = await Folder.createDocuments([{
    name,
    // @ts-ignore
    type: 'Compendium',
    folder: rootFolder.id,
    sorting: 'a',
  }]);

  if (!folders)
    throw new Error('Couldn\'t create new folder')

  // set as the default world
  if (makeDefault) {
    moduleSettings.set(SettingKeys.defaultWorldId, folders[0].uuid);
  }

  return folders[0];
}

// returns the root and world, creating if needed
export async function getDefaultFolders(): Promise<{ rootId: string, worldId: string}> {
  let rootId: string, worldId: string;

  rootId = await getRootFolder(); // will create if needed
  
  worldId = moduleSettings.get(SettingKeys.defaultWorldId);

  // make sure we have a default and it exists
  if (!worldId || !(await fromUuid(worldId))) {
    // need to create a world
    let name;

    // TODO - differentiate between a blank name submitted and a cancellation - otherwise
    //    there's no way to cancel
    do {
      name = await inputDialog('Create World', 'World Name:');
      
      if (name) {
        const newWorld = await createWorldFolder(rootId, name, true);
          worldId = newWorld.uuid;
      }
    } while (!name);
  }

  return { rootId, worldId };
}