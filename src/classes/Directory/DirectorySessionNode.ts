import { CollapsibleNode, } from '@/classes';
import { WorldFlagKey } from '@/settings/WorldFlags';
import { ValidTopic } from '@/types';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectorySessionNode extends CollapsibleNode<never> {
  name: string;
  
  constructor(id: string, name: string, parentId: string) {
    super(id, false, WorldFlagKey.expandedCampaignIds, parentId, [], [], []);

    this.name = name;
  }

  /**
    * no children
    * @override
    */
  override async _loadNodeList(_topicJournals: Record<ValidTopic, JournalEntry[]>, _campaignJournals: JournalEntry[], _ids: string[], _updateIds: string[] ): Promise<void> {}}