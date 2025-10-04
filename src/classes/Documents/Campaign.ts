import { toRaw } from 'vue';
import { moduleId, ModuleSettings, SettingKey, } from '@/settings'; 
import { DOCUMENT_TYPES, CampaignLore } from '@/documents';
import { RelatedPCDetails, RelatedJournal, SessionIndex } from '@/types';
import { Entry, Session, FCBSetting } from '@/classes';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { ToDoItem, ToDoTypes, Idea } from '@/types';
import { FCBJournalEntryPage, } from './FCBJournalEntryPage';
import { JournalEntryFlagKey } from '@/settings';

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

  /**  the highest numbered session (if in play mode, this will be the played one, too) */
  public currentSession: Session | null;

  static override async fromUuid<
    DocType extends typeof DOCUMENT_TYPES.Campaign = typeof DOCUMENT_TYPES.Campaign,
    DocClass extends JournalEntryPage<DocType> = JournalEntryPage<DocType>,
    T extends CampaignConstructor<DocType, DocClass>=CampaignConstructor<DocType, DocClass>
  > (this: T, sessionId: string): Promise<InstanceType<T> | null> { 
    const campaign = await super.fromUuid(sessionId) as unknown as (Campaign | null);
    
    if (!campaign)
      return null;

    await campaign.loadCurrentSession();
        
    return campaign as InstanceType<T>;
  }

  // we return the next number after the highest currently existing session number
  // we calculate each time because it's fast enough and we don't need to continually be updating 
  //    metadata
  get nextSessionNumber(): number {
    return this.currentSession ? this.currentSession.number + 1 : 0;
  }

  async getSessions(): Promise<Session[]> {
    const allSessions = await this.filterSessions(()=>true);
    return allSessions;
  }

  public async loadCurrentSession(): Promise<void> {
    // load the current session
    // find the uuid of the one with the highest number
    const entries = await this.compendium.getIndex({
      fields: [
        // @ts-ignore
        'pages.uuid', 
        // @ts-ignore
        'pages.system.number'
      ]
    }) as unknown as Record<string, SessionIndex>;

    let maxNumber = -1;
    let maxsessionId = '';
    for (const index of Object.values(entries)) {
      if (!index.pages?.length)
        continue;

      if (index.pages[0].system.number > maxNumber) {
        maxNumber = index.pages[0].system.number;
        maxsessionId = index.pages[0].uuid;
      }
    }

    this.currentSession = await Session.fromUuid(maxsessionId);
  }    
  
  get sessionsIds(): string[] {
    return this._clone.system.sessionIds;
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
    return this._clone.system.todoItems as ToDoItem[];
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
      lastTouched: manualDate?.toISOString() || new Date().toISOString(),
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
       existingItem = (this._clone.system.todoItems as ToDoItem[]).find(i => i.linkedUuid === linkedUuid);
    } else if (sessionUuid) {
       existingItem = (this._clone.system.todoItems as ToDoItem[]).find(i => i.sessionUuid === sessionUuid && i.type === type);
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
        existingItem.lastTouched = new Date().toISOString();
      } else {
        // make sure the text isn't already in there
        if (!existingItem.text.includes(text))
          existingItem.text += '; ' + text;
        existingItem.lastTouched = new Date().toISOString();
      }

    await this.save();
}

  async updateToDoItem(uuid: string, newDescription: string): Promise<void> {
    const item = this._clone.system.todoItems.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newDescription;
    item.lastTouched = new Date().toISOString();
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
    let name = '' as string | null;

    while (name==='') {  // if hit ok, must have a value
      name = await FCBDialog.inputDialog(localize('dialogs.createCampaign.title'), `${localize('dialogs.createCampaign.campaignName')}:`); 
    }  

    // if name is null, then we cancelled the dialog
    if (!name)
      return null;
    
    // create a journal entry for the campaign
    const campaign = await super._create(setting.compendiumId, name) as unknown as Campaign;  

    if (!campaign)
      throw new Error('Couldn\'t create new journal entry for campaign');

    return campaign;
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
      for (let i=0; i<this._clone.system.pcs.length; i++) {
        if (filterFn(this._clone.system.pcs[i])) {
          const entry = await Entry.fromUuid(this._clone.system.pcs[i].uuid);
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
  public async filterSessions(filterFn: (s: SessionIndex) => boolean): Promise<Session[]> { 
    //we make available the fields on the JournalEntry index

    // get all the journal entries
    const flagKey = `${moduleId}.${JournalEntryFlagKey.campaignBuilderType}`;
    const entries = await this.compendium.getIndex({
      fields: [
        // @ts-ignore
        `flags.${flagKey}`, 
        // @ts-ignore
        'pages.uuid', 
        // @ts-ignore
        'pages.name'
      ]
    });

    // find the sessions connected to this campaign

    const sessions = entries
      // first find the relevant ones
      .filter((e)=> (
        // @ts-ignore
        e.flags?.flagKey===DOCUMENT_TYPES.Session &&
        // @ts-ignore
        e.pages?.find((p: SessionIndex)=> this._clone.system.sessionIds.includes(p.uuid))
      ))
      .map((e) => ({ name: e.name, uuid: e.uuid } as SessionIndex))

      // now filter by the function passed in 
      .filter((s: SessionIndex)=> filterFn(s)) || [];

    let retval = [] as Session[];
    for (let i=0; i<sessions.length; i++) {
      const session = await Session.fromUuid(sessions[i].uuid);
      if (session)
        retval.push(session);
    }

    return retval;
  }

  
  /**
   * Updates a campaign in the database 
   * 
   * @returns Promise that returns after the update
   */
  public async save(): Promise<void> {
    const updateName = this._clone.name !== this.doc.name;

    await super.save();

    // update the name
    if (updateName) {    
      let setting = await FCBSetting.fromUuid(this.settingId);

      if (!setting)
        throw new Error('Invalid setting in Campaign.save()');

      await setting.updateCampaignName(this.uuid, this.name);
    }
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