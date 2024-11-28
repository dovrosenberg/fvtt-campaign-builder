import { CollapsibleNode, DirectorySessionNode, } from '@/classes';
import { WorldFlagKey } from '@/settings/WorldFlags';
import { ValidTopic } from '@/types';

export class DirectoryCampaignNode extends CollapsibleNode<DirectorySessionNode> {
  name: string;
  
  // children are for the entries; loadedTypes is for the type nodes
  constructor(id: string, name: string, expanded: boolean = false,
    children: string[] = [], loadedChildren: DirectorySessionNode[] = [], 
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
  override async _loadNodeList(_topicJournals: Record<ValidTopic, JournalEntry[]>, _campaignJournals: JournalEntry[], _ids: string[], _updateIds: string[] ): Promise<void> {}}