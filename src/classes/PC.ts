import { DOCUMENT_TYPES, PCDoc } from '@/documents';
import { Campaign, WBWorld } from '@/classes';
import { localize } from '@/utils/game';
import { inputDialog } from '@/dialogs/input';
import { toRaw } from 'vue';

// represents a PC - these are stored in flag inside campaigns so saving, etc. is handled by campaign
export class PC {
  public parentCampaign: Campaign | null;  // the campaign the session is in (if we don't setup up front, we can load it later)

  private _pcDoc: PCDoc;
  private _actor: Actor | null;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   */
  constructor(pcDoc: PCDoc, parentCampaign?: Campaign) {
    // make sure it's the right kind of document
    if (pcDoc.type !== DOCUMENT_TYPES.PC)
      throw new Error('Invalid document type in PC constructor');

    // clone it to avoid unexpected changes
    this._pcDoc = foundry.utils.deepClone(pcDoc);
    this._cumulativeUpdate = {};
    this.parentCampaign = parentCampaign || null;
  }

  static async fromUuid(pcId: string, options?: Record<string, any>): Promise<PC | null> {
    const pcDoc = await fromUuid(pcId, options) as PCDoc;

    if (!pcDoc)
      return null;
    else
      return new PC(pcDoc);
  }

  /**
   * Gets the Campaign associated with the PC. If the campaign is already loaded, the promise resolves
   * to the existing campaign; otherwise, it loads the campaign and then resolves to it.
   * 
   * @returns {Promise<Campaign>} A promise to the world associated with the campaign.
   */
  public async loadCampaign(): Promise<Campaign> {
    if (this.parentCampaign)
      return this.parentCampaign;

    this.parentCampaign = await Campaign.fromUuid(this._pcDoc.parent.uuid);

    if (!this.parentCampaign)
      throw new Error('Invalid session in PC.loadCampaign()');

    return this.parentCampaign;
  }
  
  /**
   * Gets the Actor associated with the PC. If the actor is already loaded, the promise resolves
   * to the existing actor; otherwise, it loads the actor and then resolves to it.
   * 
   * @returns {Promise<Actor | null>} A promise to the world associated with the campaign.
   */
  public async getActor(): Promise<Actor | null> {
    if (this._actor)
      return this._actor;
    else if (!this._pcDoc.system.actorId)
      return null;

    this._actor = (await fromUuid(this._pcDoc.system.actorId)) as Actor | null;

    if (!this._actor)
      throw new Error('Invalid actor in PC.getActor()');

    return this._actor;
  }

  public get actor(): Actor | null {
    return this._actor;
  }

  /**
   * Gets the world associated with a PC, loading into the campaign 
   * if needed.
   * 
   * @returns {Promise<WBWorld>} A promise to the world associated with the campaign.
   */
  public async getWorld(): Promise<WBWorld> {
    if (!this.parentCampaign)
      this.parentCampaign = await this.loadCampaign();

    if (!this.parentCampaign)
      throw new Error('Invalid campaign in PC.getWorld()');
    
    return this.parentCampaign.getWorld();
  }

  
  // creates a new PC in the proper campaign journal in the given world
  static async create(campaign: Campaign): Promise<PC | null> 
  {
    let nameToUse = '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await inputDialog(localize('dialogs.createPC.title'), `${localize('dialogs.createPC.playerName')}:`); 
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    const world = await campaign.getWorld();

    // create the entry
    await world.unlock();

    const pcDoc = await JournalEntryPage.createDocuments([{
      type: DOCUMENT_TYPES.PC,
      name: `<${localize('placeholders.linkToActor')}>`,
      system: {
        playerName: nameToUse,
        actorId: null,
        plotPoints: '',
        background: '',
        magicItems: '',
      }
    }],{
      parent: campaign.raw as JournalEntry,
    }) as unknown as PCDoc[];

    await world.lock();

    if (pcDoc) {
      const pc = new PC(pcDoc[0], campaign);
      return pc;
    } else {
      return null;
    }
  }

  get uuid(): string {
    return this._pcDoc.uuid;
  }

  get name(): string {
    if (!this._pcDoc.system.actorId)
      return `<${localize('placeholders.linkToActor')}>`;
    else if (!this._actor)
      return '';
    else
      return this._actor.name;
  }

  get playerName(): string {
    return this._pcDoc.system.playerName || '';
  }

  set playerName(value: string) {
    this._pcDoc.system.playerName = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        playerName: value,
      }
    };
  }

  get plotPoints(): string {
    return this._pcDoc.system.plotPoints || '';
  }

  set plotPoints(value: string) {
    this._pcDoc.system.plotPoints = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        plotPoints: value,
      }
    };
  }

  get background(): string {
    return this._pcDoc.system.background || '';
  }

  set background(value: string) {
    this._pcDoc.system.background = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        background: value,
      }
    };
  }

  get magicItems(): string {
    return this._pcDoc.system.magicItems || '';
  }

  set magicItems(value: string) {
    this._pcDoc.system.magicItems = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        magicItems: value,
      }
    };
  }

  get actorId(): string {
    return this._pcDoc.system.actorId || '';
  }

  set actorId(value: string) {
    this._pcDoc.system.actorId = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        actorId: value,
      }
    };
  }

  get campaignId(): string {
    return this._pcDoc.parent.uuid;
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): PCDoc {
    return this._pcDoc;
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates a PC in the database
   * 
   * @returns {Promise<PC | null>} The updated PC, or null if the update failed.
   */
  public async save(): Promise<PC | null> {
    const world = await this.getWorld();

    const updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    await world.unlock();

    const retval = await toRaw(this._pcDoc).update(updateData) || null;
    if (retval) {
      this._pcDoc = retval;
    }

    this._cumulativeUpdate = {};

    await world.lock();

    return retval ? this : null;
  }

  public async delete() {
    if (!this._pcDoc)
      return;

    const world = await this.getWorld() as WBWorld;

    // have to unlock the pack
    await world.unlock();

    await this._pcDoc.delete();

    await world.lock();
  }
}