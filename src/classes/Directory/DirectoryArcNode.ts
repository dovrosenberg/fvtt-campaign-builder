/* 
 * A class representing an node representing a campaign in the campaign tree structures
 */

import { Campaign, CollapsibleNode, DirectorySessionNode, } from '@/classes';
import { SessionBasicIndex, SessionFilterIndex } from '@/types';

export class DirectoryArcNode extends CollapsibleNode<DirectorySessionNode> {
  name: string;
  completed: boolean;
  
  constructor(id: string, name: string, campaignId: string, children: string[] = [], 
    loadedChildren: DirectorySessionNode[] = [], expanded: boolean = false, completed: boolean = false
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

    // TODO: for now, we just load them all
    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const campaign = await Campaign.fromUuid(this.parentId!);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryCampaignNode._loadNodeList()');

    const sessions = uuidsToLoad.length===0 ? [] : await campaign.sessionIndex.filter((s: SessionBasicIndex)=> uuidsToLoad.includes(s.uuid));

    for (let i=0; i<sessions.length; i++) {
      const newNode = DirectorySessionNode.fromSessionBasicIndex(sessions[i], this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }

  static async fromArc(campaignId: string): Promise<DirectoryArcNode> {
    // for now, we fake it
    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryArcNode.fromArc()');

    return new DirectoryArcNode(
      campaignId + ':arc',
      'All sessions',
      campaignId,
      campaign.sessionIndex.map(s=>s.uuid),
      [],
      true,
      false
    );
  }
}