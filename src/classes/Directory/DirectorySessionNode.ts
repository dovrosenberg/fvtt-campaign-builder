/* 
 * An node representing a session in the campaign tree structures
 */

import { CollapsibleNode, Session } from '@/classes';
import { WorldFlagKey } from '@/settings';
import { localize } from '@/utils/game';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectorySessionNode extends CollapsibleNode<never> {
  private _name: string;
  private _sessionNumber: number;
  
  constructor(id: string, name: string, sessionNumber: number, parentId: string) {
    super(id, false, WorldFlagKey.expandedCampaignIds, parentId, [], [], []);

    this._name = name;
    this._sessionNumber = sessionNumber;
  }

  get name(): string {
    return `${localize('labels.session.session')} ${this._sessionNumber}`;
  }

  get sessionNumber(): number {
    return this._sessionNumber;
  }

  get tooltip(): string {
    return this._name;
  }

  // converts the entry to a DirectoryEntryNode for cleaner interface
  static fromSession = (session: Session, campaignId: string): DirectorySessionNode => {
    if (!CollapsibleNode._currentWorldId)
      throw new Error('No currentWorldId in DirectorySessionNode.fromEntry()');

    return new DirectorySessionNode(
      session.uuid,
      session.name,
      session.number,
      campaignId,
    );
  };
  
  /**
    * no children
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateIds: string[] ): Promise<void> {}
}

