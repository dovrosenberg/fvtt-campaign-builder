/* 
 * A class representing a node (which might have children) in the topic or campaign tree structures
 */

import { DirectoryEntryNode, DirectoryTypeEntryNode, DirectorySessionNode, WBWorld } from '@/classes';

type NodeType = DirectoryEntryNode | DirectoryTypeEntryNode | DirectorySessionNode;

export abstract class CollapsibleNode<ChildType extends NodeType | never> {
  protected static _currentWorld: WBWorld | null = null;
  protected static _loadedNodes = {} as Record<string, DirectoryEntryNode | DirectoryTypeEntryNode>;   // maps uuid to the node for easy lookup

  public id: string;
  public parentId: string | null;
  public children: string[];    // ids of all children (which might not be loaded)
  public ancestors: string[];    // ids of all ancestors
  public loadedChildren: ChildType[];
  public expanded: boolean;
  
  constructor(id: string, expanded: boolean = false, parentId: string | null = null,
    children: string[] = [], loadedChildren: ChildType[] = [], ancestors: string[] = []
  ) {
    this.id = id; 
    this.expanded = expanded;
    this.parentId = parentId;
    this.children = children;
    this.loadedChildren = loadedChildren;
    this.ancestors = ancestors;
  }

  public static set currentWorld(world: WBWorld | null) {
    CollapsibleNode._currentWorld = world;
    CollapsibleNode._loadedNodes = {};
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
    if (!CollapsibleNode._currentWorld)
      return;

    await CollapsibleNode._currentWorld.collapseNode(this.id);
  }

  public async expand(): Promise<void> {
    if (!CollapsibleNode._currentWorld)
      return;

    await CollapsibleNode._currentWorld.expandNode(this.id);
  } 
 
  // expand/contract  the given entry, loading the new item data
  // return the new node
  public async toggleWithLoad(expanded: boolean) : Promise<typeof this> {
    if (this.expanded===expanded || !CollapsibleNode._currentWorld)
      return this;
    
    await this.toggle();

    // instead of refreshing the whole tree, we can just update the node
    const updatedNode = foundry.utils.deepClone(this);
    updatedNode.expanded = expanded;

    // make sure all children are properly loaded (if it's being opened)
    if (expanded) {
      const expandedIds = CollapsibleNode._currentWorld.expandedIds || {};

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
  
  /**
   * This function is used to load all of the child nodes of the current node and update their expanded states.
   * It is used to ensure that the entire tree is properly loaded and updated when the user expands or contracts a node in the topic tree.
   * 
   * @param expandedNodes The IDs of nodes that are currently expanded in the topic tree.
   * @param updateEntryIds The IDs of nodes that should be refreshed (i.e. reloaded) even if they are already present in the tree.
   * 
   * @returns A promise that resolves when all of the child nodes have been loaded and updated.
   */
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