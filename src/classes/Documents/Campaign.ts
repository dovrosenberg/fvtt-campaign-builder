import { toRaw } from 'vue';
import { moduleId, ModuleSettings, SettingKey, } from '@/settings'; 
import { DOCUMENT_TYPES, CampaignLore, sessionIndexFields } from '@/documents';
import { RelatedPCDetails, RelatedJournal, SessionFilterIndex, SessionBasicIndex } from '@/types';
import { Entry, Session, FCBSetting, getGlobalSetting } from '@/classes';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { ToDoItem, ToDoTypes, Idea } from '@/types';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic, } from './FCBJournalEntryPage';
import { JournalEntryFlagKey } from '@/settings';
import { searchService } from '@/utils/search';

type CampaignDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Campaign>;

// represents a topic entry (ex. a character, location, etc.)
export class Campaign extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Campaign> {
  static override _documentType = DOCUMENT_TYPES.Campaign;
  static override _defaultSystem = { 
    description: '',  
    sessions: [],
    lore: [],  
    img: '',   
    todoItems: [],   
    ideas: [],   
    journals: [], 
    pcs: [],
    customFields: {
     house_rules: '',  
    },
  } as unknown as CampaignDocClass['system'];
  
  public static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  > (this: T, uuid: string): Promise<InstanceType<T> | null> { 
    const campaign = await super.fromUuid(uuid) as unknown as (Campaign | null);
    
    if (!campaign)
      return null;

    return campaign as InstanceType<T>;
  }

  public async allSessions(): Promise<Session[]> {
    const allSessions = await this.filterSessions(()=>true);
    return allSessions;
  }

  public async resetCurrentSession(): Promise<void> {
    // find the uuid of the one with the highest number
    const entries = await toRaw(this.compendium).getIndex(sessionIndexFields())

    const maxSessionInfo = entries
      // first find the relevant ones
      .filter((e)=> (
        this._clone.system.sessions.find(s=> s.uuid===e.uuid) !== undefined &&
        e.flags?.[moduleId]?.[JournalEntryFlagKey.campaignBuilderType]===DOCUMENT_TYPES.Session &&
        !!e.pages && e.pages!.length > 0        
      ))
      .reduce((maxInfo: {num: number; sessionId: string}, e): { num: number; sessionId: string}=> {
        const number = e.pages![0].system.number;
        return {
          num: number > maxInfo.num ? number : maxInfo.num,
          sessionId: number > maxInfo.num ? e.uuid : maxInfo.sessionId
        }        
      }, {num:-1, sessionId:''})

    // no session found
    if (maxSessionInfo.num === -1) {
      this.currentSessionNumber = null;
      this.currentSessionId = null;
    } else {
      this.currentSessionNumber = maxSessionInfo.num;
      this.currentSessionId = maxSessionInfo.sessionId;
    }

    await this.save();
  }    
  
  public get sessionIndex(): SessionBasicIndex[] {
    return this._clone.system.sessions;
  }

  public set sessionIndex(value: SessionBasicIndex[]) {
    this._clone.system.sessions = value;
  }

  public async addSession(session: Session): Promise<void> {
    // Add to session index
    this._clone.system.sessions.push({
      uuid: session.uuid,
      name: session.name,
      number: session.number,
      date: session.date?.toLocaleDateString() || null,
    });

    if (this.currentSessionNumber==null || session.number > this.currentSessionNumber) {
      this.currentSessionNumber = session.number;
      this.currentSessionId = session.uuid;
    }
    
    await this.save();
  }

  public async deleteSession(session: Session): Promise<void> {
    
    // Remove from session index
    this._clone.system.sessions = this._clone.system.sessions.filter(s => s.uuid !== session.uuid);

    const reset = (session.uuid === this.currentSessionId);
    
    await this.save();

    if (reset)
      await this.resetCurrentSession();
  }
  
  public get description(): string {
    return this._clone.system.description;
  }

  public set description(value: string) {
    this._clone.system.description = value;
  }

  public get currentSessionNumber(): number | null {
    return this._clone.system.currentSessionNumber;
  }

  public set currentSessionNumber(value: number | null) {
    this._clone.system.currentSessionNumber = value;
  }

  public get currentSessionId(): string | null {
    return this._clone.system.currentSessionId;
  }

  public set currentSessionId(value: string | null) {
    this._clone.system.currentSessionId = value;
  }

  public get houseRules(): string {
    // @ts-ignore - fvtt bug
    return this._clone.system.customFields.house_rules;
  }

  public set houseRules(value: string) {
    // @ts-ignore - fvtt bug
    this._clone.system.customFields.house_rules = value;
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
  
  public set lore(value: CampaignLore[] | readonly CampaignLore[]) {
    this._clone.system.lore = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  // returns the uuid
  public async addLore(description: string): Promise<string> {
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

  public async updateLoreDescription(uuid: string, description: string): Promise<void> {
    const lore = this._clone.system.lore.find(l=> l.uuid===uuid);

    if (!lore)
      return;

    lore.description = description;

    await this.save();
  }

  public async updateLoreJournalEntry(loreUuid: string, journalEntryPageId: string | null): Promise<void> {
    const lore = this._clone.system.lore.find(l=> l.uuid===loreUuid);

    if (!lore)
      return;

    lore.journalEntryPageId = journalEntryPageId;

    await this.save();
  }

  public async deleteLore(uuid: string): Promise<void> {
    this._clone.system.lore = this._clone.system.lore.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  public async markLoreDelivered(uuid: string, delivered: boolean): Promise<void> {
    const lore = this._clone.system.lore.find((l) => l.uuid===uuid);
    if (!lore)
      return;
    
    lore.delivered = delivered;

    await this.save();
  }

  public get todoItems(): readonly ToDoItem[] {
    return this._clone.system.todoItems as ToDoItem[];
  }

  public set todoItems(value: ToDoItem[] | readonly ToDoItem[]) {
    this._clone.system.todoItems = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  /** Creates a new to-do item and adds to the campaign*/
  public async addNewToDoItem(type: ToDoTypes, text: string, linkedUuid?: string | null | undefined, sessionUuid?: string, manualDate?: Date): Promise<ToDoItem | null> {
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
  public async mergeToDoItem(type: ToDoTypes, text: string, linkedUuid?: string | null | undefined, sessionUuid?: string): Promise<void> {
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

  public async updateToDoItem(uuid: string, newDescription: string): Promise<void> {
    const item = this._clone.system.todoItems.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newDescription;
    item.lastTouched = new Date().toISOString();
    item.manuallyUpdated = true;

    await this.save();
  }

  public async completeToDoItem(uuid: string): Promise<void> {
    this._clone.system.todoItems = this._clone.system.todoItems.filter(i => i.uuid !== uuid);
    await this.save();
  }

  public get journals(): RelatedJournal[] {
    return this._clone.system.journals;
  }

  public set journals(value: RelatedJournal[] | readonly RelatedJournal[]) {
    this._clone.system.journals = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  public get ideas(): readonly Idea[] {
    return this._clone.system.ideas;
  }

  public set ideas(value: Idea[] | readonly Idea[]) {
    this._clone.system.ideas = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  public get pcs(): RelatedPCDetails[] {
    return this._clone.system.pcs;
  }

  public get completed(): boolean {
    return this._clone.system.completed;
  }

  public set completed(value: boolean) {
    this._clone.system.completed = value;
  }

  public set pcs(value: RelatedPCDetails[] | readonly RelatedPCDetails[]) {
    this._clone.system.pcs = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  /** Creates a new idea item and adds to the campaign*/
  /** returns the uuid */
  public async addIdea(text: string): Promise<string | null> {
    const item: Idea = {
      uuid: foundry.utils.randomID(),
      text: text || '',
      sortOrder: this._clone.system.ideas.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
    };

    this._clone.system.ideas.push(item);
    await this.save();

    return item.uuid;
  }

  public async updateIdea(uuid: string, newText: string): Promise<void> {
    const item = this._clone.system.ideas.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newText;
    await this.save();
  }

  public async deleteIdea(uuid: string): Promise<void> {
    this._clone.system.ideas = this._clone.system.ideas.filter(i => i.uuid !== uuid);
    await this.save();
  }

  /**
   * Moves an idea to the to-do list
   * @param uuid The UUID of the idea to move
   */
  public async moveIdeaToToDo(uuid: string): Promise<void> {
    const idea = this._clone.system.ideas.find(i => i.uuid === uuid);
    if (!idea)
      return;

    // Create a new to-do item with the idea's text
    await this.addNewToDoItem(ToDoTypes.Manual, idea.text);

    // Remove the idea
    this._clone.system.ideas = this._clone.system.ideas.filter(i => i.uuid !== uuid);
    await this.save();
  }

  /**
   * Moves a to-do item to the ideas list
   * @param uuid The UUID of the to-do item to move
   */
  public async moveToDoToIdea(uuid: string): Promise<void> {
    const toDo = this._clone.system.todoItems.find(i => i.uuid === uuid);
    if (!toDo)
      return;

    // Create a new idea with the to-do's text
    await this.addIdea(toDo.text);

    // Remove the to-do item
    this._clone.system.todoItems = this._clone.system.todoItems.filter(i => i.uuid !== uuid);
    await this.save();
  }

  /**
   * Creates a new campaign.  Prompts for a name.
   * 
   * @param {FCBSetting} setting - The setting to create the campaign in. 
   * @returns A promise that resolves when the campaign has been created, with either the resulting entry or null on error
   */
  static async create(setting: FCBSetting, name = ''): Promise<Campaign | null> {
    let nameToUse: string | null = name;

    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createCampaign.title'), `${localize('dialogs.createCampaign.campaignName')}:`); 
    }  

    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;
    
    // create a journal entry for the campaign
    const campaign = await super._create(setting.compendiumId, nameToUse, 'Campaigns') as unknown as Campaign;  

    if (!campaign)
      throw new Error('Couldn\'t create new journal entry for campaign');

    // add it to the setting's list
    setting.campaignNames[campaign.uuid] = nameToUse;
    await setting.save();
    
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
   * @param {(e: SessionFilterIndex) => boolean} filterFn - The filter function
   * @returns {Session[]} The entries that pass the filter
   */
  public async filterSessions(filterFn: (s: SessionFilterIndex) => boolean): Promise<Session[]> { 
    // TODO: we could make this more efficient if we wanted to 
    //    calc id
    // get all the journal entries
    const entries = await toRaw(this.compendium).getIndex(sessionIndexFields());

    // find the sessions connected to this campaign
    const sessions = entries
      // first find the relevant ones
      .filter((e)=> (
        this._clone.system.sessions.find(s=> s.uuid===e.uuid) !== undefined &&
        e.flags?.[moduleId]?.[JournalEntryFlagKey.campaignBuilderType]===DOCUMENT_TYPES.Session &&
        !!e.pages && e.pages!.length > 0 
      ))
      .map((e) => ({ 
        name: e.name, 
        id: e._id,
        uuid: e.uuid,
        number: e.pages![0].system.number 
      } as SessionFilterIndex))

      // now filter by the function passed in 
      .filter((s: SessionFilterIndex)=> filterFn(s)) || [];

    const idList = sessions.map((s)=> s.id);
    const documentSet = await this.compendium.getDocuments({ _id__in: idList });

    let retval = [] as Session[];
    for (const doc of documentSet) {
      const session = new Session(doc);
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
    // we attempt to save first - because if it fails, we don't 
    //    want to adjust anything else
    try {
      const justCompleted = this._clone.system.completed && !this._doc?.system.completed;
      const justIncompleted = !this._clone.system.completed && this._doc?.system.completed;

      await super.save();

      // if we just changed completed status, we need to make some changes
      if (justCompleted || justIncompleted) {
        const setting = await this.getSetting();

        if (justCompleted) {
          // collapse the node
          await setting.collapseNode(this.uuid);

          // remove from search results
          const sessions = await this.allSessions();
          for (const session of sessions) {
            searchService.removeEntry(session.uuid);
          }

          // clear the email-to setting if it was set to this one
          if (ModuleSettings.get(SettingKey.emailDefaultCampaign)===this.uuid)
            await ModuleSettings.set(SettingKey.emailDefaultCampaign, '');
        }

        // if we just marked incomplete, we need to make some changes
        if (justIncompleted) {
          // add to search
          const sessions = await this.allSessions();
          for (const session of sessions) {
            searchService.addOrUpdateSessionIndex(session, setting);
          }
        }
      }
    } catch (error) {
      throw error;
    }

    // keep the setting references up to date
    let setting = await getGlobalSetting(this.settingId);
    if (!setting)
      throw new Error('Invalid setting in Campaign.save()');

    await setting.loadCampaigns();
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

    let setting = await getGlobalSetting(this.settingId);

    if (!setting)
      throw new Error('Invalid setting in Campaign.delete()');

    await toRaw(this._doc)?.delete();

    await setting.deleteCampaignFromSetting(id);
  }
}