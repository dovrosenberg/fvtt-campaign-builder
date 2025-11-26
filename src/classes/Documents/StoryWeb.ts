import { toRaw } from 'vue';
import { DOCUMENT_TYPES } from '@/documents';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';
import { Campaign } from './Campaign';
import { StoryWebConfig } from '@/documents/storyWeb';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { searchService } from '@/utils/search';

type StoryWebDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.StoryWeb>;

export class StoryWeb extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.StoryWeb> {
  static override _documentType = DOCUMENT_TYPES.StoryWeb;
  static override _defaultSystem = {
    campaignId: '',
    name: 'New Story Web',
    description: '',
    config: {
      id: '',
      name: 'New Story Web',
      manuallyAddedItems: [],
      nodes: [],
      edges: [],
      createdAt: '',
      updatedAt: ''
    }
  } as unknown as StoryWebDocClass['system'];

  public campaign: Campaign | null;

  constructor(storyWebDoc: JournalEntry, campaign?: Campaign) {
    super(storyWebDoc);
    this.campaign = campaign || null;
  }

  static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  >(this: T, storyWebId: string): Promise<InstanceType<T> | null> {
    const storyWeb = await super.fromUuid(storyWebId) as unknown as (StoryWeb | null);
    
    if (!storyWeb)
      return null;

    await storyWeb.loadCampaign();

    return storyWeb as InstanceType<T>;
  }

  public async loadCampaign(): Promise<Campaign> {
    if (this.campaign)
      return this.campaign;

    this.campaign = await Campaign.fromUuid(this._clone.system.campaignId);

    if (!this.campaign)
      throw new Error('Invalid campaignId in StoryWeb.loadCampaign()');

    return this.campaign;
  }

  static async create(campaign: Campaign, name = ''): Promise<StoryWeb | null> {
    let nameToUse: string | null = name;

    while (nameToUse === '') {
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createStoryWeb.title'), `${localize('dialogs.createStoryWeb.webName')}:`);
    }

    if (!nameToUse)
      return null;

    const configId = foundry.utils.randomID(16);
    const now = new Date().toISOString();

    const storyWeb = await super._create(
      campaign.compendiumId,
      nameToUse,
      localize('contentFolders.storyWebs'),
      {
        system: {
          campaignId: campaign.uuid,
          name: nameToUse,
          description: '',
          config: {
            id: configId,
            name: nameToUse,
            manuallyAddedItems: [],
            nodes: [],
            edges: [],
            createdAt: now,
            updatedAt: now
          }
        }
      }
    ) as unknown as StoryWeb | null;

    if (!storyWeb)
      return null;

    await campaign.addStoryWeb(storyWeb);

    return storyWeb;
  }

  get name(): string {
    return this._clone.system.name;
  }

  set name(value: string) {
    this._clone.system.name = value;
    this._clone.system.config.name = value;
  }

  get description(): string {
    return this._clone.system.description || '';
  }

  set description(value: string) {
    this._clone.system.description = value;
  }

  get campaignId(): string {
    return this._clone.system.campaignId;
  }

  set campaignId(value: string) {
    this._clone.system.campaignId = value;
  }

  get config(): StoryWebConfig {
    return this._clone.system.config as StoryWebConfig;
  }

  set config(value: Partial<StoryWebConfig>) {
    this._clone.system.config = { ...this.config, ...value, updatedAt: new Date().toISOString() };
  }

  get manuallyAddedItems(): string[] {
    return this.config.manuallyAddedItems || [];
  }

  set manuallyAddedItems(value: string[]) {
    this.config.manuallyAddedItems = [...value];
  }

  get nodes(): any[] {
    return this.config.nodes || [];
  }

  set nodes(value: any[]) {
    this.config.nodes = [...value];
  }

  get edges(): any[] {
    return this.config.edges || [];
  }

  set edges(value: any[]) {
    this.config.edges = [...value];
  }

  get customNodes(): any[] {
    return this.config.nodes?.filter(node => node.source === 'custom') || [];
  }

  set customNodes(value: any[]) {
    // Update the unified nodes array, keeping non-custom nodes and setting new custom nodes
    const nonCustomNodes = this.config.nodes?.filter(node => node.source !== 'custom') || [];
    this.config.nodes = [...nonCustomNodes, ...value];
  }

  async addManuallyAddedItem(uuid: string): Promise<void> {
    if (!this.manuallyAddedItems.includes(uuid)) {
      this.manuallyAddedItems = [...this.manuallyAddedItems, uuid];
      await this.save();
    }
  }

  async removeManuallyAddedItem(uuid: string): Promise<void> {
    this.manuallyAddedItems = this.manuallyAddedItems.filter(id => id !== uuid);
    await this.save();
  }

  async addNode(node: any): Promise<void> {
    const nodeId = foundry.utils.randomID(16);
    const newNode = { ...node, id: nodeId };
    this.nodes = [...this.nodes, newNode];
    await this.save();
  }

  async removeNode(nodeId: string): Promise<void> {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    await this.save();
  }

  async addEdge(edge: any): Promise<void> {
    const edgeId = foundry.utils.randomID(16);
    const newEdge = { ...edge, id: edgeId };
    this.edges = [...this.edges, newEdge];
    await this.save();
  }

  async removeEdge(edgeId: string): Promise<void> {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    await this.save();
  }

  async addCustomNode(node: any): Promise<void> {
    const nodeId = foundry.utils.randomID(16);
    const newNode = { 
      ...node, 
      id: nodeId,
      source: 'custom' as const,
      type: 'custom' as const
    };
    this.nodes = [...this.nodes, newNode];
    await this.save();
  }

  async removeCustomNode(nodeId: string): Promise<void> {
    await this.removeNode(nodeId);
  }

  public async save(): Promise<void> {
    await super.save();
  }

  public async delete(): Promise<void> {
    const campaign = await this.loadCampaign();
    if (!campaign)
      throw new Error('Campaign not found in StoryWeb.delete()');

    await campaign.deleteStoryWeb(this);

    await toRaw(this._doc).delete();
  }
}
