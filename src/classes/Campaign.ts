import { toRaw } from 'vue';
import { inputDialog } from '@/dialogs/input';
import { WorldFlags, WorldFlagKey, moduleId } from '@/settings'; 
import { CampaignDoc, EntryDoc } from '@/documents';

// represents a topic entry (ex. a character, location, etc.)
export class Campaign {
  static worldCompendium: CompendiumCollection<any> | undefined;
  static worldId: string = '';

  private _campaignDoc: CampaignDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {CampaignDoc} campaignDoc - The entry Foundry document
   */
  constructor(campaignDoc: CampaignDoc) {
    // make sure it's the right kind of document
    if (campaignDoc.documentName !== 'JournalEntry' || !campaignDoc.getFlag(moduleId, 'isCampaign'))
      throw new Error('Invalid document type in Campaign constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._campaignDoc = foundry.utils.deepClone(campaignDoc);
    this._cumulativeUpdate = {};
  }

  static async fromUuid(entryId: string, options?: Record<string, any>): Promise<Campaign | null> {
    const campaignDoc = await fromUuid(entryId, options) as CampaignDoc;

    if (!campaignDoc)
      return null;
    else
      return new Campaign(campaignDoc);
  }

  /**
     * Creates a new campaign inside the given world.  Prompts for a name.
     * 
     * @returns A promise that resolves when the campaign has been created, with either the resulting entry or null on error
     */
  static async create(): Promise<CampaignDoc | null> {
    if (!Campaign.worldCompendium)
      return null;

    // get the name
    let name;

    do {
      name = await inputDialog('Create Campaign', 'Campaign Name:');
      
      if (name) {
        // unlock compendium to make the change
        await Campaign.worldCompendium.configure({locked:false});

        // create a journal entry for the campaign
        const campaign = await JournalEntry.create({
          name: name,
        },{
          pack: Campaign.worldCompendium.metadata.id,
        }) as unknown as CampaignDoc;  

        if (campaign) {
          await campaign.setFlag(moduleId, 'isCampaign', true);
          await campaign.setFlag(moduleId, 'description', '');
          await campaign.setFlag(moduleId, 'nextSessionNumber', 0);
        }

        // unlock compendium to make the change
        await Campaign.worldCompendium.configure({locked:true});

        if (!campaign)
          throw new Error('Couldn\'t create new campaign');

        // update the list of campaigns
        const campaigns = WorldFlags.get(Campaign.worldId, WorldFlagKey.campaignEntries);
        campaigns[campaign.uuid] = name;
        await WorldFlags.set(Campaign.worldId, WorldFlagKey.campaignEntries, campaigns);
        
        return campaign;
      }
    } while (name==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }

  get uuid(): string {
    return this._campaignDoc.uuid;
  }

  get nextSessionNumber(): number {
    return this._campaignDoc.getFlag(moduleId, 'nextSessionNumber');
  }

  set nextSessionNumber(value: number) {
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.nextSessionNumber`]: value
    };
  }

  // returns the uuids of all the sessions
  get sessions(): string[] {
    return this._campaignDoc.pages.map((page) => page.uuid);
  }

  get name(): string {
    return this._campaignDoc.name;
  }

  set name(value: string) {
    this._campaignDoc.name = value;
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
    return this._campaignDoc.getFlag(moduleId, 'description') || '';
  }

  set description(value: string) {
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.description`]: value
    };
  }

  /**
   * Updates a campaign in the database 
   * 
   * @returns {Promise<Campaign | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Campaign | null> {
    if (!Campaign.worldCompendium)
      return null;

    const updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    await Campaign.worldCompendium.configure({locked:false});

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
        const campaigns = WorldFlags.get(Campaign.worldId, WorldFlagKey.campaignEntries) || {};  
        campaigns[this._campaignDoc.uuid] = this._campaignDoc.name;
        await WorldFlags.set(Campaign.worldId, WorldFlagKey.campaignEntries, campaigns);
      }
    }
    await Campaign.worldCompendium.configure({locked:true});

    return success ? this : null;
  }

  /**
   * Deletes a campaign from the database, along with all the related sessions
   * 
   * @param {string} campaignId The id of the campaign to delete
   * 
   * @returns {Promise<void>}
   */
  public static async deleteCampaign(campaignId: string) {
    if (!Campaign.worldCompendium)
      return;

    const campaignDoc = await fromUuid(campaignId) as EntryDoc;
    if (!campaignDoc)
      return;

    // have to unlock the pack
    await Campaign.worldCompendium.configure({locked:false});

    await campaignDoc.delete();

    await Campaign.worldCompendium.configure({locked:true});

    // update the flags
    await WorldFlags.unset(Campaign.worldId, WorldFlagKey.campaignEntries, campaignId);
    await WorldFlags.unset(Campaign.worldId, WorldFlagKey.expandedCampaignIds, campaignId);
  }
 
}