import { ModuleSettings, SettingKey } from '@/settings';
import { RootFolderDoc, } from '@/documents';
import { localize } from '@/utils/game';

export class RootFolder {
  protected _doc: RootFolderDoc;

  constructor(doc: RootFolderDoc) {
    // make sure it's the right kind of document
    if (doc.documentName !== 'Folder')
      throw new Error('Invalid document type in RootFolder constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._doc = foundry.utils.deepClone(doc);
  }

  public get raw(): RootFolderDoc { return this._doc; }
  
  /**
   * Gets the root folder.
   * If it is not stored in settings, creates a new folder and saves it to settings.
   * If there is a setting but the folder doesn't exist, creates a new one and saves it to settings.
   * @returns The root folder.
   */
  public static async get(): Promise<RootFolder> {
    let folder: RootFolder | null = null;

    const rootFolderId = ModuleSettings.get(SettingKey.rootFolderId);

    if (!rootFolderId) {
      // no setting - create a new one
      folder = await RootFolder.create();
    } else { 
      const doc = await fromUuid<RootFolderDoc>(rootFolderId);

      if (doc)
        folder = new RootFolder(doc);
  
      // there is a setting, but does the folder exist?
      if (!folder) {
        // folder doesn't exist, so create a new one
        folder = await RootFolder.create();
      }
    }
  
    return folder;
  }

  public static async create(name?: string): Promise<RootFolder> {
    const folderName = name || localize('defaultRootFolderName');

    const folders = await Folder.createDocuments([
      {
        name: folderName,
        type: 'Compendium',
        sorting: 'a',
      }
    ]);

    if (!folders) throw new Error("Couldn't create root folder");

    const doc = folders[0] as RootFolderDoc;
    const rf = new RootFolder(doc);

    // update the module settings
    await ModuleSettings.set(SettingKey.rootFolderId, doc.uuid);

    return rf;
  }
}
