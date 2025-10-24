// represents a game session 

import { toRaw } from 'vue';
import { DOCUMENT_TYPES, SessionLocation, SessionItem, SessionNPC, SessionMonster, SessionVignette, SessionLore, } from '@/documents';
import { searchService } from '@/utils/search';
import { FCBDialog } from '@/dialogs';
import { Campaign } from './Campaign';
import { getGlobalSetting, } from './FCBSetting';
import { localize } from '@/utils/game';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';

type SessionDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Session>;

export class Session extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Session> {
  static override _documentType = DOCUMENT_TYPES.Session;
  static override _defaultSystem = { 
    campaignId: '',  
    number: 0,  
    date: null,  
    strongStart: '',  
    locations: [],  
    items: [],  
    npcs: [],  
    monsters: [],  
    vignettes: [],  
    lore: [],  
    img: '',   
    tags: [],
  } as unknown as SessionDocClass['system'];

  public campaign: Campaign | null;  // the campaign the session is in (if we don't setup up front, we can load it later)

  /**
   * 
   * @param {SessionDoc} sessionDoc - The session Foundry document
   */
  constructor(sessionDoc: JournalEntry, campaign?: Campaign) {
    super(sessionDoc);

    this.campaign = campaign || null;
  }

  static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  > (this: T, sessionId: string): Promise<InstanceType<T> | null> { 
      const session = await super.fromUuid(sessionId) as unknown as (Session | null);
      
      if (!session)
        return null;
  
      await session.loadCampaign();
  
      return session as InstanceType<T>;
    }
  
  /**
   * Gets the Campaign associated with the session. If the campaign is already loaded, the promise resolves
   * to the existing campaign; otherwise, it loads the campaign and then resolves to it.
   * 
   * @returns {Promise<Campaign>} A promise to the setting associated with the campaign.
   */
  public async loadCampaign(): Promise<Campaign> {
    if (this.campaign)
      return this.campaign;

    this.campaign = await Campaign.fromUuid(this._clone.system.campaignId);

    if (!this.campaign)
      throw new Error('Invalid campaignId in Session.loadCampaign()');

    return this.campaign;
  }
  
  // creates a new session in the proper campaign
  static async create(campaign: Campaign, name = ''): Promise<Session | null> 
  {
    let nameToUse: string | null = name;

    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createSession.title'), `${localize('dialogs.createSession.sessionName')}:`); 
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    // by default, we make it the next session number
    const sessionNumber = campaign.currentSessionNumber==null ? 0 : campaign.currentSessionNumber + 1;

    const session = await super._create(
      campaign.compendiumId, 
      nameToUse,
      'Sessions',
      { system: { campaignId: campaign.uuid, number: sessionNumber }}
    ) as unknown as Session | null;

    if (!session)
      return null;

    await session.save();

    // add to campaign
    await campaign.addSession(session);
    
    // Add to search index
    try {
      const setting = await getGlobalSetting(session.settingId);
      if (!setting)
        throw new Error('Invalid setting in Session.create()');

      await searchService.addOrUpdateSessionIndex(session, setting);
    } catch (error) {
      console.error('Failed to add session to search index:', error);
    }

    return session;
  }

  get tags(): string[] {
    // @ts-ignore
    return this._clone.system.tags;
  }

  set tags(value: string[]) {
    // @ts-ignore
    this._clone.system.tags = value;
  }

  get notes(): string {
    return this._clone.text?.content || '';
  }

  set notes(value: string) {
    this._clone.text.content = value;
  }

  get number(): number {
    return this._clone.system.number;
  }

  set number(value: number) {
    this._clone.system.number = value;
  }

  get date(): Date | null {
    // system.date is a string, so need to convert
    if (!this._clone.system.date)
      return null;

    const dateValue = new Date(this._clone.system.date);

    return dateValue.isValid() ? dateValue : null;
  }

  set date(value: Date | null) {
    this._clone.system.date = value?.isValid() ? value.toISOString() : null;
  }

  get strongStart(): string {
    return this._clone.system.strongStart;
  }

  set strongStart(value: string) {
    this._clone.system.strongStart = value;
  }

  get img(): string {
    return this._clone.system.img || '';
  }

  set img(value: string) {
    this._clone.system.img = value;
  }

  get locations(): SessionLocation[] {
    return this._clone.system.locations || [];
  }

  set locations(value: SessionLocation[] | readonly SessionLocation[]) {
    this._clone.system.locations = value.slice();     // we clone it so it can't be edited outside
  }

  async addLocation(uuid: string, delivered: boolean = false): Promise<void> {
    if (this._clone.system.locations.find(l=> l.uuid===uuid))
      return;

    this._clone.system.locations.push({
      uuid: uuid,
      delivered: delivered
    });

    await this.save();
  }

  async deleteLocation(uuid: string): Promise<void> {
    this._clone.system.locations = this._clone.system.locations.filter(l=> l.uuid!==uuid);
    await this.save();
  }

  async markLocationDelivered(uuid: string, delivered: boolean): Promise<void> {
    const location = this._clone.system.locations.find((l) => l.uuid===uuid);
    if (!location)
      return;
    
    location.delivered = delivered; 

    await this.save();
  }

  get npcs(): SessionNPC[] {
    return this._clone.system.npcs || [];
  }

  set npcs(value: SessionNPC[] | readonly SessionNPC[]) {
    this._clone.system.npcs = value.slice();     // we clone it so it can't be edited outside
  }

  async addNPC(uuid: string, delivered: boolean = false): Promise<void> {
    if (this._clone.system.npcs.find(l=> l.uuid===uuid))
      return;

    this._clone.system.npcs.push({
      uuid: uuid,
      delivered: delivered
    });

    await this.save();
  }

  async deleteNPC(uuid: string): Promise<void> {
    this._clone.system.npcs = this._clone.system.npcs.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  async markNPCDelivered(uuid: string, delivered: boolean): Promise<void> {
    const npc = this._clone.system.npcs.find((l) => l.uuid===uuid);
    if (!npc)
      return;
    
    npc.delivered = delivered;

    await this.save();
  }

  get vignettes(): SessionVignette[] {
    return this._clone.system.vignettes || [];
  }

  set vignettes(value: SessionVignette[] | readonly SessionVignette[]) {
    this._clone.system.vignettes = value.slice();     // we clone it so it can't be edited outside
  }

  async addVignette(description: string): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._clone.system.vignettes.push({
      uuid: uuid,
      description: description,
      delivered: false
    });

    await this.save();
    return uuid;
  }

  async updateVignetteDescription(uuid: string, description: string): Promise<void> {
    const vignette = this._clone.system.vignettes.find(s=> s.uuid===uuid);

    if (!vignette)
      return;

    vignette.description = description;

    await this.save();
  }


  async deleteVignette(uuid: string): Promise<void> {
    this._clone.system.vignettes = this._clone.system.vignettes.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  async markVignetteDelivered(uuid: string, delivered: boolean): Promise<void> {
    const vignette = this._clone.system.vignettes.find((s) => s.uuid===uuid);
    if (!vignette)
      return;
    
    vignette.delivered = delivered;

    await this.save();
  }

  get lore(): SessionLore[] {
    return this._clone.system.lore || [];
  }

  set lore(value: SessionLore[] | readonly SessionLore[]) {
    this._clone.system.lore = value.slice();     // we clone it so it can't be edited outside
  }

  async addLore(description: string): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._clone.system.lore.push({
      uuid: uuid,
      description: description,
      delivered: false,
      significant: false,
      journalEntryPageId: null,
      sortOrder: this._clone.system.lore.length,
    });

    await this.save();
    return uuid;
  }

  async updateLoreDescription(uuid: string, description: string): Promise<void> {
    const lore = this._clone.system.lore.find(l=> l.uuid===uuid);

    if (!lore)
      return;

    lore.description = description;

    await this.save();
  }

  async updateLoreJournalEntry(loreUuid: string, journalEntryPageId: string | null): Promise<void> {
    const lore = this._clone.system.lore.find(l=> l.uuid===loreUuid);

    if (!lore)
      return;

    lore.journalEntryPageId = journalEntryPageId;

    await this.save();
  }


  async deleteLore(uuid: string): Promise<void> {
    this._clone.system.lore = this._clone.system.lore.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  async markLoreSignificant(uuid: string, significant: boolean): Promise<void> {
    const lore = this._clone.system.lore.find((l) => l.uuid===uuid);
    if (!lore)
      return;
    
    lore.significant = significant;

    await this.save();
  }

  async markLoreDelivered(uuid: string, delivered: boolean): Promise<void> {
    const lore = this._clone.system.lore.find((l) => l.uuid===uuid);
    if (!lore)
      return;
    
    lore.delivered = delivered;

    await this.save();
  }

  get monsters(): SessionMonster[] {
    return this._clone.system.monsters || [];
  }

  set monsters(value: SessionMonster[] | readonly SessionMonster[]) {
    this._clone.system.monsters = value.slice();     // we clone it so it can't be edited outside
  }

  async addMonster(uuid: string, number = 1): Promise<void> {
    if (this._clone.system.monsters.find(l=> l.uuid===uuid))
      return;

    this._clone.system.monsters.push({
      uuid: uuid,
      number: number,
      delivered: false
    });

    await this.save();
  }

  async updateMonsterNumber(uuid: string, value: number): Promise<void> {
    const monster = this._clone.system.monsters.find(l=> l.uuid===uuid);

    if (!monster)
      return;

    monster.number = value;

    await this.save();
  }

  async deleteMonster(uuid: string): Promise<void> {
    this._clone.system.monsters = this._clone.system.monsters.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  async markMonsterDelivered(uuid: string, delivered: boolean): Promise<void> {
    const monster = this._clone.system.monsters.find((l) => l.uuid===uuid);
    if (!monster)
      return;
    
    monster.delivered = delivered;

    await this.save();
  }

  get items(): SessionItem[] {
    return this._clone.system.items || [];
  }

  set items(value: SessionItem[] | readonly SessionItem[]) {
    this._clone.system.items = value.slice();     // we clone it so it can't be edited outside
  }

  async addItem(uuid: string): Promise<void> {
    if (this._clone.system.items.find(i=> i.uuid===uuid))
      return;

    this._clone.system.items.push({
      uuid: uuid,
      delivered: false
    });

    await this.save();
  }

  async deleteItem(uuid: string): Promise<void> {
    this._clone.system.items = this._clone.system.items.filter(i=> i.uuid!==uuid);
    await this.save();
  }

  async markItemDelivered(uuid: string, delivered: boolean): Promise<void> {
    const item = this._clone.system.items.find((i) => i.uuid===uuid);
    if (!item)
      return;
    
    item.delivered = delivered;
    await this.save();
  }

  get campaignId(): string {
    return this._clone.system.campaignId;
  }

  set campaignId(value: string) {
    this._clone.system.campaignId = value;
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates a session in the database
   * 
   * @returns A promise that resolves after the update
   */
  public async save(): Promise<void> {
    const campaign = await this.loadCampaign();

    // we attempt to save first - because if it fails, we don't 
    //    want to adjust anything else
    try {
      // see if the number is taken, if so, everything after it needs to be renumbered
      const sessions = (await campaign.allSessions()).sort((a, b) => a.number - b.number);

      // find the index of the session with the same number 
      const currentNumberedSession = sessions.findIndex(s=> s.number===this.number && s.uuid!==this.uuid);

      if (currentNumberedSession!==-1) {
        // need to re-number everything after this one
        // go backward because otherwise these saves will kickoff a cascade of changes
        for (let i = sessions.length-1; i>= currentNumberedSession; i--) {
          if (sessions[i].uuid!==this.uuid) {
            sessions[i].number++;
            await sessions[i].save();
          }
        }
      }

      await super.save();
    } catch (error) {
      throw error;
    }

    // we could get more specific about exactly whether we need to renumber the
    //    campaign or not, but don't bother
    await campaign.resetCurrentSession();

    // Update the search index (rely on retval being null if no changes were made)
    try {
      const setting = await getGlobalSetting(this.settingId);

      if (!setting)
        throw new Error('Setting not found in Session.save()');
      
      await searchService.addOrUpdateSessionIndex(this, setting);
    } catch (error) {
      console.error('Failed to update search index:', error);
    }
  }

  public async delete() {
    const id = this.uuid;
    const setting = await getGlobalSetting(this.settingId);

    if (!setting)
      throw new Error('Setting not found in Session.delete()');
    
    // remove from campaign
    const campaign = await Campaign.fromUuid(this.campaignId);
    if (!campaign)
      throw new Error('Campaign not found in Session.delete()');
    
    await campaign.deleteSession(this);
    
    await toRaw(this._doc).delete();

    // remove from the expanded list
    await setting.deleteSessionFromSetting(id);
  }
    
}