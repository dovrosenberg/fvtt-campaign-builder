import { toRaw } from 'vue';

import { DOCUMENT_TYPES, SessionDoc, } from '@/documents';
import { inputDialog } from '@/dialogs/input';
import { Campaign, WBWorld } from '@/classes';
import { localize } from '@/utils/game';

// represents a topic entry (ex. a character, location, etc.)
export class Session {
  public parentCampaign: Campaign | null;  // the campaign the session is in (if we don't setup up front, we can load it later)

  private _sessionDoc: SessionDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {SessionDoc} sessionDoc - The session Foundry document
   */
  constructor(sessionDoc: SessionDoc, parentCampaign?: Campaign) {
    // make sure it's the right kind of document
    if (sessionDoc.type !== DOCUMENT_TYPES.Session)
      throw new Error('Invalid document type in Session constructor');

    // clone it to avoid unexpected changes
    this._sessionDoc = foundry.utils.deepClone(sessionDoc);
    this._cumulativeUpdate = {};
    this.parentCampaign = parentCampaign || null;
  }

  static async fromUuid(sessionId: string, options?: Record<string, any>): Promise<Session | null> {
    const sessionDoc = await fromUuid(sessionId, options) as SessionDoc;

    if (!sessionDoc)
      return null;
    
    const session = new Session(sessionDoc);
    await session.loadCampaign();
    return session;
  }

  /**
   * Gets the Campaign associated with the session. If the campaign is already loaded, the promise resolves
   * to the existing campaign; otherwise, it loads the campaign and then resolves to it.
   * 
   * @returns {Promise<Campaign>} A promise to the world associated with the campaign.
   */
  public async loadCampaign(): Promise<Campaign> {
    if (this.parentCampaign)
      return this.parentCampaign;

    this.parentCampaign = await Campaign.fromUuid(this._sessionDoc.parent.uuid);

    if (!this.parentCampaign)
      throw new Error('Invalid session in Session.loadCampaign()');

    return this.parentCampaign;
  }
  
  /**
   * Gets the world associated with a session, loading into the campaign 
   * if needed.
   * 
   * @returns {Promise<WBWorld>} A promise to the world associated with the campaign.
   */
  public async getWorld(): Promise<WBWorld> {
    if (!this.parentCampaign)
      this.parentCampaign = await this.loadCampaign();

    if (!this.parentCampaign)
      throw new Error('Invalid campaign in Session.getWorld()');
    
    return this.parentCampaign.getWorld();
  }
  

  // creates a new session in the proper campaign journal in the given world
  static async create(campaign: Campaign): Promise<Session | null> 
  {
    let nameToUse = '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await inputDialog(localize('dialogs.createSession.title'), `${localize('dialogs.createSession.sessionName')}:`); 
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    const world = await campaign.getWorld();

    // create the entry
    await world.unlock();

    const sessionDoc = await JournalEntryPage.createDocuments([{
      type: DOCUMENT_TYPES.Session,
      name: nameToUse,
      system: {
        number: campaign.nextSessionNumber,
        description: '',
      }
    }],{
      parent: campaign.raw as JournalEntry,
    }) as unknown as SessionDoc[];

    await world.lock();

    if (sessionDoc) {
      const session = new Session(sessionDoc[0], campaign);
      return session;
    } else {
      return null;
    }
  }

  get uuid(): string {
    return this._sessionDoc.uuid;
  }

  get name(): string {
    return this._sessionDoc.name;
  }

  set name(value: string) {
    this._sessionDoc.name = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      name: value,
    };
  }

  get notes(): string {
    return this._sessionDoc.text?.content || '';
  }

  set notes(value: string) {
    this._sessionDoc.text.content = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      text: {
        content: value,
      }
    };
  }

  get number(): number {
    return this._sessionDoc.system.number;
  }

  set number(value: number) {
    this._sessionDoc.system.number = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        number: value,
      }
    };
  }

  get startingAction(): string {
    return this._sessionDoc.system.startingAction;
  }

  set startingAction(value: string) {
    this._sessionDoc.system.startingAction = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        startingAction: value,
      }
    };
  }

  get campaignId(): string {
    return this._sessionDoc.parent.uuid;
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): SessionDoc {
    return this._sessionDoc;
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates a session in the database
   * 
   * @returns {Promise<Session | null>} The updated session, or null if the update failed.
   */
  public async save(): Promise<Session | null> {
    const world = await this.getWorld();

    const updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    await world.unlock();

    const retval = await toRaw(this._sessionDoc).update(updateData) || null;
    if (retval) {
      this._sessionDoc = retval;
    }

    this._cumulativeUpdate = {};

    await world.lock();

    return retval ? this : null;
  }

  public async delete() {
    if (!this._sessionDoc)
      return;

    const id = this._sessionDoc.uuid;
    const world = await this.getWorld() as WBWorld;

    // have to unlock the pack
    await world.unlock();

    await this._sessionDoc.delete();

    // remove from the expanded list
    await world.deleteSessionFromWorld(id);

    await world.lock();
  }
  
  /**
   * Retrieves a list of all uuids that are linked to the current session.  For now, we don't
   * track them, so it's empty
   * 
   * @param campaignId - The topic for which to retrieve related items.
   * @returns An array of related uuids. Returns an empty array if there is no current entry.
   */
  public getAllRelatedSessions(_campaignId: string): string[] {
    return [];
  }
  
}