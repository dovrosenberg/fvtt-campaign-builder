import { DOCUMENT_TYPES } from '@/documents';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from './FCBJournalEntryPage';
import { Campaign } from './Campaign';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { StoryWebEdge, StoryWebNode, StoryWebNodeSource, StoryWebNodeTypes, Topics, RelatedEntryDetails, Danger } from '@/types';
import { topicToNodeType } from '@/utils/misc';
import { Entry, Front } from '@/classes';
import CleanKeysService from '@/utils/cleanKeys';

type StoryWebDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.StoryWeb>;

export class StoryWeb extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.StoryWeb> {
  static override _documentType = DOCUMENT_TYPES.StoryWeb;
  static override _defaultSystem = {
    campaignId: '',
    nodes: [],
    edges: [],
    positions: {},
    edgeStyles: {},
    nodeStyles: {},
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
      throw new Error('Invalid campaignId in StoryWeb.loadCampaign(): ' + this.uuid + ' ' + this._clone.system.campaignId );

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

  /**
   * Creates a duplicate of an existing story web
   * @param storyWebId The UUID of the story web to duplicate
   * @returns The new duplicated story web or null if cancelled
   */
  static async duplicate(storyWebId: string): Promise<StoryWeb | null> {
    const originalStoryWeb = await StoryWeb.fromUuid(storyWebId);
    if (!originalStoryWeb)
      throw new Error('Story web not found in StoryWeb.duplicate()');

    const campaign = await originalStoryWeb.loadCampaign();
    if (!campaign)
      throw new Error('Campaign not found in StoryWeb.duplicate()');

    // Create the new name with localization
    const copyName = localize('labels.copyOf', { name: originalStoryWeb.name });

    // Create the new story web with copied data
    const newStoryWeb = await StoryWeb.create(campaign, copyName);
    if (!newStoryWeb)
      return null;

    newStoryWeb.nodes = [...originalStoryWeb.nodes];
    newStoryWeb.edges = [...originalStoryWeb.edges];
    newStoryWeb.positions = { ...originalStoryWeb.positions };
    newStoryWeb.edgeStyles = { ...originalStoryWeb.edgeStyles };
    newStoryWeb.nodeStyles = { ...originalStoryWeb.nodeStyles };
    await newStoryWeb.save();

    return newStoryWeb;
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

  get positions(): Record<string, { x: number, y: number }> {
    return this._clone.system.positions || {};
  }

  set positions(value: Record<string, { x: number, y: number }>) {
    this._clone.system.positions = { ...value };
  }

  get edgeStyles(): {[x:string]: { colorId: string, styleId: string }} {
    return this._clone.system.edgeStyles || {};
  }

  set edgeStyles(value: {[x:string]: { colorId: string, styleId: string }}) {
    this._clone.system.edgeStyles = { ...value };
  }

  get nodeStyles(): {[x:string]: { colorSchemeId: string }} {
    return this._clone.system.nodeStyles || {};
  }

  set nodeStyles(value: {[x:string]: { colorSchemeId: string }}) {
    this._clone.system.nodeStyles = { ...value };
  }

  /** withRelationships will also bring in all the related entries */
  /** @param position - position to place the node at - relative to canvas */
  public async addEntry(uuid: string, position: { x: number, y: number } | null = null, withRelationships: boolean = false) : Promise<void> {
    const entry = await Entry.fromUuid(uuid);
    if (!entry)
      return;

    // check if node already exists
    const existingNode = this.nodes.find(n => n.uuid === uuid);
    
    if (existingNode) {
      // if it exists and is implicit, upgrade it to explicit
      if (existingNode.source === StoryWebNodeSource.Implicit) {
        existingNode.source = StoryWebNodeSource.Explicit;
        
        // update position if provided
        if (position) {
          this._clone.system.positions[uuid] = position;
        }
        
        await this.save();
      }
      return;
    }
    
    // create the explicit node
    this._clone.system.nodes.push({
      uuid,
      type: topicToNodeType(entry.topic),
      source: StoryWebNodeSource.Explicit,
      label: null,
    });

    if (position) {
      this._clone.system.positions[uuid] = position;
    }

    // if withRelationships is true, add all related nodes as implicit
    if (withRelationships) {
      await this.addEntryRelatedNodesImplicitly(entry);
    }

    await this.save();
  }

  /** withRelationships will also bring in all the related entries 
   * @param dangerId  - frontId|dangerId
   * @param position - position to place the node at - relative to canvas */
  public async addDanger(dangerId: string, position: { x: number, y: number } | null = null, withRelationships: boolean = false) : Promise<void> {
    const [frontId, dangerIndex] = dangerId.split('|');

    const front = await Front.fromUuid(frontId);
    if (!front)
      return;

    const danger = front.dangers[Number.parseInt(dangerIndex)];
    if (!danger)
      return;

    // check if node already exists
    const existingNode = this.nodes.find(n => n.uuid === dangerId);
    
    if (existingNode) {
      // if it exists and is implicit, upgrade it to explicit
      if (existingNode.source === StoryWebNodeSource.Implicit) {
        existingNode.source = StoryWebNodeSource.Explicit;
        
        // update position if provided
        if (position) {
          this._clone.system.positions[dangerId] = position;
        }
        
        await this.save();
      }
      return;
    }
    
    // create the explicit node
    this._clone.system.nodes.push({
      uuid: dangerId,
      type: StoryWebNodeTypes.Danger,
      source: StoryWebNodeSource.Explicit,
      label: null,
    });

    if (position) {
      this._clone.system.positions[dangerId] = position;
    }

    // if withRelationships is true, add all related nodes as implicit
    if (withRelationships) {
      await this.addDangerRelatedNodesImplicitly(danger);
    }

    await this.save();
  }

  private async addEntryRelatedNodesImplicitly(entry: Entry): Promise<void> {
    const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];
    
    for (const topic of topics) {
      const relatedEntries = entry?.relationships?.[topic] as RelatedEntryDetails<any, any>[] | undefined;
      if (!relatedEntries)
        continue;

      for (const relatedEntry of Object.values(relatedEntries)) {
        // make sure it's not already there
        if (this.nodes.some(n => n.uuid === relatedEntry.uuid))
          continue;

        // add as implicit node
        this._clone.system.nodes.push({
          uuid: relatedEntry.uuid,
          type: topicToNodeType(relatedEntry.topic),
          source: StoryWebNodeSource.Implicit,
          label: null,
        });
      }
    }
  }
  
  private async addDangerRelatedNodesImplicitly(danger: Danger): Promise<void> {
    // we just need to handle participants     
    for (const participant of danger.participants) {
      // make sure it's not already there
      if (this.nodes.some(n => n.uuid === participant.uuid))
        continue;

      // to get the topic we have to get the entry
      const entry = await Entry.fromUuid(participant.uuid);
      if (!entry)
        continue;

      // add as implicit node
      this._clone.system.nodes.push({
        uuid: entry.uuid,
        type: topicToNodeType(entry.topic),
        source: StoryWebNodeSource.Implicit,
        label: null,
      });
    }
  }

  public async addCustomNode(text: string, canvasPosition: { x: number, y: number } | null = null) : Promise<void> {
    // create the node
    const id = foundry.utils.randomID(16);
    this._clone.system.nodes.push({
      uuid: id,
      type: StoryWebNodeTypes.Custom,
      source: StoryWebNodeSource.Custom,
      label: text,
    });

    if (canvasPosition) {
      this._clone.system.positions[id] = canvasPosition;
    }

    await this.save();
  }

  protected _prepData(data: StoryWebDocClass): void {
    // convert unsafe keys
    data.system.positions = CleanKeysService.cleanKeysOnSave(data.system.positions);
    data.system.edgeStyles = CleanKeysService.cleanKeysOnSave(data.system.edgeStyles);
    data.system.nodeStyles = CleanKeysService.cleanKeysOnSave(data.system.nodeStyles);
  }

  public async save(): Promise<void> {
    // nothing special
    await super.save();
  }

  /** 
   * @param skipDelete - if true, don't delete the Foundry document itself; used when Foundry deletes something outside the app
   */
  public async delete(skipDelete = false): Promise<void> {
    const campaign = await this.loadCampaign();
    if (!campaign)
      throw new Error('Campaign not found in StoryWeb.delete()');

    await campaign.deleteStoryWeb(this);

    await super._delete(skipDelete);
  }
}
