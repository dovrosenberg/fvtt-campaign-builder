/* 
 * A class representing an node representing a campaign in the campaign tree structures
 */

import { Campaign, CollapsibleNode, DirectoryFrontNode, } from '@/classes';
import { FrontFilterIndex } from '@/types';

export class DirectoryFrontFolder extends CollapsibleNode<DirectoryFrontNode> {
  name: string;
  completed: boolean;
  
  constructor(id: string, name: string, campaignId: string, children: string[] = [], 
    loadedChildren: DirectoryFrontNode[] = [], expanded: boolean = false, completed: boolean = false
  ) {

    super(id, expanded, campaignId, children, loadedChildren, []);

    this.name = name;
    this.completed = completed;
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
      throw new Error('Bad campaign id in DirectoryFrontFolder._loadNodeList()');

    const fronts = uuidsToLoad.length===0 ? [] : await campaign.filterFronts((s: FrontFilterIndex)=> uuidsToLoad.includes(s.uuid));

    for (let i=0; i<fronts.length; i++) {
      const newNode = DirectoryFrontNode.fromFront(fronts[i], this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }

  static async fromCampaign(campaignId: string): Promise<DirectoryFrontFolder> {
    // for now, we fake it
    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryFrontFolder.fromCampaign()');

    return new DirectoryFrontFolder(
      campaignId + ':front',
      'Fronts',
      campaignId,
      campaign.frontIds.slice(),
      [],
      true,
      false
    );
  }
}