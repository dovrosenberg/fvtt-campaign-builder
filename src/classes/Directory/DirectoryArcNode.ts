/* 
 * A class representing an node representing a campaign in the campaign tree structures
 */

import { Arc, Campaign, CollapsibleNode, DirectorySessionNode, } from '@/classes';
import { ArcBasicIndex, SessionBasicIndex, } from '@/types';

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
    if (!CollapsibleNode._currentSetting)
      throw new Error('No current setting in DirectoryArcNode._loadNodeList()');

    // Get fresh campaign data from setting's campaigns cache (which was just refreshed)
    const campaign = CollapsibleNode._currentSetting.campaigns[this.parentId!] || await Campaign.fromUuid(this.parentId!);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryArcNode._loadNodeList()');
    
    const arc = await Arc.fromUuid(this.id);
    if (!arc)
      throw new Error('Bad arc id in DirectoryArcNode._loadNodeList()');

    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const sessions = campaign.sessionIndex.filter((s) => s.number>=arc.startSessionNumber && s.number<=arc.endSessionNumber);
    
    const sessionsToUse = uuidsToLoad.length===0 ? [] : 
      sessions.filter((s: SessionBasicIndex)=> uuidsToLoad.includes(s.uuid));
    
    for (const session of sessionsToUse) {
      const newNode = DirectorySessionNode.fromSessionBasicIndex(session, this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }

  static fromArcBasicIndex(arc: ArcBasicIndex, campaign: Campaign): DirectoryArcNode {
    return new DirectoryArcNode(
      arc.uuid,
      arc.name,
      campaign.uuid,
      campaign.sessionIndex
        .filter((s)=>s.number>=arc.startSessionNumber && s.number<=arc.endSessionNumber)
        ?.map((s)=>s.uuid) || [],
      [],
      true,
      false
    );
  }
}