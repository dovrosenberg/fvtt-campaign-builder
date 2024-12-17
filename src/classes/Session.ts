import { toRaw } from 'vue';

import { DOCUMENT_TYPES, SessionDoc, CampaignDoc } from '@/documents';
import { inputDialog } from '@/dialogs/input';
import { WorldFlagKey, WorldFlags } from '@/settings';

// represents a topic entry (ex. a character, location, etc.)
export class Session {
  static worldCompendium: CompendiumCollection<any> | undefined;
  static worldId: string = '';
  static currentCampaignJournals: Record<string, CampaignDoc> = {}; // keyed by id

  private _sessionDoc: SessionDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {SessionDoc} sessionDoc - The session Foundry document
   */
  constructor(sessionDoc: SessionDoc) {
    // make sure it's the right kind of document
    if (sessionDoc.type !== DOCUMENT_TYPES.Session)
      throw new Error('Invalid document type in Session constructor');

    // clone it to avoid unexpected changes
    this._sessionDoc = foundry.utils.deepClone(sessionDoc);
    this._cumulativeUpdate = {};
  }


  static async fromUuid(sessionId: string, options?: Record<string, any>): Promise<Session | null> {
    const sessionDoc = await fromUuid(sessionId, options) as SessionDoc;

    if (!sessionDoc)
      return null;
    else
      return new Session(sessionDoc);
  }

  // creates a new session in the proper campaign journal in the given world
  static async create(campaignId: string): Promise<Session | null> 
  {
    if (!Session.worldCompendium || !Session.currentCampaignJournals || !Session.currentCampaignJournals[campaignId])
      throw new Error('No compendium or campaign journals in Session.create()');

    let nameToUse = '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await inputDialog('Create Session', 'Session Name:'); 
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    // create the entry
    await Session.worldCompendium.configure({locked:false});

    const sessionDoc = await JournalEntryPage.createDocuments([{
      type: DOCUMENT_TYPES.Session,
      name: nameToUse,
      system: {
        type: DOCUMENT_TYPES.Session,
        number: null,
        description: '',
      }
    }],{
      parent: Session.currentCampaignJournals[campaignId],
    }) as unknown as SessionDoc;

    await Session.worldCompendium.configure({locked:true});

    return sessionDoc[0] ? new Session(sessionDoc[0]) : null;
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

  get description(): string {
    return this._sessionDoc.system.description || '';
  }

  set description(value: string) {
    this._sessionDoc.system.description = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        description: value,
      }
    };
  }

  get number(): number | null{
    return (this._sessionDoc.system.number!==null && this._sessionDoc.system.number!==undefined) ? this._sessionDoc.system.number : null;
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

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): SessionDoc {
    return this._sessionDoc;
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates an entry in the database
   * 
   * @returns {Promise<Entry | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<Session | null> {
    if (!Session.worldCompendium)
      throw new Error('No compendium in Session.save()');

    const updateData = this._cumulativeUpdate;

    // unlock compendium to make the change
    await Session.worldCompendium.configure({locked:false});

    const retval = await toRaw(this._sessionDoc).update(updateData) || null;
    if (retval) {
      this._sessionDoc = retval;
    }

    this._cumulativeUpdate = {};

    await Session.worldCompendium.configure({locked:true});

    return retval ? this : null;
  }

  /**
   * Given a topic and a filter function, returns all the matching Entries
   * 
   * @param {ValidTopic} topic - The topic to filter
   * @param {(e: Entry) => boolean} filterFn - The filter function
   * @returns {Entry[]} The entries that pass the filter
   */
  public static filter(campaignId: string, filterFn: (e: Session) => boolean): Session[] { 
    if (!Session.currentCampaignJournals || !Session.currentCampaignJournals[campaignId])
      return [];
    
    return (Session.currentCampaignJournals[campaignId].pages.contents as SessionDoc[])
      .map((s: SessionDoc)=> new Session(s))
      .filter((s: Session)=> filterFn(s));
  }

  public static async deleteSession(sessionId: string) {
    const sessionDoc = await fromUuid(sessionId) as SessionDoc;

    if (!sessionDoc || !Session.worldCompendium)
      return;

    // have to unlock the pack
    await Session.worldCompendium.configure({locked:false});

    // remove from the expanded list
    await WorldFlags.unset(Session.worldId, WorldFlagKey.expandedIds, sessionId);

    await sessionDoc.delete();

    await Session.worldCompendium.configure({locked:true});
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
  public static async getSessionsForCampaign(campaignId: string, notRelatedTo?: Session | undefined): Promise<Session[]> {
    if (!Session.currentCampaignJournals || !Session.currentCampaignJournals[campaignId])
      return [];
  
    // we find all journal entries with this topic
    let sessions = await Session.filter(campaignId, ()=>true);
  
    // filter unique ones if needed
    if (notRelatedTo) {
      const relatedEntries = notRelatedTo.getAllRelatedSessions(campaignId);
  
      // also remove the current one
      sessions = sessions.filter((session) => !relatedEntries.includes(session.uuid) && session.uuid !== notRelatedTo.uuid);
    }
  
    return sessions;
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