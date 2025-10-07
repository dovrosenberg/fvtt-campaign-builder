import { toRaw } from 'vue';
import { JournalEntryFlagKey, moduleId, ModuleSettings, SettingKey } from '@/settings';
import { ValidDocType } from '@/types';
import { FCBSetting } from './FCBSetting';
import { getGlobalSetting } from '@/classes';

//pull the DocType out of a constructor for a child
type DocTypeOf<T> =
  T extends new (doc: JournalEntryPage<infer D>, ...args: any) => any ? D : never;

// get the DocClass out of a constructor for a child
type DocClassOf<T> = JournalEntryPage<DocTypeOf<T>>;

// Helper: the static side every subclass must provide
export type FCBJournalEntryPageStatic<
  DocType extends ValidDocType,
  DocClass extends JournalEntryPage<DocType>
> = {
  // constructor
  new (doc: DocClass, ...args: any[]): FCBJournalEntryPage<DocType, DocClass>;
  // required statics used by base helpers
  _defaultSystem: DocClass['system'];
  _folderName: string;
  _documentType: DocType;
};

export class FCBJournalEntryPage<
  DocType extends ValidDocType,
  DocClass extends JournalEntryPage<DocType> = JournalEntryPage<DocType>
> {
  protected _clone: DocClass;
  protected _doc: DocClass;

  static _defaultSystem: DocClassOf<any>['system'];
  static _folderName: string;
  static _documentType: ValidDocType;

  constructor(doc: DocClass) {
    this._doc = doc;
    this._clone = doc.clone({}, { keepId: true });
  }

  public get uuid(): string {
    return this._clone.uuid;
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

  public get compendiumId(): string {
    return this._doc.pack || '';
  }

  public get compendium(): CompendiumCollection<'JournalEntry'> { 
    return game.packs.get(this.compendiumId) as unknown as CompendiumCollection<'JournalEntry'>;
  }

  public get settingId(): string {
    const settings = ModuleSettings.get(SettingKey.settingIndex);

    const setting = settings.find(s => s.packId === this._doc.pack);

    if (!setting)
      throw new Error(`Setting not found for FCBJournalEntryPage ${this.uuid}`);
    
    return setting.settingId;
  }

  public async getSetting(): Promise<FCBSetting> {
    return await getGlobalSetting(this.settingId);
  }


  static async fromUuid<
    DocType extends ValidDocType,
    DocClass extends JournalEntryPage<DocType>,
    T extends FCBJournalEntryPageStatic<DocType, DocClass>
  > (this: T, uuid: string): Promise<InstanceType<T> | null> {
    const doc = await fromUuid<DocClass>(uuid) as DocClass | undefined;

    if (!doc || doc.documentName !== 'JournalEntryPage' || doc.type !== this._documentType)
      return null;
    else {
      const fcbDoc = new this(doc) as InstanceType<T>;
      return fcbDoc;
    }
  }

  /**
   * Updates document in the database and updates the name on the parent
   *    journal entry if needed
   * 
   */
  async save(): Promise<void> {
    if (!this._doc.parent)
      return;
  
    try {
      // update the name on the wrapper
      if (this._doc.name !== this._clone.name) {
        // because the child class objects can get proxied by Vue, this might be proxied, 
        //   which can then cause issues with the update
        await toRaw(this._doc)?.parent?.update({ name: this._clone.name });
      }
        
      // now save the page
      // need to pass false to toObject to use the current in memory version
      const retval = await toRaw(this._doc)?.update(this._clone.toObject(false))  as DocClass | undefined;

      // no update done; should probably reload clone to avoid data loss
      if (!retval) {
        this._clone = await this._doc.clone({}, { keepId: true });
      } else {
        // reset the doc and clone
        this._doc = retval;
        this._clone = retval.clone({}, { keepId: true });
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
  > (this: T, compendiumId: string, name: string, initialData: Record<string, unknown> = {}): Promise<InstanceType<T> | null> {
    // find the folder it goes in 
    const pack = game.packs.get(compendiumId);
    let folder = pack?.folders.find(f => f.name === this._folderName);
    if (!folder) {
      // make it
      const folders = await Folder.createDocuments([{
        name: this._folderName,
        type: 'JournalEntry' as const,
        sorting: 'a' as const,
      }], { pack: compendiumId });
  
      if (!folders)
        throw new Error('Invalid folder in FCBJournalEntryPage.create()');
  
      folder = folders[0];
    }
  
    // create a wrapping journal entry for the content
    const journalEntry = await JournalEntry.create({
      name: name,
      folder: folder.id,
    },{
      pack: compendiumId,
    });
  
    if (!journalEntry)
      throw new Error('Couldn\'t create new journal entry');

    // flag it
    await journalEntry.setFlag(moduleId, JournalEntryFlagKey.campaignBuilderType, this._documentType);
  
    const pageData = foundry.utils.mergeObject({
      type: this._documentType,
      name: name,
      system: this._defaultSystem,
    }, initialData) as JournalEntryPage.CreateData;

      // now add the page
    const pages = await JournalEntryPage.createDocuments([pageData],{
      parent: journalEntry,
    }) as unknown as DocClass[];
  
    if (!pages || pages.length === 0)
      throw new Error('Couldn\'t create new journal entry page');
    
    return new this(pages[0]) as InstanceType<T>;
  }
  
}