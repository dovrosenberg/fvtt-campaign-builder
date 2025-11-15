// represents a game session 

import { toRaw } from 'vue';
import { DOCUMENT_TYPES, } from '@/documents';
import { searchService } from '@/utils/search';
import { FCBDialog } from '@/dialogs';
import { Campaign } from './Campaign';
import { localize } from '@/utils/game';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';
import { Danger } from '@/types';
import { getGlobalSetting } from '@/utils/globalSettings';

type FrontDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Front>;

export class Front extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Front> {
  static override _documentType = DOCUMENT_TYPES.Front;
  static override _defaultSystem = { 
    campaignId: '',  
    // strongStart: '',  
    // locations: [],  
    // items: [],  
    // npcs: [],  
    // monsters: [],  
    // vignettes: [],  
    // lore: [],  
    img: '',   
    // tags: [],
  } as unknown as FrontDocClass['system'];

  public campaign: Campaign | null;  // the campaign the front is in (if we don't setup up front, we can load it later)

  /**
   * 
   * @param {FrontDoc} frontDoc - The front Foundry document
   */
  constructor(frontDoc: JournalEntry, campaign?: Campaign) {
    super(frontDoc);

    this.campaign = campaign || null;
  }

  static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  > (this: T, frontId: string): Promise<InstanceType<T> | null> { 
      const front = await super.fromUuid(frontId) as unknown as (Front | null);
      
      if (!front)
        return null;
  
      await front.loadCampaign();
  
      return front as InstanceType<T>;
    }
  
  /**
   * Gets the Campaign associated with the front. If the campaign is already loaded, the promise resolves
   * to the existing campaign; otherwise, it loads the campaign and then resolves to it.
   * 
   * @returns {Promise<Campaign>} A promise to the setting associated with the campaign.
   */
  public async loadCampaign(): Promise<Campaign> {
    if (this.campaign)
      return this.campaign;

    this.campaign = await Campaign.fromUuid(this._clone.system.campaignId);

    if (!this.campaign)
      throw new Error('Invalid campaignId in Front.loadCampaign()');

    return this.campaign;
  }
  
  // creates a new front in the proper campaign
  static async create(campaign: Campaign, name = ''): Promise<Front | null> 
  {
    let nameToUse: string | null = name;

    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createFront.title'), `${localize('dialogs.createFront.frontName')}:`); 
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    const front = await super._create(
      campaign.compendiumId, 
      nameToUse,
      localize('contentFolders.fronts'),
      //TODO put in proper starting system
      { system: { campaignId: campaign.uuid }}
    ) as unknown as Front | null;

    if (!front)
      return null;

    await front.save();

    // add to campaign
    await campaign.addFront(front);
    
    // Add to search index
    try {
      await searchService.addOrUpdateFrontIndex(front);
    } catch (error) {
      console.error('Failed to add front to search index:', error);
    }

    return front;
  }

  public async isCampaignCompleted(): Promise<boolean> {
    const campaign = await this.loadCampaign();
    return campaign.completed;
  }

  get tags(): string[] {
    // @ts-ignore
    return this._clone.system.tags;
  }

  set tags(value: string[]) {
    // @ts-ignore
    this._clone.system.tags = value;
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

  get dangers(): readonly Danger[] {
    // @ts-ignore
    return this._clone.system.dangers;
  }

  set dangers(value: Danger[] | readonly Danger[]) {
    // @ts-ignore
    this._clone.system.dangers = value.slice();     // we clone it so it can't be edited outside
  }

  public updateDanger(num: number, danger: Danger): void {
    this._clone.system.dangers[num] = danger;
  }

  public async createDanger(): Promise<void> {
    const danger = {
      name: 'New Danger',
      description: '',
      img: '',
      impendingDoom: '',
      motivation: '',
      participants: [],
      grimPortents: [],
    } as Danger;

    this._clone.system.dangers.push(danger);    
    await this.save();
  }

  
  // get locations(): SessionLocation[] {
  //   return this._clone.system.locations || [];
  // }

  // set locations(value: SessionLocation[] | readonly SessionLocation[]) {
  //   this._clone.system.locations = value.slice();     // we clone it so it can't be edited outside
  // }

  // async addLocation(uuid: string, delivered: boolean = false): Promise<void> {
  //   if (this._clone.system.locations.find(l=> l.uuid===uuid))
  //     return;

  //   this._clone.system.locations.push({
  //     uuid: uuid,
  //     delivered: delivered
  //   });

  //   await this.save();
  // }

  // async deleteLocation(uuid: string): Promise<void> {
  //   this._clone.system.locations = this._clone.system.locations.filter(l=> l.uuid!==uuid);
  //   await this.save();
  // }

  // TODO: ability to mark grim portents off as done
  // async markLocationDelivered(uuid: string, delivered: boolean): Promise<void> {
  //   const location = this._clone.system.locations.find((l) => l.uuid===uuid);
  //   if (!location)
  //     return;
    
  //   location.delivered = delivered; 

  //   await this.save();
  // }

  // get npcs(): SessionNPC[] {
  //   return this._clone.system.npcs || [];
  // }

  // set npcs(value: SessionNPC[] | readonly SessionNPC[]) {
  //   this._clone.system.npcs = value.slice();     // we clone it so it can't be edited outside
  // }

  // async addNPC(uuid: string, delivered: boolean = false): Promise<void> {
  //   if (this._clone.system.npcs.find(l=> l.uuid===uuid))
  //     return;

  //   this._clone.system.npcs.push({
  //     uuid: uuid,
  //     delivered: delivered
  //   });

  //   await this.save();
  // }

  // async deleteNPC(uuid: string): Promise<void> {
  //   this._clone.system.npcs = this._clone.system.npcs.filter(l=> l.uuid!==uuid);

  //   await this.save();
  // }

  // async markNPCDelivered(uuid: string, delivered: boolean): Promise<void> {
  //   const npc = this._clone.system.npcs.find((l) => l.uuid===uuid);
  //   if (!npc)
  //     return;
    
  //   npc.delivered = delivered;

  //   await this.save();
  // }

  // get vignettes(): SessionVignette[] {
  //   return this._clone.system.vignettes || [];
  // }

  // set vignettes(value: SessionVignette[] | readonly SessionVignette[]) {
  //   this._clone.system.vignettes = value.slice();     // we clone it so it can't be edited outside
  // }

  // async addVignette(description: string): Promise<string> {
  //   const uuid = foundry.utils.randomID();

  //   this._clone.system.vignettes.push({
  //     uuid: uuid,
  //     description: description,
  //     delivered: false
  //   });

  //   await this.save();
  //   return uuid;
  // }

  // async updateVignetteDescription(uuid: string, description: string): Promise<void> {
  //   const vignette = this._clone.system.vignettes.find(s=> s.uuid===uuid);

  //   if (!vignette)
  //     return;

  //   vignette.description = description;

  //   await this.save();
  // }


  // async deleteVignette(uuid: string): Promise<void> {
  //   this._clone.system.vignettes = this._clone.system.vignettes.filter(l=> l.uuid!==uuid);

  //   await this.save();
  // }

  // async markVignetteDelivered(uuid: string, delivered: boolean): Promise<void> {
  //   const vignette = this._clone.system.vignettes.find((s) => s.uuid===uuid);
  //   if (!vignette)
  //     return;
    
  //   vignette.delivered = delivered;

  //   await this.save();
  // }

  // get lore(): SessionLore[] {
  //   return this._clone.system.lore || [];
  // }

  // set lore(value: SessionLore[] | readonly SessionLore[]) {
  //   this._clone.system.lore = value.slice();     // we clone it so it can't be edited outside
  // }

  // async addLore(description: string): Promise<string> {
  //   const uuid = foundry.utils.randomID();

  //   this._clone.system.lore.push({
  //     uuid: uuid,
  //     description: description,
  //     delivered: false,
  //     significant: false,
  //     journalEntryPageId: null,
  //     sortOrder: this._clone.system.lore.length,
  //   });

  //   await this.save();
  //   return uuid;
  // }

  // async updateLoreDescription(uuid: string, description: string): Promise<void> {
  //   const lore = this._clone.system.lore.find(l=> l.uuid===uuid);

  //   if (!lore)
  //     return;

  //   lore.description = description;

  //   await this.save();
  // }

  // async updateLoreJournalEntry(loreUuid: string, journalEntryPageId: string | null): Promise<void> {
  //   const lore = this._clone.system.lore.find(l=> l.uuid===loreUuid);

  //   if (!lore)
  //     return;

  //   lore.journalEntryPageId = journalEntryPageId;

  //   await this.save();
  // }


  // async deleteLore(uuid: string): Promise<void> {
  //   this._clone.system.lore = this._clone.system.lore.filter(l=> l.uuid!==uuid);

  //   await this.save();
  // }

  // async markLoreSignificant(uuid: string, significant: boolean): Promise<void> {
  //   const lore = this._clone.system.lore.find((l) => l.uuid===uuid);
  //   if (!lore)
  //     return;
    
  //   lore.significant = significant;

  //   await this.save();
  // }

  // async markLoreDelivered(uuid: string, delivered: boolean): Promise<void> {
  //   const lore = this._clone.system.lore.find((l) => l.uuid===uuid);
  //   if (!lore)
  //     return;
    
  //   lore.delivered = delivered;

  //   await this.save();
  // }

  // get monsters(): SessionMonster[] {
  //   return this._clone.system.monsters || [];
  // }

  // set monsters(value: SessionMonster[] | readonly SessionMonster[]) {
  //   this._clone.system.monsters = value.slice();     // we clone it so it can't be edited outside
  // }

  // async addMonster(uuid: string, number = 1): Promise<void> {
  //   if (this._clone.system.monsters.find(l=> l.uuid===uuid))
  //     return;

  //   this._clone.system.monsters.push({
  //     uuid: uuid,
  //     number: number,
  //     delivered: false
  //   });

  //   await this.save();
  // }

  // async updateMonsterNumber(uuid: string, value: number): Promise<void> {
  //   const monster = this._clone.system.monsters.find(l=> l.uuid===uuid);

  //   if (!monster)
  //     return;

  //   monster.number = value;

  //   await this.save();
  // }

  // async deleteMonster(uuid: string): Promise<void> {
  //   this._clone.system.monsters = this._clone.system.monsters.filter(l=> l.uuid!==uuid);

  //   await this.save();
  // }

  // async markMonsterDelivered(uuid: string, delivered: boolean): Promise<void> {
  //   const monster = this._clone.system.monsters.find((l) => l.uuid===uuid);
  //   if (!monster)
  //     return;
    
  //   monster.delivered = delivered;

  //   await this.save();
  // }

  // get items(): SessionItem[] {
  //   return this._clone.system.items || [];
  // }

  // set items(value: SessionItem[] | readonly SessionItem[]) {
  //   this._clone.system.items = value.slice();     // we clone it so it can't be edited outside
  // }

  // async addItem(uuid: string): Promise<void> {
  //   if (this._clone.system.items.find(i=> i.uuid===uuid))
  //     return;

  //   this._clone.system.items.push({
  //     uuid: uuid,
  //     delivered: false
  //   });

  //   await this.save();
  // }

  // async deleteItem(uuid: string): Promise<void> {
  //   this._clone.system.items = this._clone.system.items.filter(i=> i.uuid!==uuid);
  //   await this.save();
  // }

  // async markItemDelivered(uuid: string, delivered: boolean): Promise<void> {
  //   const item = this._clone.system.items.find((i) => i.uuid===uuid);
  //   if (!item)
  //     return;
    
  //   item.delivered = delivered;
  //   await this.save();
  // }

  get campaignId(): string {
    return this._clone.system.campaignId;
  }

  set campaignId(value: string) {
    this._clone.system.campaignId = value;
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates a front in the database
   * 
   * @returns A promise that resolves after the update
   */
  public async save(): Promise<void> {
    // we attempt to save first - because if it fails, we don't 
    //    want to adjust anything else
    try {
      await super.save();
    } catch (error) {
      throw error;
    }

    // Update the search index (rely on retval being null if no changes were made)
    try {
      await searchService.addOrUpdateFrontIndex(this);
    } catch (error) {
      console.error('Failed to update search index:', error);
    }
  }

  public async delete() {
    const id = this.uuid;
    const setting = await getGlobalSetting(this.settingId);

    if (!setting)
      throw new Error('Setting not found in Front.delete()');
    
    // remove from campaign
    const campaign = await Campaign.fromUuid(this.campaignId);
    if (!campaign)
      throw new Error('Campaign not found in Front.delete()');
    
    await campaign.deleteFront(this);
    
    await toRaw(this._doc).delete();

    // Remove from search index
    searchService.removeSearchEntry(id);
  }
    
}