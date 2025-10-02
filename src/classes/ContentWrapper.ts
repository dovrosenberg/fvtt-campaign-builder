import { toRaw } from 'vue';
import { ContentWrapperDoc, ContentWrapperFlagKey, contentWrapperFlagSettings, DOCUMENT_TYPES,  } from '@/documents';
import { DocumentWithFlags, FCBSetting } from '@/classes';
import { ContentType } from '@/types';
import { moduleId } from '@/settings';

// map the JournalEntryPage subtypes to the ContentType enum
export type PageDocType<T extends ContentType> = 
  // T extends ContentType.Campaign ? CampaignDoc :
  // T extends ContentType.Session ? SessionDoc :
  // T extends ContentType.Entry ? EntryDoc :
  // T extends ContentType.Setting ? SettingDoc:
  never;

const ContentDocumentTypes = { 
  [ContentType.Campaign]: DOCUMENT_TYPES.Campaign,
  [ContentType.Session]: DOCUMENT_TYPES.Session,
  [ContentType.Entry]: DOCUMENT_TYPES.Entry,
};

// represents the journal entry wrapper around content
// we use JournalEntryPage to store all the details, because it supports data models
// so all we need on the journal entry is the name and a flag to let us know it's one of ours
//    and a flag to tell us the content type (which is used when opening the entry directly
//    to pull up the content)  

// we manage and expose the page from this class so that in derived classes we can
//    just expose the wrapped content and not have to worry about the fact that it's
//    inside a page that's inside a journal entry

export abstract class ContentWrapper<T extends ContentType> extends DocumentWithFlags<ContentWrapperDoc> {
  static override _documentName = 'JournalEntry';
  static override _flagSettings = contentWrapperFlagSettings;

  /** Returns the default values for the system object in the JournalEntryPage */
  protected abstract _getDefaultContent(): Record<string, any>;

  /** the name of the folder these go in */
  protected static _getFolderName = () => '';

  public setting: FCBSetting | null;  // the setting the content is in (if we don't setup up front, we can load it later)

  /**
   * 
   * @param {ContentWrapperDoc} contentWrapperDoc - The content wrapper Foundry JournalEntry
   * @param {FCBSetting} setting - The setting the campaign is in
   */
  constructor(contentWrapperDoc: ContentWrapperDoc, contentType: ContentType, setting?: FCBSetting) {
    super(contentWrapperDoc, ContentWrapperFlagKey.isContentWrapper);

    // make sure it's the right kind of document
    if (contentWrapperDoc.getFlag(moduleId, ContentWrapperFlagKey.contentType) as ContentType !== contentType)
      throw new Error('Invalid document type in FCBSetting constructor');
    

    this.setting = setting || null;
  }

  protected get _page(): PageDocType<T> {
    return toRaw(this._doc).pages.contents[0] as unknown as PageDocType<T>;
  }

  override async _getSetting(): Promise<FCBSetting> {
    return await this.getSetting();
  };
  
  static async docFromUuid<T extends ContentType>(contentId: string, contentType: T): Promise<ContentWrapperDoc | null> {
    const wrapperDoc = await fromUuid<ContentWrapperDoc>(contentId);

    if (!wrapperDoc)
      return null;
    
    const docContentType = wrapperDoc.getFlag(moduleId, ContentWrapperFlagKey.contentType) as T;
    if (!docContentType)
      throw new Error('Missing content type in ContentWrapper.fromUuid()');

    if (docContentType !== contentType)
      throw new Error('Invalid content type in ContentWrapper.fromUuid()');
    
    return wrapperDoc;
  }

  get uuid(): string {
    return this._doc.uuid;
  }

  get contentType(): ContentType {
    return this.getFlag(ContentWrapperFlagKey.contentType);
  }


  /**
   * The name of the entry
   */
  public get name(): string {
    return this._page.name;
  } 

  // want to set it on the wrapper and the underlying content
  public set name(value: string) {
    this._doc.name = value;
    this._page.name = value;
  } 


  /**
   * Gets the setting associated with a content wrapper, loading it if needed
   * 
   * @returns {Promise<FCBSetting>} A promise to the setting associated with the campaign.
   */
  public async getSetting(): Promise<FCBSetting> {
    if (!this.setting)
      await this.loadSetting();

    return (this.setting as unknown as FCBSetting);
  }
  
  /**
   * Gets the FCBSetting associated with the content. If the setting is already loaded, the promise resolves
   * to the existing setting; otherwise, it loads the setting and then resolves to it.
   * @returns {Promise<FCBSetting>} A promise to the setting associated with the content.
   */
  public async loadSetting(): Promise<FCBSetting> {
    if (this.setting)
      return this.setting;
    
    this.setting = await FCBSetting.fromUuid(this.settingId);

    if (!this.setting)
      throw new Error('Error loading setting in ContentWrapper.loadSetting()');

    return this.setting;
  }
  
  /**
   * The settingId for this content wrapper
   */
  public get settingId(): string {
    // if it belongs to us, it's in a pack
    if (!this._doc.pack)
      throw new Error('Missing pack in ContentWrapper.settingId()');
    
    return this._doc.pack;
  }
  

  /**
   * Creates a new content wrapper.  Does not add to FCBSetting (but does put in the compendium).
   * 
   * @param {string} settingId - The settingId to create the content in. 
   * @param {ContentType} contentType - The type of content (Campaign, Session, Entry)
   * @param {string} name - The name of the content wrapper (i.e. the name of the content)
   * @returns A promise that resolves when the wrapper has been created, with either the resulting entry or null on error
   */
  static async create<
    T extends ContentType, 
    Constructor extends new(...args: any[])=>ContentWrapper<T>
  >(
    this: Constructor, 
    settingId: string, 
    contentType: T,
    name: string
  ): Promise<InstanceType<Constructor> | null> {
    // find the folder it goes in 
    const pack = game.packs.get(settingId);
    let folder = pack?.folders.find(f => f.name === this._getFolderName());
    if (!folder) {
      // make it
      const folders = await Folder.createDocuments([{
        name: this._getFolderName(),
        type: 'JournalEntry' as const,
        sorting: 'a' as const,
      }], { pack: pack?.metadata.id});

      if (!folders)
        throw new Error('Invalid folder in ContentWrapper.create()');

      folder = folders[0];
    }

    // create a journal entry for the content
    const newContentWrapperDoc = await JournalEntry.create({
      name: name,
      folder: folder.id,
    },{
      pack: settingId,
    }) as unknown as ContentWrapperDoc | null;

    if (!newContentWrapperDoc)
      throw new Error('Couldn\'t create new content wrapper');

    // one-time setting of the content type (have to do this because the constructor checks it)
    await newContentWrapperDoc.setFlag(moduleId, ContentWrapperFlagKey.contentType, contentType);

    const newContentWrapper = new this(newContentWrapperDoc) as InstanceType<Constructor>;
    await newContentWrapper.setup();

    // now add the page
    await JournalEntryPage.createDocuments([{
      // @ts-ignore- we know this type is valid
      type: ContentDocumentTypes[contentType],
      name: name,
      system: newContentWrapper._getDefaultContent()
    }],{
      parent: newContentWrapperDoc,
    }) as unknown as PageDocType<T>[];

    return newContentWrapper;
  }
    
  /**
   * Updates the name and underlying document in the database
   * 
   * @returns {Promise<ContentWrapper<T> | null>} The updated ContentWrapper, or null if the update failed.
   */
  public async save(): Promise<ContentWrapper<T> | null> {
    // update the name on the wrapper
    await toRaw(this._doc).update({ name: this._page.name });
    
    // update the wrapped page  
    let retval: PageDocType<T> | null = null;
    // note: update returns null if nothing changed
    try {
      retval = await toRaw(this._page).update({
        name: this._page.name,
        text: { content: this._page.text.content },
        system: this._page.system
    }) || null;
    } catch (e) {
      console.error('Failed to update campaign', e);
    }
  
    return retval ? this : null;
  }
  
  /**
   * Deletes a wrapper from the database, along with the contained content
   * 
   * @returns {Promise<void>}
   */
  public async delete() {
    if (!this._doc)
      return;

    let setting = this.setting;
    if (!setting)
      setting = await this.loadSetting();

    await this._doc.delete();
  }   
}