// functions for managing folders and compendia
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

async function createRootFolder(name?: string): Promise<Folder> {
  if (!name)
    name = localize('fwb.defaultRootFolderName');
  
  const folders = await Folder.createDocuments([{
    name,
    type: 'Compendium',
    sorting: 'a',
  }]);

  if (!folders)
    throw new Error('Couldn\'t create root folder')

  return folders[0];
}
