import { toRaw } from 'vue';
import { moduleId, ModuleSettings, SettingKey, } from '@/settings'; 
import { DOCUMENT_TYPES, CampaignLore } from '@/documents';
import { RelatedPCDetails, RelatedJournal } from '@/types';
import { Entry, Session, FCBSetting } from '@/classes';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { ToDoItem, ToDoTypes, Idea } from '@/types';
import { FCBJournalEntryPage } from './FCBJournalEntryPage';

type CampaignDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Campaign>;

type CampaignConstructor<
  DocType extends typeof DOCUMENT_TYPES.Campaign = typeof DOCUMENT_TYPES.Campaign,
  DocClass extends JournalEntryPage<DocType> = JournalEntryPage<DocType>
> = {
  // constructor
  new (doc: DocClass, ...args: any[]): Campaign;
  // required statics used by base helpers
  _defaultSystem: DocClass['system'];
  _folderName: string;
  _documentType: DocType;
};

// represents a topic entry (ex. a character, location, etc.)
export class Campaign extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Campaign> {
  static override _folderName = 'Campaigns';
  static override _documentType = DOCUMENT_TYPES.Campaign;
  static override _defaultSystem = { 
    description: '',  
    houseRules: '',  
    sessions: [],
    lore: [],  
    img: '',   
    todoItems: [],   
    ideas: [],   
    journals: [], 
    pcs: [],
  } as unknown as CampaignDocClass['system'];

  // public setting: FCBSetting | null;  // the setting the campaign is in (if we don't setup up front, we can load it later)


  /**  get the highest numbered session (if in play mode, this will be the played one, too) */
  get currentSession (): Session | null {
    TODO! WE NEED TO STORE THE CURRENT SESSION ID IN THE CAMPAIGN DOC AND UPDATE WHEN IT CHANGES
    let maxNumber = 0;
    let doc: Session | null = null;

    this._clone.sessions.forEach((sessionId: string) => {

      if (page.type === DOCUMENT_TYPES.Session && (page as unknown as SessionDoc).system.number > maxNumber) {
        doc = page as unknown as SessionDoc;
        maxNumber = doc.system.number;
      }
    });

    return doc ? new Session(doc, this) : null;
  }

  // we return the next number after the highest currently existing session number
  // we calculate each time because it's fast enough and we don't need to continually be updating 
  //    metadata
  get nextSessionNumber(): number {
    TODO! WE NEED TO STORE THE CURRENT SESSION ID IN THE CAMPAIGN DOC AND UPDATE WHEN IT CHANGES
    let maxNumber = 0;
    toRaw(this._doc).pages.forEach((page: JournalEntryPage) => {
      if (page.type === DOCUMENT_TYPES.Session && (page as unknown as SessionDoc).system.number > maxNumber)
        maxNumber = (page as unknown as SessionDoc).system.number;
    });

    return maxNumber + 1;
  }

  get sessions(): Session[] {
    // just return all the sessions
    return this.filterSessions(()=>true);
  }

  get description(): string {
    return this._clone.system.description;
  }

  set description(value: string) {
    this._clone.system.description = value;
  }

  public get houseRules(): string {
    return this._clone.system.houseRules;
  }

  public set houseRules(value: string) {
    this._clone.system.houseRules = value;
  }

  public get img(): string {
    return this._clone.system.img;
  }

  public set img(value: string) {
    this._clone.system.img = value;
  }

  public get lore(): CampaignLore[] {
    return this._clone.system.lore;
  }
  
  set lore(value: CampaignLore[] | readonly CampaignLore[]) {
    this._clone.system.lore = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  // returns the uuid
  async addLore(description: string): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._clone.system.lore.push({
      uuid: uuid,
      description: description,
      delivered: false,
      significant: true,
      journalEntryPageId: null,
      lockedToSessionId: null,
      lockedToSessionName: null,
      sortOrder: this._clone.system.lore.reduce((max, lore) => Math.max(max, lore.sortOrder), -1) + 1,
    });

    await this.save();
    return uuid;
  }

  async updateLoreDescription(uuid: string, description: string): Promise<void> {
    const lore = this._clone.system.lore.find(l=> l.uuid===uuid);

    if (!lore)
      return;

    lore.description = description;

    await this.save();
  }

  async updateLoreJournalEntry(loreUuid: string, journalEntryPageId: string | null): Promise<void> {
    const lore = this._clone.system.lore.find(l=> l.uuid===loreUuid);

    if (!lore)
      return;

    lore.journalEntryPageId = journalEntryPageId;

    await this.save();
  }

  async deleteLore(uuid: string): Promise<void> {
    this._clone.system.lore = this._clone.system.lore.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  async markLoreDelivered(uuid: string, delivered: boolean): Promise<void> {
    const lore = this._clone.system.lore.find((l) => l.uuid===uuid);
    if (!lore)
      return;
    
    lore.delivered = delivered;

    await this.save();
  }

  get todoItems(): readonly ToDoItem[] {
    return this._clone.system.todoItems;
  }

  set todoItems(value: ToDoItem[] | readonly ToDoItem[]) {
    this._clone.system.todoItems = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  /** Creates a new to-do item and adds to the campaign*/
  async addNewToDoItem(type: ToDoTypes, text: string, linkedUuid?: string | null | undefined, sessionUuid?: string, manualDate?: Date): Promise<ToDoItem | null> {
    if (!ModuleSettings.get(SettingKey.enableToDoList)) 
      return null;

    // manual entries/generated names don't have a linked uuid, but the others do
    const typesWithoutUuid = [
      ToDoTypes.Manual,  // no link
      ToDoTypes.GeneratedName,  // no link 
      ToDoTypes.Lore,  // link to session
      ToDoTypes.Vignette,  // link to session
      ToDoTypes.Monster,  // link to session
      ToDoTypes.Item     // link to session
    ];

    if ((!linkedUuid && !typesWithoutUuid.includes(type)) || (linkedUuid && typesWithoutUuid.includes(type))) {
      throw new Error('Invalid linkedUuid for type in Campaign.addToDoItem()');
    }

    let entry;
    if (type === ToDoTypes.Entry && linkedUuid) {
      entry = await Entry.fromUuid(linkedUuid);
    }

    // give it the max sortOrder
    const item: ToDoItem = {
      uuid: foundry.utils.randomID(),
      lastTouched: manualDate || new Date(),
      manuallyUpdated: false,
      linkedUuid: linkedUuid || null,
      sessionUuid: sessionUuid || null,
      linkedText: entry ? entry.name : null,
      text: text || '',
      sortOrder: this._clone.system.todoItems.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
      type: type || ToDoTypes.Manual,
    };

    this._clone.system.todoItems.push(item);
    await this.save();

    return item;
  }

  /**
   * Adds a to-do item to the campaign. If there is already one with a matching linkeduuid, it adds the text
   * to the end of the current text.  Otherwise, it creates a new one.
   * 
   */
  async mergeToDoItem(type: ToDoTypes, text: string, linkedUuid?: string | null | undefined, sessionUuid?: string): Promise<void> {
    // Check if to-do list is enabled
    if (!ModuleSettings.get(SettingKey.enableToDoList)) 
      return;

    // see if one exists for this linked uuid
    let existingItem = undefined as ToDoItem | undefined;
    if (linkedUuid) {
       existingItem = this._clone.system.todoItems.find(i => i.linkedUuid === linkedUuid);
    } else if (sessionUuid) {
       existingItem = this._clone.system.todoItems.find(i => i.sessionUuid === sessionUuid && i.type === type);
    }

    // make sure the type matches
    if (existingItem && existingItem.type !== type) {
      throw new Error(`To-do item with linkedUuid ${linkedUuid} already exists with different type in Campaign.mergeToDoItem()`);
    }

    // otherwise, if we have one, add the text to the end of the current text
    // if we don't have one, create a new one
    if (!existingItem) {
      await this.addNewToDoItem(type, text, linkedUuid || undefined, sessionUuid);
      return;
    } else if (existingItem.manuallyUpdated) {
        // if it's manually updated, we don't want to add to it but note the timestamp
        existingItem.lastTouched = new Date();
      } else {
        // make sure the text isn't already in there
        if (!existingItem.text.includes(text))
          existingItem.text += '; ' + text;
        existingItem.lastTouched = new Date();
      }

    await this.save();
}

  async updateToDoItem(uuid: string, newDescription: string): Promise<void> {
    const item = this._clone.system.todoItems.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newDescription;
    item.lastTouched = new Date();
    item.manuallyUpdated = true;

    await this.save();
  }

  async completeToDoItem(uuid: string): Promise<void> {
    this._clone.system.todoItems = this._clone.system.todoItems.filter(i => i.uuid !== uuid);
    await this.save();
  }

  get journals(): RelatedJournal[] {
    return this._clone.system.journals;
  }

  set journals(value: RelatedJournal[] | readonly RelatedJournal[]) {
    this._clone.system.journals = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  get ideas(): readonly Idea[] {
    return this._clone.system.ideas;
  }

  set ideas(value: Idea[] | readonly Idea[]) {
    this._clone.system.ideas = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  get pcs(): RelatedPCDetails[] {
    return this._clone.system.pcs;
  }

  set pcs(value: RelatedPCDetails[] | readonly RelatedPCDetails[]) {
    this._clone.system.pcs = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  /** Creates a new idea item and adds to the campaign*/
  /** returns the uuid */
  async addIdea(text: string): Promise<string | null> {
    const item: Idea = {
      uuid: foundry.utils.randomID(),
      text: text || '',
      sortOrder: this._clone.system.ideas.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
    };

    this._clone.system.ideas.push(item);
    await this.save();

    return item.uuid;
  }

  async updateIdea(uuid: string, newText: string): Promise<void> {
    const item = this._clone.system.ideas.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newText;
    await this.save();
  }

  async deleteIdea(uuid: string): Promise<void> {
    this._clone.system.ideas = this._clone.system.ideas.filter(i => i.uuid !== uuid);
    await this.save();
  }

  /**
   * Creates a new campaign.  Prompts for a name.
   * 
   * @param {FCBSetting} setting - The setting to create the campaign in. 
   * @returns A promise that resolves when the campaign has been created, with either the resulting entry or null on error
   */
  static async create(setting: FCBSetting): Promise<Campaign | null> {
    // get the name
    let name;

    do {
      name = await FCBDialog.inputDialog(localize('dialogs.createCampaign.title'), `${localize('dialogs.createCampaign.campaignName')}:`); 

      if (name) {
        let newCampaignDoc: CampaignDoc;

        // create a journal entry for the campaign
        newCampaignDoc = await JournalEntry.create({
          name: name,
          folder: foundry.utils.parseUuid(setting.uuid).id,
        },{
          pack: setting.pack,
        }) as unknown as CampaignDoc;  

        if (!newCampaignDoc)
          throw new Error('Couldn\'t create new journal entry for campaign');

        const newCampaign = new Campaign(newCampaignDoc, setting);
        await newCampaign.setup();

        const campaignNames = {
          ...setting.campaignNames,
          [newCampaign.uuid]: name,
        };
        await setting.update({system: {campaignNames}});
        
        return newCampaign;
      }
    } while (name==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }
  
  /**
   * Find all PCs for a given campaign
   * @todo   At some point, may need to make reactive (i.e. filter by what's been entered so far) or use algolia if lists are too long; 
   *            might also consider making every topic a different subtype and then using DocumentIndex.lookup  -- that might give performance
   *            improvements in lots of places
   * @returns a list of Entries
   */
  public async getPCs(): Promise<Entry[]> {
    // we find all journal entries with this topic
    return await this.filterPCs(()=>true);
  }

    /**
   * Given a filter function, returns all the matching Sessions
   * inside this campaign
   * 
   * @param {(e: RelatedPCDetails) => boolean} filterFn - The filter function
   * @returns {Entry[]} The entries that pass the filter
   */
    public async filterPCs(filterFn: (e: RelatedPCDetails) => boolean): Promise<Entry[]> { 
      let retval = [] as Entry[];
      for (let i=0; i<this._pcs.length; i++) {
        if (filterFn(this._pcs[i])) {
          const entry = await Entry.fromUuid(this._pcs[i].uuid);
          if (entry)
            retval.push(entry);
        }
      }

      return retval;
    }
  
  /**
   * Given a filter function, returns all the matching Sessions
   * inside this campaign
   * 
   * @param {(e: Session) => boolean} filterFn - The filter function
   * @returns {Session[]} The entries that pass the filter
   */
  public filterSessions(filterFn: (e: Session) => boolean): Session[] { 
    return (toRaw(this._doc).pages.contents as unknown as SessionDoc[])
      .filter((p) => p.type===DOCUMENT_TYPES.Session)
      .map((s: SessionDoc)=> new Session(s, this))
      .filter((s: Session)=> filterFn(s)) || [];
  }

  
  /**
   * Updates a campaign in the database 
   * 
   * @returns {Promise<Campaign | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Campaign | null> {
    const updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    let success = false;
    let setting = await this.getSetting();

    if (Object.keys(updateData).length !== 0) {
      // protect any complex flags
      if (updateData.flags && updateData.flags[moduleId])
        updateData.flags[moduleId] = this.prepareFlagsForUpdate(updateData.flags[moduleId]);

      // note: update returns null if nothing changed
      try {
        const retval = await toRaw(this._doc).update(updateData) || null;
        if (retval) {
          this._doc = retval;
        }
          
        this._cumulativeUpdate = {};
        success = true;
      } catch (e) {
        console.error('Failed to update campaign', e);
      }

      // update the name
      if (updateData.name !== undefined) {
        await setting.updateCampaignName(this.uuid, updateData.name);
      }
    }
    
    return success ? this : null;
  }

  /**
   * Deletes a campaign from the database, along with all the related sessions
   * 
   * @returns {Promise<void>}
   */
  public async delete() {
    if (!this._doc)
      return;

    const id = this._doc.uuid;

    let setting = await FCBSetting.fromUuid(this.settingId);

    if (!setting)
      throw new Error('Invalid setting in Campaign.delete()');

    await this._doc.delete();

    await setting.deleteCampaignFromSetting(id);
  }
}