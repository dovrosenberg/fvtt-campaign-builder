
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
    dangers: [],
    customFields: {},
    tags: [],
    img: '',   
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
      throw new Error('Invalid campaignId in Front.loadCampaign(): ' + this.uuid + ' ' + this._clone.system.campaignId );

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
    await super.save();

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
    
    await super._delete();

    // Remove from search index
    searchService.removeSearchEntry(id);
  }
    
}