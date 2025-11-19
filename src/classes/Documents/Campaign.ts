import { toRaw } from 'vue';
import { moduleId, ModuleSettings, SettingKey, } from '@/settings'; 
import { DOCUMENT_TYPES, CampaignLore, frontIndexFields } from '@/documents';
import { RelatedPCDetails, RelatedJournal, SessionFilterIndex, FrontFilterIndex, SessionBasicIndex, ArcBasicIndex,} from '@/types';
import { Entry, Session, FCBSetting, Front, Arc } from '@/classes';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { ToDoItem, ToDoTypes, Idea } from '@/types';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic, } from './FCBJournalEntryPage';
import { JournalEntryFlagKey } from '@/settings';
import { searchService } from '@/utils/search';
import { getGlobalSetting } from '@/utils/globalSettings';
import { getArcForSession, getFirstArcWithSessions, getLastArcWithSessions } from '@/utils/arcIndex';

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

  public async allFronts(): Promise<Front[]> {
    const allFronts = await this.filterFronts(()=>true);
    return allFronts;
  }

  /** Finds the new highest session and updates the campaign to mark that as current */
  public async resetCurrentSession(): Promise<void> {
    // find the uuid of the one with the highest number
    const maxSessionInfo = this.sessionIndex
      .reduce((maxInfo: {num: number; sessionId: string}, s): { num: number; sessionId: string}=> {
        const number = s.number;
        return {
          num: number > maxInfo.num ? number : maxInfo.num,
          sessionId: number > maxInfo.num ? s.uuid : maxInfo.sessionId
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
    return this._clone.system.sessionIndex;
  }
  
  public set sessionIndex(value: SessionBasicIndex[]) {
    this._clone.system.sessionIndex = value;
  }

  public get arcIndex(): ArcBasicIndex[] {
    return this._clone.system.arcIndex;
  }
  
  public set arcIndex(value: ArcBasicIndex[]) {
    this._clone.system.arcIndex = value;
  }

  public get frontIds(): readonly string[] {
    return this._clone.system.frontIds;
  }

  /** connect the session to the end of the campaign; need to add to setting separately */
  public async addSession(session: Session): Promise<void> {
    const newSession = {
      uuid: session.uuid,
      name: session.name,
      number: session.number,
      date: session.date?.toLocaleDateString() || null,
    } as SessionBasicIndex;

    // we need to add to the last arc and to the session index
    this._clone.system.sessionIndex.push(newSession);
        
    // add to last arc - we update Arc object, which will update the indexes
    if (this.arcIndex.length === 0) {
      // create default one
      const arc = await Arc.create(this, 'All Sessions');

      if (!arc)
        throw new Error('Failed to create default arc in Campaign.addSession()')
      arc.startSessionNumber = session.number;
      arc.endSessionNumber = session.number;
      arc.sortOrder = 0;  // just in case
      await arc.save();
    } else { 
      const lastArc = this.arcIndex.at(-1);
      const lastArcWithSessions = getLastArcWithSessions(this._clone.system.arcIndex);

      const lastArcObject = await Arc.fromUuid(lastArc!.uuid);
      if (!lastArcObject)
        throw new Error('Failed to get last arc in Campaign.addSession()');

      // if the last one with sessions is also the last one, just extend it
      if (lastArcWithSessions!.uuid === lastArc!.uuid && lastArc!.endSessionNumber !== session.number) {
        lastArcObject.endSessionNumber = session.number;
        await lastArcObject.save();
      } else if (lastArc!.endSessionNumber !== session.number || lastArc!.startSessionNumber !== session.number) {
        // otherwise, make a single-session one out of the last one
        lastArcObject.startSessionNumber = session.number;
        lastArcObject.endSessionNumber = session.number;
        await lastArcObject.save();
      }
    }

    // update the session number on the campaign
    if (this.currentSessionNumber==null || session.number > this.currentSessionNumber) {
      this.currentSessionNumber = session.number;
      this.currentSessionId = session.uuid;
    }

    await this.save();
  }

  /** update indices for a session */
  public async updateSession(session: Session): Promise<void> {
    // find it in the index
    const sessionIndex = this._clone.system.sessionIndex.find((s)=>s.uuid===session.uuid);

    if (!sessionIndex)
      throw new Error('Session index not found in Campaign.updateSession()');

    sessionIndex.number = session.number;
    sessionIndex.name = session.name;
    sessionIndex.date = session.date?.toISOString() || null;
    await this.save();

    await this.updateArcsForNewSessionNumber(session.number);
  }


  /**
   * Ensures the new session number falls inside the current arc coverage.  If not, adjusts the 
   * arcs as needed.
   * 
   * @param newNumber - The new session number
   */
  private async updateArcsForNewSessionNumber(newSessionNumber: number): Promise<void> {
    // see if it's fine already
    if (getArcForSession(this.arcIndex, newSessionNumber) != null) 
      return;

    // see if it's too high and/or too low 
    const firstArcIndex = getFirstArcWithSessions(this.arcIndex);
    const lastArcIndex = getLastArcWithSessions(this.arcIndex);
    
    if (!firstArcIndex || !lastArcIndex) {
      // no arcs - this shouldn't happen
      throw new Error('No arcs found in Campaign.updateArcsForNewSessionNumber()');
    }

    let covered = false;
    if (newSessionNumber < firstArcIndex.startSessionNumber) {
      // Need to extend the first arc backwards
      const firstArc = await Arc.fromUuid(firstArcIndex.uuid);
      if (!firstArc)
        throw new Error('First arc not found in Campaign.updateArcsForNewSessionNumber()');

      firstArcIndex.startSessionNumber = newSessionNumber;
      await firstArc.save();
      covered = true;
    }

    if (newSessionNumber > lastArcIndex.endSessionNumber) {
      // Need to extend the last arc forwards
      const lastArc = await Arc.fromUuid(lastArcIndex.uuid);
      if (!lastArc)
        throw new Error('Last arc not found in Campaign.updateArcsForNewSessionNumber()');

      lastArcIndex.endSessionNumber = newSessionNumber;
      await lastArc.save();
      covered = true;
    }

    // the last possibility is it falls between two arcs... this really shouldn't happen because
    //    we don't allow holes in the arc numbering even if sessions are missing, but just in case
    if (!covered) {
      // find the last arc with an end below this number and extend it up to cover
      for (let i = this.arcIndex.length - 1; i >= 0; i--) {
        if (this.arcIndex[i].endSessionNumber < newSessionNumber) {
          const arc = await Arc.fromUuid(this.arcIndex[i].uuid);
          if (!arc) {
            throw new Error('Arc not found in Campaign.updateArcsForNewSessionNumber()');
          }

          arc.endSessionNumber = newSessionNumber;
          await arc.save();          
        }
      }
    }
  }
  
  /** register the arc on the campaign and setting; also set the sort order */
  public async addArc(arc: Arc): Promise<void> {
    const sortOrder = this._clone.system.arcIndex.length;
    
    const newArc = {
      uuid: arc.uuid,
      name: arc.name,
      startSessionNumber: arc.startSessionNumber,
      endSessionNumber: arc.endSessionNumber,
      sortOrder: sortOrder,
    } as ArcBasicIndex;

    this._clone.system.arcIndex.push(newArc);
    await this.save();

    const setting = await this.getSetting();
    if (!setting)
      throw new Error('Failed to get setting in Campaign.addArc()');

    const campaignIndex = setting.campaignIndex.find(c=> c.uuid===this.uuid);
    if (!campaignIndex)
      throw new Error('Failed to find campaign index in Campaign.addArc()');

    campaignIndex.arcs.push(newArc);
    await setting.save();
  }

  /** update any changes to arc index */
  public async updateArc(arc: Arc): Promise<void> {
    let arcIndex = this._clone.system.arcIndex.find((a)=>a.uuid===arc.uuid);
    if (!arcIndex)
      throw new Error('Arc index not found in Campaign.updateArc()');

    arcIndex.name = arc.name;
    arcIndex.startSessionNumber = arc.startSessionNumber;
    arcIndex.endSessionNumber = arc.endSessionNumber;
    arcIndex.sortOrder = arc.sortOrder;

    // resort the index
    this._clone.system.arcIndex.sort((a, b) => a.sortOrder - b.sortOrder);

    await this.save();

    // need to update on the setting
    const setting = await this.getSetting();
    if (!setting)
      throw new Error('Failed to get setting in Campaign.updateArc()');

    const campaignIndex = setting.campaignIndex.find(c=> c.uuid===this.uuid);
    if (!campaignIndex)
      throw new Error('Failed to find campaign index in Campaign.updateArc()');

    campaignIndex.arcs = this._clone.system.arcIndex;
    await setting.save();
  }

  public async addFront(front: Front): Promise<void> {
    this._clone.system.frontIds.push(front.uuid);    
    await this.save();
  }

  public async deleteArc(arc: Arc): Promise<void> {    
    // Remove from index
    this._clone.system.arcIndex = this._clone.system.arcIndex.filter(a => a.uuid !== arc.uuid);
    
    await this.save();

    // remove from the setting
    const setting = await this.getSetting();
    if (!setting)
      throw new Error('Failed to get setting in Campaign.deleteArc()');

    const campaignIndex = setting.campaignIndex.find(c=> c.uuid===this.uuid);
    if (!campaignIndex)
      throw new Error('Failed to find campaign index in Campaign.deleteArc()');

    campaignIndex.arcs = campaignIndex.arcs.filter(a => a.uuid !== arc.uuid);
    await setting.save();
  }
 
  public async deleteFront(front: Front): Promise<void> {
    this._clone.system.frontIds = this._clone.system.frontIds.filter(s=> s!==front.uuid);
    
    await this.save();
  }

  /** delete a session from the campaign; adjusting current session if needed */
  public async deleteSession(session: Session): Promise<void> {
    // Remove from master indexes
    const reset = (session.uuid === this.currentSessionId);

    // Remove from index
    this._clone.system.sessionIndex = this._clone.system.sessionIndex.filter(s => s.uuid !== session.uuid);
    await this.save();

    // note: sessions are no longer stored on setting

    if (reset) {
      await this.resetCurrentSession();
    }
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

  public async moveIdeaToArc(uuid: string): Promise<void> {
    const item = this._clone.system.ideas.find(i => i.uuid === uuid);
    if (!item || this.arcIndex.length===0)
      return;

    // get the latest arc
    const latestArc = this.arcIndex[this.arcIndex.length - 1];
    const arc = await Arc.fromUuid(latestArc.uuid);
    if (!arc)
      return;

    // move it
    await arc.addIdea(item.text);    
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
    const campaign = await super._create(
      setting.compendiumId, 
      nameToUse, 
      localize('contentFolders.campaigns')
    ) as unknown as Campaign;  

    if (!campaign)
      throw new Error('Couldn\'t create new journal entry for campaign');

    // add it to the setting's list
    setting.campaignIndex.push({ uuid: campaign.uuid, name: nameToUse, completed: false, arcs: [] });
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
    // add the id
    const sessions = this.sessionIndex
      .map((s) => ({ 
        name: s.name, 
        id: foundry.utils.parseUuid(s.uuid).id,
        uuid: s.uuid,
        number: s.number 
      } as SessionFilterIndex))

      // now filter by the function passed in 
      .filter((s: SessionFilterIndex)=> filterFn(s)) || [];

    const idList = sessions.map((s)=> s.id);
    const documentSet = await this.compendium.getDocuments({ _id__in: idList });

    let retval = [] as Session[];
    for (const doc of documentSet) {
      const session = new Session(doc, this);
      if (session)
        retval.push(session);
    }

    return retval;
  }

  
  /**
   * Given a filter function, returns all the matching Fronts
   * inside this campaign
   * 
   * @param {(e: FrontFilterIndex) => boolean} filterFn - The filter function
   * @returns {Front[]} The entries that pass the filter
   */
  public async filterFronts(filterFn: (s: FrontFilterIndex) => boolean): Promise<Front[]> { 
    // get all the journal entries
    const entries = await toRaw(this.compendium).getIndex(frontIndexFields());

    // find the sessions connected to this campaign
    const fronts = entries
      // first find the relevant ones
      .filter((e)=> (
        e.flags?.[moduleId]?.[JournalEntryFlagKey.campaignBuilderType]===DOCUMENT_TYPES.Front &&
        !!e.pages && e.pages!.length > 0 &&
        this._clone.system.frontIds.includes(e.uuid)
      ))
      .map((e) => ({ 
        name: e.name, 
        id: e._id,
        uuid: e.uuid
      } as FrontFilterIndex))

      // now filter by the function passed in 
      .filter((s: FrontFilterIndex)=> filterFn(s)) || [];

    const idList = fronts.map((s)=> s.id);
    const documentSet = await this.compendium.getDocuments({ _id__in: idList });

    let retval = [] as Front[];
    for (const doc of documentSet) {
      const front = new Front(doc, this);
      if (front)
        retval.push(front);
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
            searchService.removeSearchEntry(session.uuid);
          }

          const fronts = await this.allFronts();
          for (const front of fronts) {
            searchService.removeSearchEntry(front.uuid);
          }

          const arcs = this.arcIndex;
          for (const arc of arcs) {
            searchService.removeSearchEntry(arc.uuid);
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
            searchService.addOrUpdateSessionIndex(session);
          }

          const fronts = await this.allFronts();
          for (const front of fronts) {
            searchService.addOrUpdateFrontIndex(front);
          }

          for (const index of this.arcIndex) {
            const arc = await Arc.fromUuid(index.uuid);
            searchService.addOrUpdateArcIndex(arc!);
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