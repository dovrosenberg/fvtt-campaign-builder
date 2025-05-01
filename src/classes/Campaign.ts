import { toRaw } from 'vue';
import { moduleId, setFlagDefaults, } from '@/settings'; 
import { CampaignDoc, CampaignFlagKey, campaignFlagSettings, DOCUMENT_TYPES, PCDoc, SessionDoc, } from '@/documents';
import { DocumentWithFlags, PC, Session, WBWorld } from '@/classes';
import { inputDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { SessionLore } from '@/documents/session';

// represents a topic entry (ex. a character, location, etc.)
export class Campaign extends DocumentWithFlags<CampaignDoc> {
  protected static _documentName = 'JournalEntry';
  protected _flagSettings = campaignFlagSettings;

  public world: WBWorld | null;  // the world the campaign is in (if we don't setup up front, we can load it later)

  // saved on JournalEntry
  private _name: string;

  // saved in flags
  private _description: string;
  private _lore: SessionLore[];
  private _img: string;

  /**
   * 
   * @param {CampaignDoc} campaignDoc - The campaign Foundry document
   * @param {WBWorld} world - The world the campaign is in
   */
  constructor(campaignDoc: CampaignDoc, world?: WBWorld) {
    super(campaignDoc, CampaignFlagKey.isCampaign);

    this.world = world || null;

    this._description = this.getFlag(CampaignFlagKey.description) || '';
    this._lore = this.getFlag(CampaignFlagKey.lore) || [];
    this._img = this.getFlag(CampaignFlagKey.img) || '';
    this._name = campaignDoc.name;
  }

  /** note: DOES NOT attach the world */
  static async fromUuid(campaignId: string, options?: Record<string, any>): Promise<Campaign | null> {
    const campaignDoc = await fromUuid(campaignId, options) as CampaignDoc | null;

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
   * @returns {Promise<WBWorld>} A promise to the world associated with the campaign.
   */
  public async getWorld(): Promise<WBWorld> {
    if (!this.world)
      this.world = await this.loadWorld();

    return this.world;
  }
  
  /**
   * Gets the WBWorld associated with the campaign. If the world is already loaded, the promise resolves
   * to the existing world; otherwise, it loads the world and then resolves to it.
   * @returns {Promise<WBWorld>} A promise to the world associated with the campaign.
   */
  public async loadWorld(): Promise<WBWorld> {
    if (this.world)
      return this.world;

    if (!this._doc.collection?.folder)
      throw new Error('Invalid folder id in Campaign.loadWorld()');
    
    this.world = await WBWorld.fromUuid(this._doc.collection.folder.uuid);

    if (!this.world)
      throw new Error('Error loading world in Campaign.loadWorld()');

    return this.world;
  }
  
  // get the highest numbered session
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

  /** returns the uuids of all the sessions */
  get sessions(): string[] {
    return toRaw(this._doc).pages.filter((p) => p.type===DOCUMENT_TYPES.Session).map((page) => page.uuid);
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
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        description: value,
      }
    };
  }

  public get img(): string {
    return this._img;
  }

  public set img(value: string) {
    this._img = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        img: value,
      }
    };
  }

  public get lore(): SessionLore[] {
    return this._lore;
  }
  
  async addLore(description: string): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._lore.push({
      uuid: uuid,
      description: description,
      delivered: false,
      journalEntryPageId: null,
    });

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        lore: this._lore,
      }
    };

    await this.save();
    return uuid;
  }

  async updateLoreDescription(uuid: string, description: string): Promise<void> {
    const lore = this._lore.find(l=> l.uuid===uuid);

    if (!lore)
      return;

    lore.description = description;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        lore: this._lore,
      }
    };

    await this.save();
  }

  async updateLoreJournalEntry(loreUuid: string, journalEntryPageId: string | null): Promise<void> {
    const lore = this._lore.find(l=> l.uuid===loreUuid);

    if (!lore)
      return;

    lore.journalEntryPageId = journalEntryPageId;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        lore: this._lore,
      }
    };

    await this.save();
  }


  async deleteLore(uuid: string): Promise<void> {
    this._lore = this._lore.filter(l=> l.uuid!==uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        lore: this._lore,
      }
    };

    await this.save();
  }

  async markLoreDelivered(uuid: string, delivered: boolean): Promise<void> {
    const lore = this._lore.find((l) => l.uuid===uuid);
    if (!lore)
      return;
    
    lore.delivered = delivered;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        lore: this._lore,
      }
    };

    await this.save();
  }

  /**
   * Creates a new campaign.  Prompts for a name.
   * 
   * @param {WBWorld} world - The world to create the campaign in. 
   * @returns A promise that resolves when the campaign has been created, with either the resulting entry or null on error
   */
  static async create(world: WBWorld): Promise<Campaign | null> {
    // get the name
    let name;

    do {
      name = await inputDialog(localize('dialogs.createCampaign.title'), `${localize('dialogs.createCampaign.campaignName')}:`); 

      if (name) {
        // unlock the world to allow edits
        await world.unlock();

        // create a journal entry for the campaign
        const newCampaignDoc = await JournalEntry.create({
          name: name,
          folder: foundry.utils.parseUuid(world.uuid).id,
        },{
          pack: world.compendium.metadata.id,
        }) as unknown as CampaignDoc;  

        if (!newCampaignDoc)
          throw new Error('Couldn\'t create new journal entry for campaign');

        await setFlagDefaults(newCampaignDoc, campaignFlagSettings);

        await world.lock();

        const newCampaign = new Campaign(newCampaignDoc, world);

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
   * Find all sessions for a given campaign
   * @todo   At some point, may need to make reactive (i.e. filter by what's been entered so far) or use algolia if lists are too long; 
   *            might also consider making every topic a different subtype and then using DocumentIndex.lookup  -- that might give performance
   *            improvements in lots of places
   * @param campaignId the campaign to search
   * @param notRelatedTo if present, only return sessions that are not already linked to this session
   * @returns a list of Entries
   */
  public async getSessions(notRelatedTo?: Session | undefined): Promise<Session[]> {
    // we find all journal entries with this topic
    let sessions = this.filterSessions(()=>true);
  
    // filter unique ones if needed
    if (notRelatedTo) {
      const relatedEntries = notRelatedTo.getAllRelatedSessions(this.uuid);
  
      // also remove the current one
      sessions = sessions.filter((session) => !relatedEntries.includes(session.uuid) && session.uuid !== notRelatedTo.uuid);
    }
  
    return sessions;
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
      .filter((s: Session)=> filterFn(s));
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

    let world = await this.getWorld();

    // unlock compendium to make the change
    await world.unlock();

    let success = false;
    if (Object.keys(updateData).length !== 0) {
      // protect any complex flags
      if (updateData[`flags.${moduleId}`])
        updateData[`flags.${moduleId}`] = this.prepareFlagsForUpdate(updateData[`flags.${moduleId}`]);

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
    await world.lock();

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

    // have to unlock the pack
    await world.unlock();

    await this._doc.delete();

    await world.lock();

    await world.deleteCampaignFromWorld(id);
  }
}