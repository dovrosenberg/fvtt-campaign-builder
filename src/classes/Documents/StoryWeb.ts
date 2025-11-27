import { toRaw } from 'vue';
import { DOCUMENT_TYPES } from '@/documents';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';
import { Campaign } from './Campaign';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { StoryWebEdge, StoryWebNode, StoryWebNodeSource, } from '@/types';
import { topicToNodeType } from '@/utils/misc';
import { Entry } from '@/classes';

type StoryWebDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.StoryWeb>;

export class StoryWeb extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.StoryWeb> {
  static override _documentType = DOCUMENT_TYPES.StoryWeb;
  static override _defaultSystem = {
    campaignId: '',
    nodes: [],
    edges: [],
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

    const storyWeb = await super._create(
      campaign.compendiumId,
      nameToUse,
      localize('contentFolders.storyWebs'),
      { system: { campaignId: campaign.uuid }}
    ) as unknown as StoryWeb | null;

    if (!storyWeb)
      return null;

    await campaign.addStoryWeb(storyWeb);

    return storyWeb;
  }

  get name(): string {
    return this._clone.name;
  }

  set name(value: string) {
    this._clone.name = value;
  }

  get campaignId(): string {
    return this._clone.system.campaignId;
  }

  set campaignId(value: string) {
    this._clone.system.campaignId = value;
  }

  get nodes(): StoryWebNode[] {
    return this._clone.system.nodes || [];
  }

  set nodes(value: StoryWebNode[]) {
    this._clone.system.nodes = [...value];
  }

  get edges(): StoryWebEdge[] {
    return this._clone.system.edges || [];
  }

  set edges(value: any[]) {
    this._clone.system.edges = [...value];
  }

  async addEntry(uuid: string) : Promise<void> {
    const entry = await Entry.fromUuid(uuid);
    if (!entry)
      return;

    // create the node
    this._clone.system.nodes.push({
      uuid,
      type: topicToNodeType(entry.topic),
      source: StoryWebNodeSource.Explicit,
      label: null,
    });


    await this.save();
  }
  
  // async addCustomNode(node: any): Promise<void> {
  //   const nodeId = foundry.utils.randomID(16);
  //   const newNode = { 
  //     ...node, 
  //     id: nodeId,
  //     source: 'custom' as const,
  //     type: 'custom' as const
  //   };
  //   this.nodes = [...this.nodes, newNode];
  //   await this.save();
  // }

  // async removeCustomNode(nodeId: string): Promise<void> {
  //   await this.removeNode(nodeId);
  // }

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
