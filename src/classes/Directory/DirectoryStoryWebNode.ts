/* 
 * An node representing a story web in the campaign tree structures
 */

import { CollapsibleNode, StoryWeb } from '@/classes';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectoryStoryWebNode extends CollapsibleNode<never> {
  private _name: string;
  
  constructor(id: string, name: string, campaignId: string | null) {
    super(id, false, campaignId, [], [], []);

    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  // converts the story web to a DirectoryStoryWebNode for cleaner interface
  static fromStoryWeb = (storyWeb: StoryWeb, campaignId: string): DirectoryStoryWebNode => {
    if (!CollapsibleNode._currentSetting)
      throw new Error('No currentSetting in DirectoryStoryWebNode.fromStoryWeb()');

    return new DirectoryStoryWebNode(
      storyWeb.uuid,
      storyWeb.name,
      campaignId,
    );
  };
  
  /**
    * no children
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateIds: string[] ): Promise<void> {}
}
