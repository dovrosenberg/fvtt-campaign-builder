import { ModuleSettings, SettingKey } from '@/settings';
import { RootFolderDoc, RootFolderFlagKey, rootFolderFlagSettings } from '@/documents';
import { DocumentWithFlags } from '@/classes/DocumentWithFlags';
import { localize } from '@/utils/game';
import { Setting } from './Setting';

export class RootFolder extends DocumentWithFlags<RootFolderDoc> {
  static override _documentName = 'Folder';
  static override _flagSettings = rootFolderFlagSettings;

  constructor(doc: RootFolderDoc) {
    super(doc, RootFolderFlagKey.isRootFolder);
  }

  // Root folder is a Folder so it's outside compendia
  override get requiresUnlock(): boolean {
    return false;
  }

  // direct access to Foundry document
  get raw(): RootFolderDoc {
    return this._doc;
  }

  public get uuid(): string { return this._doc.uuid; }
  public get id(): string { return this._doc.id as string; }
  public get name(): string { return this._doc.name; }
  public set name(value: string) {
    this._cumulativeUpdate = foundry.utils.mergeObject(this._cumulativeUpdate, { name: value });
  }

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
    await rf.setup();

    // update the module settings
    await ModuleSettings.set(SettingKey.rootFolderId, rf.uuid);

    return rf;
  }

  /** save any accumulated changes */
  public async save(): Promise<RootFolder | null> {
    const updateData = this._cumulativeUpdate;
    if (Object.keys(updateData).length === 0) return this;

    const retval = await this._doc.update(updateData) || null;
    if (retval) {
      this._doc = retval;
      this._cumulativeUpdate = {};
      return this;
    }
    return null;
  }

  public get children(): Folder[] {
    return this._doc?.children || [] as Folder[];
  }
}
