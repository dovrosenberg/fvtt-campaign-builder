import { toRaw } from 'vue';
import { moduleId, ModuleSettings, SettingKey, } from '@/settings'; 
import { DOCUMENT_TYPES, frontIndexFields } from '@/documents';
import { CampaignLore, RelatedJournal, SessionFilterIndex, FrontFilterIndex, SessionBasicIndex, ArcBasicIndex, StoryWebFilterIndex, CampaignToDo, ToDoTypes, TableGroup, GroupableItem, CampaignPC, CampaignIdea, TimelineConfig, TIMELINE_DEFAULT, } from '@/types';
import { Entry, Session, FCBSetting, Front, Arc, StoryWeb } from '@/classes';
import ArcIndexService from '@/utils/arcIndex';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic, } from './FCBJournalEntryPage';
import { JournalEntryFlagKey } from '@/settings';
import { searchService } from '@/utils/search';
import GlobalSettingService from '@/utils/globalSettings';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';

type CampaignDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Campaign>;

// represents a topic entry (ex. a character, location, etc.)
export class Campaign extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Campaign> {
  static override _documentType = DOCUMENT_TYPES.Campaign;
  static override _defaultSystem = { 
    sessions: [],
    lore: [],  
    img: '',   
    toDoItems: [],  
    ideas: [],  
    journals: [], 
    pcs: [],
    customFields: {},
    customFieldHeights: {},
    frontIds: [],
    storyWebIds: [],
    storyWebs: [],
    timelines: [TIMELINE_DEFAULT],
    groups: {
      [GroupableItem.CampaignToDos]: [] as TableGroup[],
      [GroupableItem.CampaignIdeas]: [] as TableGroup[],
      [GroupableItem.CampaignLore]: [] as TableGroup[],
      [GroupableItem.CampaignPCs]: [] as TableGroup[],
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

  public async allStoryWebs(): Promise<StoryWeb[]> {
    const allStoryWebs = await this.filterStoryWebs(() => true);
    return allStoryWebs;
  }

  /** Updates current session to highest numbered session without saving */
  public resetCurrentSession(): void {
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

  public get storyWebIds(): readonly string[] {
    return this._clone.system.storyWebIds;
  }

  public get storyWebs(): readonly string[] {
    return this._clone.system.storyWebs || [];
  }

  public set storyWebs(value: string[] | readonly string[]) {
    this._clone.system.storyWebs = value.slice();
  }

  public get timelines(): TimelineConfig[] {
    return this._clone.system.timelines || TIMELINE_DEFAULT;
  }

  public set timelines(value: TimelineConfig[]) {
    this._clone.system.timelines = value;
  }

  /** connect the session to the end of the campaign; need to add to setting separately */
  public async addSession(session: Session): Promise<void> {
    const newSession = {
      uuid: session.uuid,
      name: session.name,
      number: session.number,
      date: session.date?.toLocaleDateString() || null,
    } as SessionBasicIndex;

    // we need to add to the session index
    this._clone.system.sessionIndex.push(newSession);

    // update the session number on the campaign
    if (this.currentSessionNumber==null || session.number > this.currentSessionNumber) {
      this._clone.system.currentSessionNumber = session.number;
      this._clone.system.currentSessionId = session.uuid;
    }

    await this.save();
        
    // add to last arc - we update Arc object, which will update the indexes
    if (this.arcIndex.length === 0) {
      // create default one
      const arc = await Arc.create(this, localize('placeholders.allSessions'));

      if (!arc)
        throw new Error('Failed to create default arc in Campaign.addSession()')
      arc.startSessionNumber = session.number;
      arc.endSessionNumber = session.number;
      arc.sortOrder = 0;  // just in case
      await arc.save();
    } else { 
      const lastArcWithSessions = ArcIndexService.getLastArcWithSessions(this._clone.system.arcIndex);
      if (lastArcWithSessions) {
        // extend the last arc that has sessions
        const arc = await Arc.fromUuid(lastArcWithSessions.uuid);

        if (!arc)
          throw new Error('Failed to get target arc in Campaign.addSession()');

        // there's a race condition I can't find where if we let the arc re-load the 
        //    campaign the index hasn't been updated properly; this will make
        //    it use this copy
        arc.campaign = this;
        arc.endSessionNumber = session.number;
        await arc.save();
      } else {
        // there are arcs, but none have sessions
        const firstArc = this.arcIndex.at(0);

        const arc = await Arc.fromUuid(firstArc!.uuid);
        if (!arc)
          throw new Error('Failed to get first arc in Campaign.addSession()');

        // there's a race condition I can't find where if we let the arc re-load the 
        //    campaign the index hasn't been updated properly; this will make
        //    it use this copy
        arc.campaign = this;
        arc.startSessionNumber = session.number;
        arc.endSessionNumber = session.number;
        await arc.save();
      }
    }

  }

  /**
   * Ensures the new session number falls inside the current arc coverage.  If not, adjusts the 
   * arcs as needed. Modifies arcIndex directly without saving - caller must save campaign.
   * 
   * @param newNumber - The new session number
   */
  public async updateArcsForNewSessionNumber(newSessionNumber: number): Promise<void> {
    // see if it's fine already
    if (ArcIndexService.getArcForSession(this.arcIndex, newSessionNumber) != null) 
      return;

    // see if it's too high and/or too low 
    const firstArcIndex = ArcIndexService.getFirstArcWithSessions(this.arcIndex);
    const lastArcIndex = ArcIndexService.getLastArcWithSessions(this.arcIndex);
    
    if (!firstArcIndex || !lastArcIndex) {
      // no arcs - this shouldn't happen
      throw new Error('No arcs found in Campaign.updateArcsForNewSessionNumber()');
    }

    let covered = false;
    let arcToAdjust: Arc | null = null;
    if (newSessionNumber < firstArcIndex.startSessionNumber) {
      // Need to extend the first arc backwards - modify index directly
      firstArcIndex.startSessionNumber = newSessionNumber;

      arcToAdjust = await Arc.fromUuid(firstArcIndex.uuid);
      covered = true;
    }

    if (newSessionNumber > lastArcIndex.endSessionNumber) {
      // Need to extend the last arc forwards - modify index directly
      lastArcIndex.endSessionNumber = newSessionNumber;

      arcToAdjust = await Arc.fromUuid(lastArcIndex.uuid);
      if (!arcToAdjust)
        throw new Error('Failed to get last arc in Campaign.updateArcsForNewSessionNumber()');

      arcToAdjust.endSessionNumber = newSessionNumber;

      covered = true;
    }

    // the last possibility is it falls between two arcs... this really shouldn't happen because
    //    we don't allow holes in the arc numbering even if sessions are missing, but just in case
    if (!covered) {
      // find the last arc with an end below this number and extend it up to cover
      for (let i = this.arcIndex.length - 1; i >= 0; i--) {
        if (this.arcIndex[i].endSessionNumber < newSessionNumber) {
          this.arcIndex[i].endSessionNumber = newSessionNumber;

          const arc = await Arc.fromUuid(this.arcIndex[i].uuid);
          if (!arc)
            throw new Error('Failed to get arc in Campaign.updateArcsForNewSessionNumber()');

          arc.campaign = this;
          arc.endSessionNumber = newSessionNumber;
          await arc.save();

          break;
        }
      }
    }

    if (arcToAdjust)
      await arcToAdjust.save();
  }
  
  /** Register the arc to the end of the campaign (and setting); saves Campaign */
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
    
    // Save campaign once - this will sync to setting automatically
    await this.save();
  }


  public async addFront(front: Front): Promise<void> {
    this._clone.system.frontIds.push(front.uuid);    
    await this.save();
  }

  public async addStoryWeb(storyWeb: StoryWeb): Promise<void> {
    this._clone.system.storyWebIds.push(storyWeb.uuid);    
    await this.save();
  }

  public async deleteArc(arc: Arc): Promise<void> {    
    // Remove from index
    this._clone.system.arcIndex = this._clone.system.arcIndex.filter(a => a.uuid !== arc.uuid);
    
    // Save campaign once - this will sync to setting automatically
    await this.save();
  }
 
  public async deleteFront(front: Front): Promise<void> {
    this._clone.system.frontIds = this._clone.system.frontIds.filter(s=> s!==front.uuid);
    
    await this.save();
  }

  public async deleteStoryWeb(storyWeb: StoryWeb): Promise<void> {
    this._clone.system.storyWebIds = this._clone.system.storyWebIds.filter(s=> s!==storyWeb.uuid);

    this._clone.system.storyWebs = (this._clone.system.storyWebs || []).filter(s => s !== storyWeb.uuid);

    // also remove the reference from any arcs and sessions in this campaign
    for (const arcIndex of this._clone.system.arcIndex) {
      const arc = await Arc.fromUuid(arcIndex.uuid);
      if (!arc)
        continue;

      if (arc.storyWebs.includes(storyWeb.uuid)) {
        arc.storyWebs = arc.storyWebs.filter(id => id !== storyWeb.uuid);
        await arc.save();
      }
    }

    const sessions = await this.allSessions();
    for (const session of sessions) {
      if (session.storyWebs.includes(storyWeb.uuid)) {
        session.storyWebs = session.storyWebs.filter(id => id !== storyWeb.uuid);
        await session.save();
      }
    }
    
    await this.save();
  }

  /** delete a session from the campaign; adjusting current session if needed */
  public async deleteSession(session: Session): Promise<void> {
    
    // Remove from index
    this._clone.system.sessionIndex = this._clone.system.sessionIndex.filter(s => s.uuid !== session.uuid);
    
    // Reset current session if needed (doesn't save)
    if (session.uuid === this.currentSessionId) {
      this.resetCurrentSession();
    }

    // Adjust arc boundaries for the deleted session (directly modify arcIndex)
    const arcIndexEntry = ArcIndexService.getArcForSession(this.arcIndex, session.number);
    if (arcIndexEntry) {
      // if there was only one session, empty it
      if (arcIndexEntry.startSessionNumber === arcIndexEntry.endSessionNumber) {
        arcIndexEntry.startSessionNumber = -1;
        arcIndexEntry.endSessionNumber = -1;
      } else if (arcIndexEntry.startSessionNumber === session.number) {
        // it was at the start, make the new start one higher 
        arcIndexEntry.startSessionNumber++;
      } else if (arcIndexEntry.endSessionNumber === session.number) {
        // it was at the end, make the new end one lower
        arcIndexEntry.endSessionNumber--;
      }
      // if in the middle, no change needed
    }

    // Save campaign once - this syncs to setting automatically
    await this.save();
  }

  public get description(): string {
    return this._clone.text?.content || '';
  }

  public set description(value: string) {
    this._clone.text = {
      ...this._clone.text,
      content: value
    };
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

  public async getCurrentSession(): Promise<Session | null> {
    return this._clone.system.currentSessionId ? await Session.fromUuid(this._clone.system.currentSessionId) : null;
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

  public get toDoItems(): readonly CampaignToDo[] {
    return this._clone.system.toDoItems as CampaignToDo[]; 
  }

  public set toDoItems(value: CampaignToDo[] | readonly CampaignToDo[]) {
    // we clone it so it can't be edited outside (this is historical)
    this._clone.system.toDoItems = value.slice();     
  }

  /** Creates a new to-do item and adds to the campaign*/
  public async addNewToDoItem(type: ToDoTypes, text: string, linkedUuid?: string | null | undefined, sessionUuid?: string, manualDate?: Date): Promise<CampaignToDo | null> {
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

    const item: CampaignToDo = {
      uuid: foundry.utils.randomID(),
      lastTouched: manualDate?.toISOString() || new Date().toISOString(),
      manuallyUpdated: false,
      linkedUuid: linkedUuid || null,
      sessionUuid: sessionUuid || null,
      linkedText: entry ? entry.name : null,
      text: text || '',
      type: type || ToDoTypes.Manual,
      groupId: null,
    };

    this._clone.system.toDoItems.push(item);
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
    let existingItem = undefined as CampaignToDo | undefined;
    if (linkedUuid) {
       existingItem = (this._clone.system.toDoItems as CampaignToDo[]).find(i => i.linkedUuid === linkedUuid);
    } else if (sessionUuid) {
       existingItem = (this._clone.system.toDoItems as CampaignToDo[]).find(i => i.sessionUuid === sessionUuid && i.type === type);
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
    const item = this._clone.system.toDoItems.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newDescription;
    item.lastTouched = new Date().toISOString();
    item.manuallyUpdated = true;

    await this.save();
  }

  public async completeToDoItem(uuid: string): Promise<void> {
    this._clone.system.toDoItems = this._clone.system.toDoItems.filter(i => i.uuid !== uuid);
    await this.save();
  }

  public get journals(): RelatedJournal[] {
    return this._clone.system.journals;
  }

  public set journals(value: RelatedJournal[] | readonly RelatedJournal[]) {
    this._clone.system.journals = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  public get ideas(): readonly CampaignIdea[] {
    return this._clone.system.ideas;
  }

  public set ideas(value: CampaignIdea[] | readonly CampaignIdea[]) {
    this._clone.system.ideas = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  public get pcs(): CampaignPC[] {
    return this._clone.system.pcs;
  }

  public get completed(): boolean {
    return this._clone.system.completed;
  }

  public set completed(value: boolean) {
    this._clone.system.completed = value;
  }

  public set pcs(value: CampaignPC[] | readonly CampaignPC[]) {
    this._clone.system.pcs = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  /** Creates a new idea item and adds to the campaign*/
  /** returns the uuid */
  public async addIdea(text: string): Promise<string | null> {
    const item: CampaignIdea = {
      uuid: foundry.utils.randomID(),
      text: text || '',
      groupId: null,
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
    const toDo = this._clone.system.toDoItems.find(i => i.uuid === uuid);
    if (!toDo)
      return;

    // Create a new idea with the to-do's text
    await this.addIdea(toDo.text);

    // Remove the to-do item
    this._clone.system.toDoItems = this._clone.system.toDoItems.filter(i => i.uuid !== uuid);
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
   * @returns a list of Entries
   */
   // TODO: At some point, may need to make reactive (i.e. filter by what's been entered so far) or use algolia if lists are too long; 
   // might also consider making every topic a different subtype and then using DocumentIndex.lookup  -- that might give performance
   // improvements in lots of places
  public async getPCs(): Promise<Entry[]> {
    // we find all journal entries with this topic
    return await this.filterPCs(()=>true);
  }

  /**
   * Given a filter function, returns all the matching Sessions
   * inside this campaign
   * 
   * @param {(e: CampaignPC) => boolean} filterFn - The filter function
   * @returns {Entry[]} The entries that pass the filter
   */
  public async filterPCs(filterFn: (e: CampaignPC) => boolean): Promise<Entry[]> { 
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
    // get all entries
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
   * Given a filter function, returns all the matching StoryWebs
   * inside this campaign
   * 
   * @param {(e: StoryWebFilterIndex) => boolean} filterFn - The filter function
   * @returns {StoryWeb[]} The entries that pass the filter
   */
  public async filterStoryWebs(filterFn: (s: StoryWebFilterIndex) => boolean): Promise<StoryWeb[]> { 
    // get all the journal entries
    const entries = await toRaw(this.compendium).getIndex();

    // find the story webs connected to this campaign
    const storyWebs = entries
      // first find the relevant ones
      .filter((e)=> (
        e.flags?.[moduleId]?.[JournalEntryFlagKey.campaignBuilderType]===DOCUMENT_TYPES.StoryWeb &&
        !!e.pages && e.pages!.length > 0 &&
        this._clone.system.storyWebIds?.includes(e.uuid)
      ))
      .map((e) => ({ 
        name: e.name, 
        id: e._id,
        uuid: e.uuid
      } as StoryWebFilterIndex))

      // now filter by the function passed in 
      .filter((s: StoryWebFilterIndex)=> filterFn(s)) || [];

    const idList = storyWebs.map((s)=> s.id);
    const documentSet = await this.compendium.getDocuments({ _id__in: idList });

    let retval = [] as StoryWeb[];
    for (const doc of documentSet) {
      const storyWeb = new StoryWeb(doc, this);
      if (storyWeb)
        retval.push(storyWeb);
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
    const justCompleted = this._clone.system.completed && !this._doc?.system.completed;
    const justActive = !this._clone.system.completed && this._doc?.system.completed;

    await super.save();

    // Sync campaign indices to setting
    const setting = await this.getSetting();
    if (setting) {
      const campaignIndex = setting.campaignIndex.find(c => c.uuid === this.uuid);
      if (campaignIndex) {
        campaignIndex.name = this.name;
        campaignIndex.completed = this.completed;
        campaignIndex.arcs = this.arcIndex.slice(); // Full sync of arc indices
      }
      
      await setting.save();
    }

    // Handle completed status changes
    if (justCompleted) {
      if (setting) {
        // collapse the node
        await setting.collapseNode(this.uuid);
      }

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
      if (ModuleSettings.get(SettingKey.emailDefaultCampaign) === this.uuid)
        await ModuleSettings.set(SettingKey.emailDefaultCampaign, '');
    }

    // if we just marked active, we need to make some changes
    if (justActive) {
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

  /**
   * Deletes a campaign from the database, along with all the related sessions
   * 
   * @param skipDelete - if true, don't delete the Foundry document itself; used when Foundry deletes something outside the app
   * @returns {Promise<void>}
   */
  public async delete(skipDelete = false) {
    if (!this._doc)
      return;

    const id = this._doc.uuid;

    let setting = await GlobalSettingService.getGlobalSetting(this.settingId);

    if (!setting)
      throw new Error('Invalid setting in Campaign.delete()');

    await super._delete(skipDelete);

    await setting.deleteCampaignFromSetting(id);
  }
}