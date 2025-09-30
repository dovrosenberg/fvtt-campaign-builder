/** 
 * Wraps our special journal entry pages and provides functionality to:
 *    - Keep the name of the entry in sync with the name of the page
 *    - Pass through the system object to avoid needing to define getters/setters
 *    - Provide the create/save/delete functionality
 * 
 */
import { DOCUMENT_TYPES, } from '@/documents';

type Constructor<T = {}> = new (...args: any[]) => T;

type ValidDocType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

type SettingCompendium = CompendiumCollection<'JournalEntry'>;


export function FCBJournalEntryPageMixin<
  DocType extends ValidDocType,
  JEPageType extends JournalEntryPage<any> = JournalEntryPage<any>
>(DocClass: Constructor<any>, documentSubtype: DocType) {
  return class FCBJournalEntryPage extends (DocClass as any) {
    static folderName: string;
    static defaultSystem: Record<string, any>;

    /** convert the raw foundry document to our mixed in version */
    static fromDocument<T extends JEPageType>(foundryDoc: T): T & T['system'] {
      // Change the prototype of the foundry document to our mixin class
      // This preserves all the original document's properties and methods
      // while adding our custom functionality
      Object.setPrototypeOf(foundryDoc, this.prototype);

      return foundryDoc as T & T['system'];
    }

    static async fromUuid(contentId: string): Promise<(JEPageType & JEPageType['system']) | null> {
      const foundryDoc = await fromUuid(contentId) as unknown as JEPageType | null;
  
      if (!foundryDoc)
        return null;
      
      if (foundryDoc.type !== documentSubtype)
        throw new Error('Invalid document type in FCBJournalEntryPage.fromUuid()');
    
      return this.fromDocument(foundryDoc);
    }
  
  
    /**
     * The name of the entry
     */
    public get name(): string {
      return super.name;
    } 
  
    // want to set it on the page and the parent JE
    public set name(value: string) {
      super.name = value;
      if (this.parent)
        this.parent.name = value;
    } 
  
      
    /**
     * Creates a new content wrapper.  Does not add to Setting (but does put in the compendium).
     * 
     * @param {string} compendiumId - The compendium to create the content in. 
     * @param {ValidDocType} documentType - The subtype of JournalEntryPage
     * @param {string} name - The name of the content wrapper (i.e. the name of the content)
     * @returns A promise that resolves when the page has been created with either the page or null for failure
     */
    static async create(compendiumId: string, documentType: ValidDocType, name: string
    ): Promise<(JEPageType & JEPageType['system']) | null> {
      // find the folder it goes in 
      const pack = game.packs.get(compendiumId);
      let folder = pack?.folders.find(f => f.name === this.folderName);
      if (!folder) {
        // make it
        const folders = await Folder.createDocuments([{
          name: this.folderName,
          type: 'JournalEntry' as const,
          sorting: 'a' as const,
        }], { pack: compendiumId });

        if (!folders)
          throw new Error('Invalid folder in FCBJournalEntryPage.create()');

        folder = folders[0];
      }

      // create a jourthe wrapping journal entry for the content
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
        type: documentType as any,
        name: name,
        system: this.defaultSystem
      }],{
        parent: journalEntry,
      }) as unknown as JEPageType[];
  
      if (!pages || pages.length === 0)
        throw new Error('Couldn\'t create new journal entry page');
      
      return this.fromDocument(pages[0]);
    }
     
    /**
     * Updates the name and underlying document in the database
     * 
     * @returns {Promise<FCBJournalEntryPage | null>} The updated FCBJournalEntryPage, or null if the update failed.
     */
    public async save(): Promise<FCBJournalEntryPage | null> {
      // update the name on the wrapper
      if (!this.parent)
        return null;

      await this.parent.update({ name: this.name });

      // now save the page
      const retval = await this.update({
        name: this.name,
        text: { content: this.text.content },
        system: this.system
      });
    
      return retval ? this : null;
    }

    // this is the compendium for the setting
    public get compendium(): SettingCompendium {
      const packId = this.pack;
  
      if (!packId)
        throw new Error('Missing packId in Setting.compendium()');
      
      return game.packs.get(packId) as SettingCompendium;
    };   
  
   
    /**
     * The id of the compendium its in
     */
    public get compendiumId(): string {
      return this.compendium.metadata.id;
    }  
  }
}
