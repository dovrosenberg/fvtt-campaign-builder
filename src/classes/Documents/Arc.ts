// represents a game session 

import { ArcLocation, ArcLore, ArcMonster, ArcParticipant, DOCUMENT_TYPES, } from '@/documents';
import { searchService } from '@/utils/search';
import { FCBDialog } from '@/dialogs';
import { Campaign } from './Campaign';
import { localize } from '@/utils/game';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';
import { Session } from './Session';
import { getGlobalSetting } from '@/utils/globalSettings';
import { Idea } from '@/types';

type ArcDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Arc>;

export class Arc extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Arc> {
  static override _documentType = DOCUMENT_TYPES.Arc;
  static override _defaultSystem = { 
    campaignId: '',  
    startSessionNumber: -1,
    endSessionNumber: -1,
    sortOrder: 0,
    customFields: {},
    locations: [],  
    participants: [],  
    monsters: [],  
    ideas: [],
    lore: [],  
    img: '',   
    tags: [],
    storyWebs: [],
  } as unknown as ArcDocClass['system'];

  public campaign: Campaign | null;  // the campaign the front is in (if we don't setup up front, we can load it later)

  /**
   * 
   * @param {ArcDoc} arcDoc - The arc Foundry document
   */
  constructor(arcDoc: JournalEntry, campaign?: Campaign) {
    super(arcDoc);

    this.campaign = campaign || null;
  }

  static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  > (this: T, arcId: string): Promise<InstanceType<T> | null> { 
      const arc = await super.fromUuid(arcId) as unknown as (Arc | null);
      
      if (!arc)
        return null;
  
      await arc.loadCampaign();
  
      return arc as InstanceType<T>;
    }
  
  /**
   * Gets the Campaign associated with the arc. If the campaign is already loaded, the promise resolves
   * to the existing campaign; otherwise, it loads the campaign and then resolves to it.
   * 
   * @returns {Promise<Campaign>} A promise to the setting associated with the campaign.
   */
  public async loadCampaign(): Promise<Campaign> {
    if (this.campaign)
      return this.campaign;

    this.campaign = await Campaign.fromUuid(this._clone.system.campaignId);

    if (!this.campaign)
      throw new Error('Invalid campaignId in Arc.loadCampaign(): ' + this.uuid + ' ' + this._clone.system.campaignId );

    return this.campaign;
  }
  
  // creates a new arc in the proper campaign
  static async create(campaign: Campaign, name = ''): Promise<Arc | null> 
  {
    let nameToUse: string | null = name;

    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createArc.title'), `${localize('dialogs.createArc.arcName')}:`); 
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    const arc = await super._create(
      campaign.compendiumId, 
      nameToUse,
      localize('contentFolders.arcs'),
      //TODO put in proper starting system
      { system: { campaignId: campaign.uuid }}
    ) as unknown as Arc | null;

    if (!arc)
      return null;

    // add to campaign and setting indexes; also sets the sort order
    //    because we don't want to call Arc.update() until it's been
    //    added to the index
    await campaign.addArc(arc);
    
    // Add to search index
    try {
      await searchService.addOrUpdateArcIndex(arc);
    } catch (error) {
      console.error('Failed to add arc to search index:', error);
    }

    return arc;
  }

  public async isCampaignCompleted(): Promise<boolean> {
    const campaign = await this.loadCampaign();
    return campaign.completed;
  }

  get startSessionNumber(): number {
    return this._clone.system.startSessionNumber;
  }

  set startSessionNumber(value: number) {
    this._clone.system.startSessionNumber = value;
  }

  get endSessionNumber(): number {
    return this._clone.system.endSessionNumber;
  }

  set endSessionNumber(value: number) {
    this._clone.system.endSessionNumber = value;
  }

  public get ideas(): readonly Idea[] {
    return this._clone.system.ideas;
  }

  public set ideas(value: Idea[] | readonly Idea[]) {
    this._clone.system.ideas = value.slice();     // we clone it so it can't be edited outside (this is historical)
  }

  /** Creates a new idea item and adds to the arc*/
  /** returns the uuid */
  public async addIdea(text: string): Promise<string | null> {
    const item: Idea = {
      uuid: foundry.utils.randomID(),
      text: text || '',
      sortOrder: this._clone.system.ideas.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
    };

    this._clone.system.ideas.push(item);
    await this.save();

    return item.uuid;
  }
  
  public async updateIdea(uuid: string, newText: string): Promise<void> {
    const item = this._clone.system.ideas.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.text = newText;
    await this.save();
  }

  public async deleteIdea(uuid: string): Promise<void> {
    this._clone.system.ideas = this._clone.system.ideas.filter(i => i.uuid !== uuid);
    await this.save();
  }

  public async moveIdeaToCampaign(uuid: string): Promise<void> {
    const item = this._clone.system.ideas.find(i => i.uuid === uuid);
    if (!item)
      return;

    await this.campaign?.addIdea(item.text);    
    this._clone.system.ideas = this._clone.system.ideas.filter(i => i.uuid !== uuid);
    await this.save();
  }


  public async getLastSession(): Promise<Session | null> {
    if (this.endSessionNumber==-1)
      return null;

    await this.loadCampaign();
    const index = this.campaign?.sessionIndex.find(s=> s.number===this.endSessionNumber);
    if (!index)
      return null;

    return (await Session.fromUuid(index.uuid)) || null;
  }

  get sortOrder(): number {
    return this._clone.system.sortOrder;
  }

  set sortOrder(value: number) {
    this._clone.system.sortOrder = value;
  }

  get tags(): string[] {
    // @ts-ignore
    return this._clone.system.tags;
  }

  set tags(value: string[]) {
    // @ts-ignore
    this._clone.system.tags = value;
  }

  get storyWebs(): string[] {
    return (this._clone.system as any).storyWebs || [];
  }

  set storyWebs(value: string[] | readonly string[]) {
    (this._clone.system as any).storyWebs = value.slice();
  }

  get description(): string {
    return this._clone.text?.content || '';
  }

  set description(value: string) {
    this._clone.text.content = value;
  }

  get img(): string {
    return this._clone.system.img || '';
  }

  set img(value: string) {
    this._clone.system.img = value;
  }

  get locations(): ArcLocation[] {
    return this._clone.system.locations || [];
  }

  set locations(value: ArcLocation[] | readonly ArcLocation[]) {
    this._clone.system.locations = value.slice();     // we clone it so it can't be edited outside
  }

  async addLocation(uuid: string, notes: string = ''): Promise<void> {
    if (this._clone.system.locations.find(l=> l.uuid===uuid))
      return;

    this._clone.system.locations.push({ uuid, notes });
    await this.save();
  }

  async deleteLocation(uuid: string): Promise<void> {
    this._clone.system.locations = this._clone.system.locations.filter(l=> l.uuid!==uuid);
    await this.save();
  }

  async updateLocationNotes(uuid: string, notes: string): Promise<void> {
    const location = this._clone.system.locations.find(s=> s.uuid===uuid);

    if (!location)
      return;

    location.notes = notes;

    await this.save();
  }

  get participants(): ArcParticipant[] {
    return this._clone.system.participants || [];
  }

  set participants(value: ArcParticipant[] | readonly ArcParticipant[]) {
    this._clone.system.participants = value.slice();     // we clone it so it can't be edited outside
  }

  async addParticipant(uuid: string, notes: string = ''): Promise<void> {
    if (this._clone.system.participants.find(l=> l.uuid===uuid))
      return;

    this._clone.system.participants.push({uuid, notes});

    await this.save();
  }

  async deleteParticipant(uuid: string): Promise<void> {
    this._clone.system.participants = this._clone.system.participants.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  async updateParticipantNotes(uuid: string, notes: string): Promise<void> {
    const participant = this._clone.system.participants.find(s=> s.uuid===uuid);

    if (!participant)
      return;

    participant.notes = notes;

    await this.save();
  }

  get lore(): ArcLore[] {
    return this._clone.system.lore || [];
  }

  set lore(value: ArcLore[] | readonly ArcLore[]) {
    this._clone.system.lore = value.slice();     // we clone it so it can't be edited outside
  }

  async addLore(description: string, journalEntryPageId: string | null = null): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._clone.system.lore.push({
      uuid: uuid,
      description: description,
      journalEntryPageId: journalEntryPageId,
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

  get monsters(): ArcMonster[] {
    return this._clone.system.monsters || [];
  }

  set monsters(value: ArcMonster[] | readonly ArcMonster[]) {
    this._clone.system.monsters = value.slice();     // we clone it so it can't be edited outside
  }

  async addMonster(uuid: string, notes: string = ''): Promise<void> {
    if (this._clone.system.monsters.find(l=> l.uuid===uuid))
      return;

    this._clone.system.monsters.push({ uuid, notes });

    await this.save();
  }

  async updateMonsterNotes(uuid: string, notes: string): Promise<void> {
    const monster = this._clone.system.monsters.find(l=> l.uuid===uuid);

    if (!monster)
      return;

    monster.notes = notes;

    await this.save();
  }

  async deleteMonster(uuid: string): Promise<void> {
    this._clone.system.monsters = this._clone.system.monsters.filter(l=> l.uuid!==uuid);

    await this.save();
  }

  get campaignId(): string {
    return this._clone.system.campaignId;
  }

  set campaignId(value: string) {
    this._clone.system.campaignId = value;
  }

  public async deleteSession(session: Session): Promise<void> {    
    const setting = await this.getSetting();
    if (!setting)
      throw new Error('Invalid setting in Arc.deleteSession()');
    
    const campaign = await Campaign.fromUuid(this.campaignId);
    if (!campaign)
      throw new Error('Invalid campaign in Arc.deleteSession()');

    await campaign.deleteSession(session);
  }

  /**
   * Updates arc index in campaign without saving
   */
  private _updateArcIndexInCampaign(campaign: Campaign): void {
    const index = campaign.arcIndex.find(a => a.uuid === this.uuid);
    if (index) {
      index.name = this.name;
      index.startSessionNumber = this.startSessionNumber;
      index.endSessionNumber = this.endSessionNumber;
      index.sortOrder = this.sortOrder;
    }
    // Resort the index
    campaign.arcIndex.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates an arc in the database
   * 
   * @returns A promise that resolves after the update
   */
  public async save(): Promise<void> {
    // we attempt to save first - because if it fails, we don't 
    //    want to adjust anything else
    await super.save();

    // Update campaign indices (doesn't save)
    const campaign = await this.loadCampaign();
    if (!campaign)
      throw new Error('Invalid campaign in Arc.save()');
    
    this._updateArcIndexInCampaign(campaign);
    
    // Save campaign which will sync to setting
    await campaign.save();

    // Update the search index
    try {
      await searchService.addOrUpdateArcIndex(this);
    } catch (error) {
      console.error('Failed to update search index:', error);
    }
  }

  /** 
   * @param skipDelete - if true, don't delete the Foundry document itself; used when Foundry deletes something outside the app
   */
  public async delete(skipDelete = false) {
    const id = this.uuid;
    const setting = await getGlobalSetting(this.settingId);

    if (!setting)
      throw new Error('Setting not found in Arc.delete()');
    
    // remove from campaign
    const campaign = await Campaign.fromUuid(this.campaignId);
    if (!campaign)
      throw new Error('Campaign not found in Arc.delete()');
    
    await campaign.deleteArc(this);  // removes from setting, too
    
    await super._delete(skipDelete);

    // Remove from search index
    searchService.removeSearchEntry(id);

    // remove from the expanded list
    await setting.deleteIdFromExpandedList(id);
  }
    
}