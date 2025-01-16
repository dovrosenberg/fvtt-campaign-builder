import { toRaw } from 'vue';
import { getFlag, moduleId, prepareFlagsForUpdate, setFlag, setFlagDefaults, unsetFlag } from '@/settings'; 
import { CampaignDoc, CampaignFlagKey, campaignFlagSettings, DOCUMENT_TYPES, SessionDoc, WorldDoc } from '@/documents';
import { PC, Session, WBWorld } from '@/classes';
import { inputDialog } from '@/dialogs/input';
import { Lore } from './Lore';

// represents a topic entry (ex. a character, location, etc.)
export class Campaign {
  private _campaignDoc: CampaignDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  public world: WBWorld | null;  // the world the campaign is in (if we don't setup up front, we can load it later)

  // saved on JournalEntry
  private _name: string;

  // saved in flags
  private _description: string;

  /**
   * 
   * @param {CampaignDoc} campaignDoc - The campaign Foundry document
   * @param {WBWorld} world - The world the campaign is in
   */
  constructor(campaignDoc: CampaignDoc, world?: WBWorld) {
    // make sure it's the right kind of document
    if (campaignDoc.documentName !== 'JournalEntry' || !getFlag(campaignDoc, CampaignFlagKey.isCampaign))
      throw new Error('Invalid document type in Campaign constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._campaignDoc = foundry.utils.deepClone(campaignDoc);
    this._cumulativeUpdate = {};
    this.world = world || null;

    this._description = getFlag(this._campaignDoc, CampaignFlagKey.description) || '';
    this._name = campaignDoc.name;
  }

  static async fromUuid(campaignId: string, options?: Record<string, any>): Promise<Campaign | null> {
    const campaignDoc = await fromUuid(campaignId, options) as CampaignDoc;

    if (!campaignDoc)
      return null;
    else {
      return new Campaign(campaignDoc);
    }
  }

  get uuid(): string {
    return this._campaignDoc.uuid;
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

    if (!this._campaignDoc.compendium?.folder)
      throw new Error('Invalid folder id in Campaign.loadWorld()');
    
    const worldDoc = await fromUuid(this._campaignDoc.compendium.folder.uuid) as WorldDoc;

    if (!worldDoc)
      throw new Error('Invalid folder id in Campaign.loadWorld()');

    return new WBWorld(worldDoc);
  }
  
  // we return the next number after the highest currently existing session number
  get nextSessionNumber(): number {
    let maxNumber = 0;
    this._campaignDoc.pages.forEach((page: JournalEntryPage) => {
      if (page.type === DOCUMENT_TYPES.Session && (page as unknown as SessionDoc).system.number > maxNumber)
        maxNumber = (page as unknown as SessionDoc).system.number;
    });

    return maxNumber + 1;
  }

  // returns the uuids of all the sessions
  get sessions(): string[] {
    return this._campaignDoc.pages.filter((p) => p.type===DOCUMENT_TYPES.Session).map((page) => page.uuid);
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
    return this._campaignDoc;
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

  public async getAllPCs(): Promise<Record<string, PC>> {
    const pcFlag = getFlag(this._campaignDoc, CampaignFlagKey.pcs);
    const retval = {} as Record<string, PC>;

    for (const id in pcFlag) {
      const pc = await PC.fromRaw(pcFlag[id]);
      if (pc)
        retval[id] = pc;
    }

    return retval;
  }

/**
 * Updates or inserts a PC in the campaign.
 * If the PC already exists, it updates the existing entry. Otherwise, it adds the new PC.  It saves the change
 * immediately - you don't need to call Campaign.save()
 * 
 * @param {PC} pc - The PC object to be added or updated in the campaign.
 */
  public async upsertPC(pc: PC): Promise<void> {
    const currentPCs = getFlag(this._campaignDoc, CampaignFlagKey.pcs) || {};

    await setFlag(this._campaignDoc, CampaignFlagKey.pcs, {
      ...currentPCs,
      [pc.id]: pc.getRaw()
    });
  }

  public async deletePC(pcId: string): Promise<void> {
    await unsetFlag(this._campaignDoc, CampaignFlagKey.pcs, pcId);
  }

  public async getPC(pcId: string): Promise<PC | null> {
    const currentPCs = getFlag(this._campaignDoc, CampaignFlagKey.pcs) || {};

    return currentPCs[pcId] ? await PC.fromRaw(currentPCs[pcId]) : null;
  }

  public async getAllLore(): Promise<Record<string, Lore>> {
    const loreFlag = getFlag(this._campaignDoc, CampaignFlagKey.lore);
    const retval = {} as Record<string, Lore>;

    for (const id in loreFlag) {
      const lore = await Lore.fromRaw(loreFlag[id]);
      if (lore)
        retval[id] = lore;
    }

    return retval;
  }

/**
 * Updates or inserts a lore in the campaign.
 * If the lore already exists, it updates the existing entry. Otherwise, it adds the new lore.  It saves the change
 * immediately - you don't need to call Campaign.save()
 * 
 * @param {Lore} lore - The PC object to be added or updated in the campaign.
 */
  public async upsertLore(lore: Lore): Promise<void> {
    const currentLore = getFlag(this._campaignDoc, CampaignFlagKey.lore) || {};

    await setFlag(this._campaignDoc, CampaignFlagKey.lore, {
      ...currentLore,
      [lore.id]: lore.getRaw()
    });
  }

  public async deleteLore(loreId: string): Promise<void> {
    await unsetFlag(this._campaignDoc, CampaignFlagKey.lore, loreId);
  }

  public async getLore(loreId: string): Promise<Lore | null> {
    const currentLore = getFlag(this._campaignDoc, CampaignFlagKey.lore) || {};

    return currentLore[loreId] ? await Lore.fromRaw(currentLore[loreId]) : null;
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
      name = await inputDialog('Create Campaign', 'Campaign Name:');
      
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

        if (!newCampaignDoc)
          throw new Error('Couldn\'t create new campaign');

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
    return this.filterPCs(()=>true);
  }

  /**
   * Given a filter function, returns all the matching Sessions
   * inside this campaign
   * 
   * @param {(e: Session) => boolean} filterFn - The filter function
   * @returns {Session[]} The entries that pass the filter
   */
  public filterSessions(filterFn: (e: Session) => boolean): Session[] { 
    return (this._campaignDoc.pages.contents as unknown as SessionDoc[])
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
  public filterPCs(filterFn: (e: PC) => boolean): PC[] { 
    return (this._campaignDoc.pages.contents as unknown as SessionDoc[])
      .filter((p) => p.type===DOCUMENT_TYPES.PC)
      .map((s: PCDoc)=> new PC(s, this))
      .filter((s: PC)=> filterFn(s));
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
        updateData[`flags.${moduleId}`] = prepareFlagsForUpdate(this._campaignDoc, updateData[`flags.${moduleId}`]);

      const retval = await toRaw(this._campaignDoc).update(updateData) || null;
      if (retval) {
        this._campaignDoc = retval;
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
    if (!this._campaignDoc)
      return;

    const id = this._campaignDoc.uuid;

    let world = await this.getWorld();

    // have to unlock the pack
    await world.unlock();

    await this._campaignDoc.delete();

    await world.lock();

    await world.deleteCampaignFromWorld(id);
  }
}