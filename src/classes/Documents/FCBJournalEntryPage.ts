import { DOCUMENT_TYPES } from '@/documents/types';
import { toRaw } from 'vue';

type ValidDocType = typeof DOCUMENT_TYPES.Setting;

//pull the DocType out of a constructor for a child
type DocTypeOf<T> =
  T extends new (doc: JournalEntryPage<infer D>, ...args: any) => any ? D : never;

// get the DocClass out of a constructor for a child
type DocClassOf<T> = JournalEntryPage<DocTypeOf<T>>;

export class FCBJournalEntryPage<
  DocType extends ValidDocType,
  DocClass extends JournalEntryPage<DocType> = JournalEntryPage<DocType>
> {
  protected _clone: DocClass;
  protected _doc: DocClass;

  protected static _defaultSystem: DocClassOf<any>['system'];
  protected static _folderName: string;
  protected static _documentType: ValidDocType;

  constructor(doc: DocClass) {
    this._doc = doc;
    this._clone = doc.clone({}, { keepId: true });
  }

  get uuid(): string {
    return this._clone.uuid;
  }

  get name(): string {
    return this._clone.name;
  }

  set name(value: string)  {
    this._clone.name = value;

    // also set the parent
    if (this._clone.parent)
      this._clone.parent.name = value;
  }

  get compendiumId(): string {
    return this._doc.pack || '';
  }

  get compendium(): CompendiumCollection<'JournalEntry'> | null { 
    return (game.packs.get(this.compendiumId) || null) as unknown as CompendiumCollection<'JournalEntry'> | null;
  }
  
  static async fromUuid<
    T extends typeof FCBJournalEntryPage,
  > (this: T, uuid: string): Promise<InstanceType<T> | null> {
    const doc = await fromUuid<DocClassOf<T>>(uuid) as DocClassOf<T> | undefined;

    if (!doc)
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
  public static async create<
    T extends typeof FCBJournalEntryPage,
  > (this: T, compendiumId: string, name: string): Promise<InstanceType<T> | null> {
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
  
    // now add the page
    const pages = await JournalEntryPage.createDocuments([{
      type: this._documentType,
      name: name,
      system: this._defaultSystem
    }],{
      parent: journalEntry,
    }) as unknown as DocClassOf<T>[];
  
    if (!pages || pages.length === 0)
      throw new Error('Couldn\'t create new journal entry page');
    
    return new this(pages[0]) as InstanceType<T>;
  }
  
}