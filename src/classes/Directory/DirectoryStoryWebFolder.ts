/* 
 * A class representing a folder containing story webs in the campaign tree structures
 */

import { Campaign, CollapsibleNode, DirectoryStoryWebNode } from '@/classes';
import { StoryWebFilterIndex } from '@/types';

export class DirectoryStoryWebFolder extends CollapsibleNode<DirectoryStoryWebNode> {
  name: string;
  
  constructor(id: string, name: string, campaignId: string, children: string[] = [], 
    loadedChildren: DirectoryStoryWebNode[] = [], expanded: boolean = false
  ) {

    super(id, expanded, campaignId, children, loadedChildren, []);

    this.name = name;
  }

  /**
   * loads a set of nodes, including expanded status
   * @override
   * @param ids uuids of the nodes to load
   * @param updateIds uuids of the nodes that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateIds: string[] ): Promise<void> {
    // make sure we've loaded what we need
    if (!CollapsibleNode._currentSetting) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const campaign = await Campaign.fromUuid(this.parentId!);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryStoryWebFolder._loadNodeList()');

    const storyWebs = uuidsToLoad.length===0 ? [] : await campaign.filterStoryWebs((s: StoryWebFilterIndex)=> uuidsToLoad.includes(s.uuid));

    for (let i=0; i<storyWebs.length; i++) {
      const newNode = DirectoryStoryWebNode.fromStoryWeb(storyWebs[i], this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }

  static async fromCampaign(campaignId: string): Promise<DirectoryStoryWebFolder> {
    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryStoryWebFolder.fromCampaign()');

    return new DirectoryStoryWebFolder(
      `${campaignId}:storywebs`,
      'Story Webs',
      campaignId,
      campaign.storyWebIds.slice()
    );
  }
}
