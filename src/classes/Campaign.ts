import { toRaw } from 'vue';
import { getFlag, moduleId, setFlagDefaults } from '@/settings'; 
import { CampaignDoc, CampaignFlagKey, SessionDoc, WorldDoc } from '@/documents';
import { Session, WBWorld } from '@/classes';
import { inputDialog } from '@/dialogs/input';

// represents a topic entry (ex. a character, location, etc.)
export class Campaign {
  static worldId: string = '';

  private _world: WBWorld | null;  // the world the campaign is in (if we don't setup up front, we can load it later)
  private _campaignDoc: CampaignDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  // saved on JournalEntry
  private _name: string;

  // saved in flags
  private _description: string;
  private _pcs: string[];   // Actor ids

  /**
   * 
   * @param {CampaignDoc} campaignDoc - The entry Foundry document
   * @param {WBWorld} world - The world the campaign is in
   */
  constructor(campaignDoc: CampaignDoc, world?: WBWorld) {
    // make sure it's the right kind of document
    if (campaignDoc.documentName !== 'JournalEntry' || !getFlag(campaignDoc, CampaignFlagKey.isCampaign))
      throw new Error('Invalid document type in Campaign constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._campaignDoc = foundry.utils.deepClone(campaignDoc);
    this._cumulativeUpdate = {};
    this._world = world || null;

    this._description = getFlag(this._campaignDoc, CampaignFlagKey.description) || '';
    this._pcs = getFlag(this._campaignDoc, CampaignFlagKey.pcs) || [];
  }

  static async fromUuid(entryId: string, options?: Record<string, any>): Promise<Campaign | null> {
    const campaignDoc = await fromUuid(entryId, options) as CampaignDoc;

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
   *
   * Get the WBWorld object for the campaign. Poduces a promise so needs to be awaited.
   *
   * @readonly
   * @type {Promixe<WbWorld>} Note that it's a promise
   * @memberof Campaign
   */
  get world(): Promise<WBWorld> {
    return (async (): Promise<WBWorld> => {
      if (this._world)
        return this._world;
      else {
        const worldDoc = await fromUuid(this._campaignDoc.folder) as WorldDoc;

        if (!worldDoc)
          throw new Error('Invalid folder id in Campaign.getWorld()');

        return new WBWorld(worldDoc);
      }
    })();
  }

  // we return the next number after the highest currently existing sessio nnumber
  get nextSessionNumber(): number {
    let maxNumber = -1;
    this._campaignDoc.pages.forEach((page: JournalEntryPage) => {
      if ((page as unknown as SessionDoc).system.number > maxNumber)
        maxNumber = (page as unknown as SessionDoc).system.number;
    });

    return maxNumber + 1;
  }

  // returns the uuids of all the sessions
  get sessions(): string[] {
    return this._campaignDoc.pages.map((page) => page.uuid);
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
      [`flags.${moduleId}.description`]: value
    };
  }

  get pcs(): readonly string[] {
    return this._pcs;
  }

  set pcs(value: string[]) {
    this._pcs = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.pcs`]: value
    };
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
        },{
          pack: world.uuid,
        }) as unknown as CampaignDoc;  

        if (newCampaignDoc) {
          await setFlagDefaults(newCampaignDoc);
        }

        await world.lock();

        if (!newCampaignDoc)
          throw new Error('Couldn\'t create new campaign');

        const newCampaign = new Campaign(newCampaignDoc, world);

        Session.currentCampaignJournals[newCampaign.uuid] = newCampaignDoc;

        world.campaignEntries = {
          ...world.campaignEntries,
          [newCampaign.uuid]: name,
        };
        
        return newCampaign;
      }
    } while (name==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }
  
  /**
   * Updates a campaign in the database 
   * 
   * @returns {Promise<Campaign | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Campaign | null> {
    const updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    await (await this.world).unlock();

    let success = false;
    if (Object.keys(updateData).length !== 0) {
      const retval = await toRaw(this._campaignDoc).update(updateData) || null;
      if (retval) {
        this._campaignDoc = retval;
        this._cumulativeUpdate = {};

        success = true;
      }

      // update the name
      if (updateData.name !== undefined) {
        (await this.world).updateCampaignName(this.uuid, updateData.name);
      }
    }
    await (await this.world).lock();

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

    // have to unlock the pack
    await (await this.world).unlock();

    await this._campaignDoc.delete();

    await (await this.world).lock();

    (await this.world).deleteCampaignFromWorld(id);
  }
}