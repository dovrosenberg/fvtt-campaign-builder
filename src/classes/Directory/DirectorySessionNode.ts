/* 
 * An node representing a session in the campaign tree structures
 */

import { CollapsibleNode, Session } from '@/classes';
import { WorldFlagKey } from '@/settings/WorldFlags';
import { NO_NAME_STRING } from '@/utils/hierarchy';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectorySessionNode extends CollapsibleNode<never> {
  name: string;
  
  constructor(id: string, name: string, parentId: string) {
    super(id, false, WorldFlagKey.expandedCampaignIds, parentId, [], [], []);

    this.name = name;
  }

    // converts the entry to a DirectoryEntryNode for cleaner interface
    static fromSession = (session: Session, campaignId: string): DirectorySessionNode => {
      if (!CollapsibleNode._currentWorldId)
        throw new Error('No currentWorldId in DirectorySessionNode.fromEntry()');
  
      return new DirectorySessionNode(
        session.uuid,
        session.name || NO_NAME_STRING,
        campaignId,
      );
    };
  
  /**
    * no children
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateIds: string[] ): Promise<void> {}}