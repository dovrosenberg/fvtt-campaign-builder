/* 
 * A class representing an node representing a campaign in the campaign tree structures
 */

import { Campaign, CollapsibleNode, DirectorySessionNode, Session, } from '@/classes';
import { WorldFlagKey } from '@/settings';

export class DirectoryCampaignNode extends CollapsibleNode<DirectorySessionNode> {
  name: string;
  
  // children are for the entries; loadedTypes is for the type nodes
  constructor(id: string, name: string, children: string[] = [], 
    loadedChildren: DirectorySessionNode[] = [], expanded: boolean = false
  ) {

    super(id, expanded, WorldFlagKey.expandedCampaignIds, null, children, loadedChildren, []);

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
    if (!CollapsibleNode._currentWorldId) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const campaign = await Campaign.fromUuid(this.id);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryCampaignNode._loadNodeList()');

    const sessions = campaign.filterSessions((s: Session)=> uuidsToLoad.includes(s.uuid)) || [] as Session[];

    for (let i=0; i<sessions.length; i++) {
      const newNode = DirectorySessionNode.fromSession(sessions[i], this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}