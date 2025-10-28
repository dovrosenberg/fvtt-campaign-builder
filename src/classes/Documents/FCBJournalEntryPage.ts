import { toRaw } from 'vue';
import { JournalEntryFlagKey, moduleId, ModuleSettings, SettingKey } from '@/settings';
import { ValidDocType } from '@/types';
import { FCBSetting } from './FCBSetting';
import { getGlobalSetting } from '@/classes';
import { sanitizeHTML } from '@/utils/sanitizeHtml';

//pull the DocType out of a constructor for a child
type DocTypeOf<T> =
  T extends new (doc: JournalEntryPage<infer D>, ...args: any) => any ? D : never;

// get the DocClass out of a constructor for a child
type DocClassOf<T> = JournalEntryPage<DocTypeOf<T>>;

type JournalEntry = foundry.documents.JournalEntry;

// Helper: the static side every subclass must provide
export type FCBJournalEntryPageStatic<
  DocType extends ValidDocType,
  DocClass extends JournalEntryPage<DocType>
> = {
  // constructor
  new (entry: JournalEntry, ...args: any[]): FCBJournalEntryPage<DocType, DocClass>;
  // required statics used by base helpers
  _defaultSystem: DocClass['system'];
  _documentType: DocType;
};

export class FCBJournalEntryPage<
  DocType extends ValidDocType,
  DocClass extends JournalEntryPage<DocType> = JournalEntryPage<DocType>
> {
  protected _clone: DocClass;  // these are the pages - not the journalentry
  protected _doc: DocClass;

  static _defaultSystem: DocClassOf<any>['system'];
  static _documentType: ValidDocType;

  constructor(journalEntry: JournalEntry) {
    // in case we got a proxy
    const je = toRaw(journalEntry);

    if (!je.pages || je.pages.contents.length !== 1)
      throw new Error(`Invalid journalEntry in FCBJournalEntryPage ${journalEntry.uuid}`);

    this._doc = je.pages.contents[0] as DocClass;
    this._clone = this._doc.clone({}, { keepId: true });
  }

  public get raw(): DocClass {
    return this._doc;
  }

  /** Note that we always refer to the uuid of the wrapping JournalEntry  */
  public get uuid(): string {
    return this._doc.parent!.uuid;
  }

  public get name(): string {
    return this._clone.name;
  }

  public set name(value: string)  {
    this._clone.name = value;

    // also set the parent
    if (this._clone.parent)
      this._clone.parent.name = value;
  }

  // we use a custom flag to hold this because that way if a copy is made to the local 
  //    world, the flag goes with it and when we open that, we'll actually be editing the 
  //    master copy.  The only thing that matters in the local copy is the name, uuid 
  //    (also stored in a flag to keep the link to the original), and this compendiumId.
  public get compendiumId(): string {
    const packId = this._doc.parent?.getFlag(moduleId, JournalEntryFlagKey.originalPackId);
    return packId || '';
  }

  public get compendium(): CompendiumCollection<'JournalEntry'> { 
    return game.packs.get(this.compendiumId) as unknown as CompendiumCollection<'JournalEntry'>;
  }

  public get settingId(): string {
    const settings = ModuleSettings.get(SettingKey.settingIndex);

    const setting = settings.find(s => s.packId === this.compendiumId);

    if (!setting)
      throw new Error(`Setting not found for FCBJournalEntryPage ${this.uuid}`);
    
    return setting.settingId;
  }

  public async getSetting(): Promise<FCBSetting> {
    const setting = await getGlobalSetting(this.settingId);
    if (!setting)
      throw new Error(`Setting not found for FCBJournalEntryPage ${this.uuid}`);
    return setting;
  }

  /** takes the uuid of the wrapper entry */
  static async fromUuid<
    DocType extends ValidDocType,
    DocClass extends JournalEntryPage<DocType>,
    T extends FCBJournalEntryPageStatic<DocType, DocClass>
  > (this: T, uuid: string): Promise<InstanceType<T> | null> {
    const entry = await fromUuid<JournalEntry>(uuid) as JournalEntry | undefined;
    
    if (!entry || entry.documentName !== 'JournalEntry' || !entry.pages || entry.pages.contents.length !== 1)
      return null;

    const doc = entry.pages.contents[0];

    if (!doc || doc.type !== this._documentType)
      return null;
    else {
      const fcbDoc = new this(entry) as InstanceType<T>;
      return fcbDoc;
    }
  }

  /** Returns a copy of _clone that's ready to save to the database.
   *   Handle any thing like keys needing to be transformed here.  This
   *   should NOT be a reference into clone so that anything that happens
   *   to reference the object mid-save doesn't get corrupted.
   */
  protected _prepData(_data: DocClass): void {};

  /**
   * Updates document in the database and updates the name on the parent
   *    journal entry if needed
   * 
   * Throws an error on failure (ex. a foundry validation or other error)
   * 
   */
  async save(): Promise<void> {
    if (!this._doc.parent)
      throw new Error(`Invalid journal entry page in FCBJournalEntryPage.save() ${this.uuid}`);
  
    try {
      // get the db-safe copy of the data     
      // we do this so anything with a reference into _clone doesn't
      //   break if there's a timing issue 
      const data = this._clone.toObject(false);
      this._prepData(data as DocClass);

      // sanitize custom fields
      sanitizeCustomFields(data.system.customFields);

      // update the name on the wrapper
      if (this._doc.name !== data.name) {
        // because the child class objects can get proxied by Vue, this might be proxied, 
        //   which can then cause issues with the update
        await toRaw(this._doc)?.parent?.update({ name: data.name });
      }
        
      // now save the page
      // need to pass false to toObject to use the current in memory version
      // we use recursive: false so that removed keys, etc. are removed from the database
      const retval = await toRaw(this._doc)?.update(data, { recursive: false })  as DocClass | undefined;

      // no update done; should probably reload clone to avoid data loss
      if (!retval) {
        this._clone = await this._doc.clone({}, { keepId: true });
      } else {
        // reset the doc and clone
        this._doc = retval;
        this._clone = retval.clone({}, { keepId: true });

        // rebuild the index (by adding a random field name) because otherwise index won't update
        // see Foundry bug: https://github.com/foundryvtt/foundryvtt/issues/9984
        // don't really need to await this
        const pack = game.packs.get(this.compendiumId);
        if (!pack)
          throw new Error(`Invalid compendium in FCBJournalEntryPage.save() ${this.compendiumId}`);
        // @ts-ignore
        void pack.getIndex({ fields: [foundry.utils.randomID()]});
      }      
    } catch (e) {
      throw new Error(`Error updating journal entry page ${this._doc.uuid}: ${e}`);
    }
  }
  
  
  /**
   * Creates a new content wrapper.  Does not add to FCBSetting (but does put in the compendium).
   * 
   * @param {string} compendiumId - The compendium to create the content in. 
   * @param {string} name - The name of the content 
   * @returns A promise that resolves when the page has been created with either the page or null for failure
   */
  protected static async _create<
    DocType extends ValidDocType,
    DocClass extends JournalEntryPage<DocType>,
    T extends FCBJournalEntryPageStatic<DocType, DocClass>
  > (this: T, compendiumId: string, name: string, folderName: string, initialData: Record<string, unknown> = {}): Promise<InstanceType<T> | null> {
    // find the folder it goes in 
    const pack = game.packs.get(compendiumId);

    if (!pack)
      throw new Error(`Invalid compendium in FCBJournalEntryPage ${compendiumId}`);

    let folder;
    if (folderName) {
      folder = pack?.folders.find(f => f.name === folderName);
      if (!folder) {
        // make it
        // we're just going to hardcode this for now, but Entries go inside the Entries folders
        if (!['Characters', 'Locations', 'Organizations', 'PCs'].includes(folderName)) {
          folder = await makeFolder(folderName, compendiumId);
        } else {
          // make sure the Entries folder exists
          let entryFolder = pack?.folders.find(f => f.name === 'Entries');
          if (!entryFolder) {
            entryFolder = await makeFolder('Entries', compendiumId);
          }

          folder = await makeFolder(folderName, compendiumId, entryFolder?.id)
        }
      }
    }

    const options = { 
      name,
      folder: folder?.id ? folder.id : undefined,
      flags: {
        [moduleId]: {
          [JournalEntryFlagKey.campaignBuilderType]: this._documentType,
          [JournalEntryFlagKey.originalPackId]: compendiumId
        },
        core: {
          sheetClass: `${moduleId}._CampaignBuilderApplication`
        }
      }
    };

    // create a wrapping journal entry for the content with flag set during creation
    const journalEntry = await JournalEntry.create(options, { pack: compendiumId });
  
    if (!journalEntry)
      throw new Error('Couldn\'t create new journal entry');
  
    // Set the originalUuid flag to point to itself (this persists when copied to world)
    await journalEntry.setFlag(moduleId, JournalEntryFlagKey.originalUuid, journalEntry.uuid);
  
    const pageData = foundry.utils.mergeObject({
      type: this._documentType,
      name: name,
      system: this._defaultSystem,
    }, initialData) as JournalEntryPage.CreateData;

    // now add the page
    const pages = await journalEntry.createEmbeddedDocuments('JournalEntryPage', [pageData]) as unknown as DocClass[];
  
    if (!pages || pages.length === 0)
      throw new Error('Couldn\'t create new journal entry page');

    // rebuild the index (by adding a random field name) because otherwise it won't pick up the page
    // see Foundry bug: https://github.com/foundryvtt/foundryvtt/issues/9984
    // don't really need to await this
    // @ts-ignore
    void pack.getIndex({ fields: [foundry.utils.randomID()]});

    return new this(journalEntry) as InstanceType<T>;
  }
  
}

async function makeFolder(folderName: string, compendiumId: string, parentFolderId?: string): Promise<Folder<'JournalEntry'>> {
  const options = { 
    name: folderName,
    folder: parentFolderId ? parentFolderId : undefined,
    type: 'JournalEntry' as const,
    sorting: 'a' as const,
  };

  const folders = await Folder.createDocuments([options], { pack: compendiumId });
      
  if (!folders)
    throw new Error('Invalid folder in FCBJournalEntryPage.makeFolder()');

  return folders[0] as Folder<'JournalEntry'>;
}

  /**
   * Sanitizes HTML content in custom fields that are of type Editor.
   * This must be called before saving to ensure HTML is cleaned before being sent to the server.
   */
  function sanitizeCustomFields(customFields: Record<string, string>): void {
    // we just sanitize every field because we don't yet have the custom field infrastructure 
    // TODO: could make this more efficient once we have that 

    if (!customFields || typeof customFields !== 'object') 
      return;

    for (const fieldName in customFields) {
      // const field = customFields[fieldName];
      // if (field.fieldType !== FieldType.Editor) 
      //   continue;

      customFields[fieldName] = sanitizeHTML(customFields[fieldName]);
    }
  }
