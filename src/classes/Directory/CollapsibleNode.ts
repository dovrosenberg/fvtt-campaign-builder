import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { DirectoryEntryNode, DirectoryTypeEntryNode, } from '@/classes';
import { ValidTopic, Topic } from '@/types';

type ExpandedIdsFlags = WorldFlagKey.expandedIds | WorldFlagKey.expandedCampaignIds;

export abstract class CollapsibleNode<ChildType extends DirectoryEntryNode | DirectoryTypeEntryNode | never> {
  protected static _currentTopicJournals: Record<ValidTopic, JournalEntry | null> = {
    [Topic.Character]: null,
    [Topic.Event]: null,
    [Topic.Location]: null,
    [Topic.Organization]: null
  };   
  protected static _currentCampaignJournals: JournalEntry[] = [];   
  protected static _currentWorldId: string | null = null;
  protected static _loadedNodes = {} as Record<string, DirectoryEntryNode | DirectoryTypeEntryNode>;   // maps uuid to the node for easy lookup

  _expandedFlagKey: ExpandedIdsFlags;    // the WorldFlagKey for this type (regular or campaign)
  id: string;
  parentId: string | null;
  children: string[];    // ids of all children (which might not be loaded)
  ancestors: string[];    // ids of all ancestors
  loadedChildren: ChildType[];
  expanded: boolean;
  
  constructor(id: string, expanded: boolean = false, expandedFlagKey: ExpandedIdsFlags, parentId: string | null = null,
    children: string[] = [], loadedChildren: ChildType[] = [], ancestors: string[] = []
  ) {
    this.id = id; 
    this.expanded = expanded;
    this._expandedFlagKey = expandedFlagKey;
    this.parentId = parentId;
    this.children = children;
    this.loadedChildren = loadedChildren;
    this.ancestors = ancestors;
  }

  public static set currentWorldId(worldId: string | null) {
    CollapsibleNode._currentWorldId = worldId;
    CollapsibleNode._loadedNodes = {};
  }

  public static set c(journals: Record<ValidTopic, JournalEntry>) {
    CollapsibleNode._currentTopicJournals = journals;
  }

  public static set currentCampaignJournals(journals: JournalEntry[]) {
    CollapsibleNode._currentCampaignJournals = journals;
  }

  /**
   * Toggles the expansion state of the node.
   * 
   * @returns A promise that resolves when the node has been toggled.
   */
  public async toggle() : Promise<void> {
    // closing is easy
    if (this.expanded) {
      await this.collapse();
    } else {
      await this.expand();
    }
  }

  // used to toggle entries and compendia (not worlds)
  public async collapse(): Promise<void> {
    if (!CollapsibleNode._currentWorldId)
      return;

    await WorldFlags.unset(CollapsibleNode._currentWorldId, this._expandedFlagKey, this.id);
  }

  public async expand(): Promise<void> {
    if (!CollapsibleNode._currentWorldId)
      return;

    const expandedIds = WorldFlags.get(CollapsibleNode._currentWorldId, this._expandedFlagKey) as Record<any, any>|| {};
    await WorldFlags.set(CollapsibleNode._currentWorldId, this._expandedFlagKey, {...expandedIds, [this.id]: true});
  } 
 
  // expand/contract  the given entry, loading the new item data
  // return the new node
  public async toggleWithLoad(expanded: boolean) : Promise<typeof this> {
    if (this.expanded===expanded || !CollapsibleNode._currentWorldId)
      return this;
    
    if (this.expanded) {
      await this.collapse();
    } else {
      await this.expand();
    }

    // instead of refreshing the whole tree, we can just update the node
    const updatedNode = foundry.utils.deepClone(this);
    updatedNode.expanded = expanded;

    // make sure all children are properly loaded (if it's being opened)
    if (expanded) {
      const expandedIds = WorldFlags.get(CollapsibleNode._currentWorldId, this._expandedFlagKey) as Record<any, any> || {};

      await updatedNode.recursivelyLoadNode(expandedIds);
    }
    
    return updatedNode;
  }

  /**
   * loads a set of nodes of the proper type into _loadedNodes, including expanded status
   * @param ids uuids of the nodes to load
   * @param updateEntryIds uuids of the nodes that should be refreshed (i.e. load them even if present)
   */
  protected abstract _loadNodeList(ids: string[], updateEntryIds: string[] ): Promise<void>;
  
  public async recursivelyLoadNode(expandedNodes: Record<string, boolean | null>, updateEntryIds: string[] = []): Promise<void> {
    // load any children that haven't been loaded before
    // this guarantees all children are at least in CollapsibleNode._loadedNodes and updateEntryIds ones have been refreshed
    const nodesToLoad = this.children.filter((id)=>!this.loadedChildren.find((n)=>n.id===id) || updateEntryIds.includes(id));

    if (nodesToLoad.length>0)
      await this._loadNodeList(nodesToLoad, updateEntryIds);

    // have to check all children loaded and update their expanded states
    for (let i=0; i<this.children.length; i++) {
      let child: ChildType | null = this.loadedChildren.find((childNode)=>childNode.id===this.children[i]) || null;

      if (child && !updateEntryIds.includes(child.id) && !updateEntryIds.includes(this.id)) {
        // this one is already loaded and attached (and not a forced update)
      } else if (CollapsibleNode._loadedNodes[this.children[i]]) {
        // it was loaded previously - just reattach it
        // without a deep clone, the reactivity down the tree on node.expanded isn't working... so doing this for now unless it creates performance issues
        child = foundry.utils.deepClone(CollapsibleNode._loadedNodes[this.children[i]]) as ChildType | null;

        if (!child)
          throw new Error('Child failed to load properly in CollapsibleNode.recursivelyLoadNode() ');

        this.loadedChildren.push(child);
      } else {
        // should never happen because everything should be in _loadedNodes
        throw new Error('Entry failed to load properly in CollapsibleNode.recursivelyLoadNode() ');
      }

      // may need to change the expanded state
      child.expanded = expandedNodes[child.id] || false;

      if (child.expanded || updateEntryIds.includes(child.id)) {
        await child.recursivelyLoadNode(expandedNodes, updateEntryIds);
      }
    }      
  }
  
}