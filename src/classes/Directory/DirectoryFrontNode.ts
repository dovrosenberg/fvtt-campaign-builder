/* 
 * An node representing a session in the campaign tree structures
 */

import { CollapsibleNode, Front } from '@/classes';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectoryFrontNode extends CollapsibleNode<never> {
  private _name: string;
  
  constructor(id: string, name: string, campaignId: string | null) {
    super(id, false, campaignId, [], [], []);

    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  // converts the entry to a DirectoryEntryNode for cleaner interface
  static fromFront = (front: Front, campaignId: string): DirectoryFrontNode => {
    if (!CollapsibleNode._currentSetting)
      throw new Error('No currentSetting in DirectoryFrontNode.fromFront()');

    return new DirectoryFrontNode(
      front.uuid,
      front.name,
      campaignId,
    );
  };
  
  /**
    * no children
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateIds: string[] ): Promise<void> {}
}

