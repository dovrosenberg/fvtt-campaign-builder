import { toRaw } from 'vue';

import { EntryDoc, } from '@/documents';
import { ValidTopic } from '@/types';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { cleanTrees } from '@/utils/hierarchy';

// represents a topic entry (ex. a character, location, etc.)
export class Campaign {
  static worldCompendium: CompendiumCollection<any>;

  private _campaignDoc: JournalEntry;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {JournalEntry} campaignDoc - The entry Foundry document
   */
  constructor(campaignDoc: JournalEntry) {
    // clone it to avoid unexpected changes, also drop the proxy
    this._campaignDoc = foundry.utils.deepClone(campaignDoc);
    this._cumulativeUpdate = {};
  }

  static async fromUuid(entryId: string, options?: Record<string, any>): Promise<Campaign | null> {
    const campaignDoc = await fromUuid(entryId, options) as JournalEntry;

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
  static async create(): Promise<JournalEntry | null> {
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
          pack: Campaign.worldCompendium.uuid,
        });  

        // unlock compendium to make the change
        await Campaign.worldCompendium.configure({locked:true});

        if (!campaign)
          throw new Error('Couldn\'t create new campaign');

        // update the list of campaigns
        const campaigns = WorldFlags.get(worldId, WorldFlagKey.campaignEntries);
        campaigns[campaign.uuid] = name;
        await WorldFlags.set(worldId, WorldFlagKey.campaignEntries, campaigns);
        
        return campaign;
      }
    } while (name==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }

  get uuid(): string {
    return this._campaignDoc.uuid;
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
  get raw(): JournalEntry {
    return this._campaignDoc;
  }

  // used to set arbitrary properties on the campaignDoc
  public setProperty(key: string, value: any) {
    this._campaignDoc[key] = value;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [key]: value,
    };
  }

  /**
   * Updates a campaign in the database 
   * 
   * @returns {Promise<Campaign | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Campaign | null> {
    let updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    await Campaign.worldCompendium.configure({locked:false});

    const retval = await toRaw(this._campaignDoc).update(updateData) || null;
    if (retval) {
      this._campaignDoc = retval;
      this._cumulativeUpdate = {};
    }

    await Campaign.worldCompendium.configure({locked:true});

    return retval ? this : null;
  }

  public static async deleteCampaign(campaignId: string) {
    if (!Campaign.worldCompendium)
      return;

    // have to unlock the pack
    await Campaign.worldCompendium.configure({locked:false});

    await Campaign.worldCompendium.deleteDocument(campaignId);

    await Campaign.worldCompendium.configure({locked:true});

    // update the flags
    await WorldFlags.unset(Campaign.worldCompendium.uuid, WorldFlagKey.campaignEntries, campaignId);
    await WorldFlags.unset(Campaign.worldCompendium.uuid, WorldFlagKey.expandedCampaignIds, campaignId);
  }
 
}