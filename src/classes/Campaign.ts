import { toRaw } from 'vue';
import { moduleId, ModuleSettings, SettingKey, } from '@/settings'; 
import { CampaignDoc, CampaignFlagKey, campaignFlagSettings, DOCUMENT_TYPES, PCDoc, SessionDoc, CampaignLore } from '@/documents';
import { DocumentWithFlags, Entry, PC, Session, Setting } from '@/classes';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { SessionLore } from '@/documents/session';
import { ToDoItem, ToDoTypes, Idea } from '@/types';

// represents a topic entry (ex. a character, location, etc.)
export class Campaign extends DocumentWithFlags<CampaignDoc> {
  static override _documentName = 'JournalEntry';
  static override _flagSettings = campaignFlagSettings;

  public world: Setting | null;  // the world the campaign is in (if we don't setup up front, we can load it later)

  // saved on JournalEntry
  private _name: string;

  // saved in flags
  private _description: string;
  private _houseRules: string;
  private _lore: CampaignLore[];
  private _img: string;
  private _todoItems: ToDoItem[];
  private _ideas: Idea[];

  /**
   * 
   * @param {CampaignDoc} campaignDoc - The campaign Foundry document
   * @param {Setting} world - The world the campaign is in
   */
  constructor(campaignDoc: CampaignDoc, world?: Setting) {
    super(campaignDoc, CampaignFlagKey.isCampaign);

    this.world = world || null;

    this._description = this.getFlag(CampaignFlagKey.description) || '';
    this._houseRules = this.getFlag(CampaignFlagKey.houseRules) || '';
    this._lore = this.getFlag(CampaignFlagKey.lore) || [];
    this._img = this.getFlag(CampaignFlagKey.img) || '';
    this._name = campaignDoc.name;
    this._todoItems = this.getFlag(CampaignFlagKey.todoItems) || [];
    this._ideas = this.getFlag(CampaignFlagKey.ideas) || [];
  }

  override async _getWorld(): Promise<Setting> {
    return await this.getWorld();
  };

  /** note: DOES NOT attach the world */
  static async fromUuid(campaignId: string, options?: Record<string, any>): Promise<Campaign | null> {
    const campaignDoc = await fromUuid<CampaignDoc>(campaignId, options);

    if (!campaignDoc)
      return null;
    else {
      const campaign = new Campaign(campaignDoc);
      return campaign;
    }
  }

  get uuid(): string {
    return this._doc.uuid;
  }

  /**
   * Gets the world associated with a campaign 
   * if needed.
   * 
   * @returns {Promise<Setting>} A promise to the world associated with the campaign.
   */
  public async getWorld(): Promise<Setting> {
    if (!this.world)
      this.world = await this.loadWorld();

    return this.world;
  }
  
  /**
   * Gets the Setting associated with the campaign. If the world is already loaded, the promise resolves
   * to the existing world; otherwise, it loads the world and then resolves to it.
   * @returns {Promise<Setting>} A promise to the world associated with the campaign.
   */
  public async loadWorld(): Promise<Setting> {
    if (this.world)
      return this.world;

    if (!this._doc.collection?.folder)
      throw new Error('Invalid folder id in Campaign.loadWorld()');
    
    this.world = await Setting.fromUuid(this._doc.collection.folder.uuid);

    if (!this.world)
      throw new Error('Error loading world in Campaign.loadWorld()');

    return this.world;
  }
  
  /**  get the highest numbered session (if in play mode, this will be the played one, too) */
  get currentSession (): Session | null {
    let maxNumber = 0;
    let doc: SessionDoc | null = null;

    toRaw(this._doc).pages.forEach((page: JournalEntryPage) => {
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

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      name: value,
    };
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): CampaignDoc {
    return this._doc;
  }

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this._description = value;
    this.updateCumulative(CampaignFlagKey.description, value);
  }

  public get houseRules(): string {
    return this._houseRules;
  }

  public set houseRules(value: string) {
    this._houseRules = value;
    this.updateCumulative(CampaignFlagKey.houseRules, value);
  }

  public get img(): string {
    return this._img;
  }

  public set img(value: string) {
    this._img = value;
    this.updateCumulative(CampaignFlagKey.img, value);
  }

  public get lore(): SessionLore[] {
    return this._lore;
  }
  
  // returns the uuid
  async addLore(description: string): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._lore.push({
      uuid: uuid,
      description: description,
      delivered: false,
      journalEntryPageId: null,
      lockedToSessionId: null,
      lockedToSessionName: null,
    });

    this.updateCumulative(CampaignFlagKey.lore, this._lore);

    await this.save();
    return uuid;
  }

  async updateLoreDescription(uuid: string, description: string): Promise<void> {
    const lore = this._lore.find(l=> l.uuid===uuid);

    if (!lore)
      return;

    lore.description = description;
    this.updateCumulative(CampaignFlagKey.lore, this._lore);

    await this.save();
  }

  async updateLoreJournalEntry(loreUuid: string, journalEntryPageId: string | null): Promise<void> {
    const lore = this._lore.find(l=> l.uuid===loreUuid);

    if (!lore)
      return;

    lore.journalEntryPageId = journalEntryPageId;

    this.updateCumulative(CampaignFlagKey.lore, this._lore);
    await this.save();
  }

  async deleteLore(uuid: string): Promise<void> {
    this._lore = this._lore.filter(l=> l.uuid!==uuid);

    this.updateCumulative(CampaignFlagKey.lore, this._lore);
    await this.save();
  }

  async markLoreDelivered(uuid: string, delivered: boolean): Promise<void> {
    const lore = this._lore.find((l) => l.uuid===uuid);
    if (!lore)
      return;
    
    lore.delivered = delivered;

    this.updateCumulative(CampaignFlagKey.lore, this._lore);
    await this.save();
  }

  get todoItems(): readonly ToDoItem[] {
    return this._todoItems;
  }

  set todoItems(value: ToDoItem[]) {
    this._todoItems = value;
    this.updateCumulative(CampaignFlagKey.todoItems, value);
  }

  /** Creates a new todo item and adds to the campaign*/
  async addNewToDoItem(type: ToDoTypes, text: string, linkedUuid?: string, sessionUuid?: string, manualDate?: Date): Promise<ToDoItem | null> {
    if (!ModuleSettings.get(SettingKey.enableToDoList)) 
      return null;

    if (!this._todoItems) {
      this._todoItems = [];
    }

    // manual entries don't have a linked uuid, but the others do
    if ((!linkedUuid && type !== ToDoTypes.Manual) || (linkedUuid && type === ToDoTypes.Manual)) {
      throw new Error('Invalid linkedUuid for type in Campaign.addToDoItem()');
    }

    let entry;
    if (type === ToDoTypes.Entry && linkedUuid) {
      entry = await Entry.fromUuid(linkedUuid);
    }

    const item: ToDoItem = {
      uuid: foundry.utils.randomID(),
      lastTouched: manualDate || new Date(),
      manuallyUpdated: false,
      linkedUuid: linkedUuid || null,
      sessionUuid: sessionUuid || null,
      linkedText: entry ? entry.name : null,
      text: text || '',
      type: type || ToDoTypes.Manual,
    };

    this._todoItems.push(item);
    this.updateCumulative(CampaignFlagKey.todoItems, this._todoItems);
    await this.save();

    return item;
  }

  /**
   * Adds a todo item to the campaign. If there is already one with a matching linkeduuid, it adds the text
   * to the end of the current text.  Otherwise, it creates a new one.
   * 
   */
  async mergeToDoItem(type: ToDoTypes, text: string, linkedUuid?: string, sessionUuid?: string): Promise<void> {
    // Check if todo list is enabled
    if (!ModuleSettings.get(SettingKey.enableToDoList)) 
      return;

    // see if one exists for this linked uuid
    const existingItem = this._todoItems.find(i => i.linkedUuid === linkedUuid);

    // make sure the type matches
    if (existingItem && existingItem.type !== type) {
      throw new Error(`ToDo item with linkedUuid ${linkedUuid} already exists with different type in Campaign.mergeToDoItem()`);
    }

    // otherwise, if we have one, add the text to the end of the current text
    // if we don't have one, create a new one
    if (!existingItem) {
      await this.addNewToDoItem(type, text, linkedUuid, sessionUuid);
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

    this.updateCumulative(CampaignFlagKey.todoItems, this._todoItems);
    await this.save();
}

  async updateToDoItem(uuid: string, newDescription: string): Promise<void> {
    const item = this._todoItems.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newDescription;
    item.lastTouched = new Date();
    item.manuallyUpdated = true;
    this.updateCumulative(CampaignFlagKey.todoItems, this._todoItems);
    await this.save();
  }

  async completeToDoItem(uuid: string): Promise<void> {
    if (!this._todoItems) {
      this._todoItems = [];
    }

    this._todoItems = this._todoItems.filter(i => i.uuid !== uuid);
    this.updateCumulative(CampaignFlagKey.todoItems, this._todoItems);
    await this.save();
  }

  get ideas(): readonly Idea[] {
    return this._ideas;
  }

  set ideas(value: Idea[]) {
    this._ideas = value;
    this.updateCumulative(CampaignFlagKey.ideas, value);
  }

  /** Creates a new idea item and adds to the campaign*/
  /** returns the uuid */
  async addIdea(text: string): Promise<string | null> {
    if (!this._ideas) {
      this._ideas = [];
    }

    const item: Idea = {
      uuid: foundry.utils.randomID(),
      text: text || '',
    };

    this._ideas.push(item);
    this.updateCumulative(CampaignFlagKey.ideas, this._ideas);
    await this.save();

    return item.uuid;
  }

  async updateIdea(uuid: string, newText: string): Promise<void> {
    const item = this._ideas.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newText;
    this.updateCumulative(CampaignFlagKey.ideas, this._ideas);
    await this.save();
  }

  async deleteIdea(uuid: string): Promise<void> {
    if (!this._ideas) {
      this._ideas = [];
    }

    this._ideas = this._ideas.filter(i => i.uuid !== uuid);
    this.updateCumulative(CampaignFlagKey.ideas, this._ideas);
    await this.save();
  }

  /**
   * Creates a new campaign.  Prompts for a name.
   * 
   * @param {Setting} world - The world to create the campaign in. 
   * @returns A promise that resolves when the campaign has been created, with either the resulting entry or null on error
   */
  static async create(world: Setting): Promise<Campaign | null> {
    // get the name
    let name;

    do {
      name = await FCBDialog.inputDialog(localize('dialogs.createCampaign.title'), `${localize('dialogs.createCampaign.campaignName')}:`); 

      if (name) {
        let newCampaignDoc: CampaignDoc;

        await world.executeUnlocked(async () => {
          // create a journal entry for the campaign
          newCampaignDoc = await JournalEntry.create({
            name: name,
            folder: foundry.utils.parseUuid(world.uuid).id,
          },{
            pack: world.compendium.metadata.id,
          }) as unknown as CampaignDoc;  

          if (!newCampaignDoc)
            throw new Error('Couldn\'t create new journal entry for campaign');
        });

        // @ts-ignore - assigned in executeUnlocked
        const newCampaign = new Campaign(newCampaignDoc, world);
        await newCampaign.setup();

        world.campaignNames = {
          ...world.campaignNames,
          [newCampaign.uuid]: name,
        };
        await world.save();
        
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
   * @param campaignId the campaign to search
   * @returns a list of Entries
   */
  public async getPCs(): Promise<PC[]> {
    // we find all journal entries with this topic
    return await this.filterPCs(()=>true);
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
   * Given a filter function, returns all the matching Sessions
   * inside this campaign
   * 
   * @param {(e: PC) => boolean} filterFn - The filter function
   * @returns {PC[]} The entries that pass the filter
   */
  public async filterPCs(filterFn: (e: PC) => boolean): Promise<PC[]> { 
    const retval = (toRaw(this._doc).pages.contents as unknown as PCDoc[])
      .filter((p) => p.type===DOCUMENT_TYPES.PC)
      .map((s: PCDoc)=> new PC(s, this))
      .filter((s: PC)=> filterFn(s));

    // load all the actors
    await Promise.all(retval.map((pc) => pc.getActor()));

    return retval;
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
    let world = await this.getWorld();

    await world.executeUnlocked(async () => {
      if (Object.keys(updateData).length !== 0) {
        // protect any complex flags
        if (updateData.flags && updateData.flags[moduleId])
          updateData.flags[moduleId] = this.prepareFlagsForUpdate(updateData.flags[moduleId]);

        const retval = await toRaw(this._doc).update(updateData) || null;
        if (retval) {
          this._doc = retval;
          this._cumulativeUpdate = {};

          success = true;
        }

        // update the name
        if (updateData.name !== undefined) {
          await world.updateCampaignName(this.uuid, updateData.name);
        }
      }
    });
    
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

    let world = await this.getWorld();

    await world.executeUnlocked(async () => {
      await this._doc.delete();

      await world.deleteCampaignFromWorld(id);
    });
  }
}