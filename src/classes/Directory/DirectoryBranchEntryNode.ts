/* 
 * A class representing a branch entry in the directory tree.
 * Branches are organization entries displayed under both their parent org and location.
 */

import { EntryBasicIndex, Hierarchy } from '@/types';
import { TopicFolder, CollapsibleNode } from '@/classes';
import { NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';

/**
 * A node representing a branch entry in the directory tree.
 * Similar to DirectoryEntryNode but with branch-specific behavior.
 * Branches cannot have children (they're leaves in the hierarchy).
 */
export class DirectoryBranchEntryNode extends CollapsibleNode<never> {
  name: string;
  type: string;
  /** The UUID of the organization parent */
  organizationParentId: string;
  /** The UUID of the location parent */
  locationParentId: string | null;
  
  /**
   * Creates a new DirectoryBranchEntryNode.
   * 
   * @param id - The UUID of the branch entry
   * @param name - The name of the branch
   * @param type - The type of the branch (inherited from parent org)
   * @param organizationParentId - UUID of the parent organization
   * @param locationParentId - UUID of the parent location
   */
  constructor(
    id: string,
    name: string,
    type: string,
    organizationParentId: string,
    locationParentId: string | null
  ) {
    // Branches have no children, so children array is always empty
    super(id, false, organizationParentId, [], [], [organizationParentId]);
    
    this.name = name;
    this.type = type;
    this.organizationParentId = organizationParentId;
    this.locationParentId = locationParentId;
  }

  /**
   * Creates a DirectoryBranchEntryNode from an entry basic index.
   * 
   * @param entry - The entry index data
   * @param parentTopicFolder - The topic folder (organization)
   * @param organizationParentId - UUID of the parent organization
   * @returns A new DirectoryBranchEntryNode
   */
  static fromEntryBasicIndex = (
    entry: EntryBasicIndex,
    _parentTopicFolder: TopicFolder,
    organizationParentId: string
  ): DirectoryBranchEntryNode => {
    if (!CollapsibleNode._currentSetting)
      throw new Error('No currentSetting in DirectoryBranchEntryNode.fromEntryBasicIndex()');

    const hierarchy = CollapsibleNode._currentSetting.getEntryHierarchy(entry.uuid);
    
    return new DirectoryBranchEntryNode(
      entry.uuid,
      entry.name || NO_NAME_STRING,
      entry.type || NO_TYPE_STRING,
      organizationParentId,
      hierarchy?.locationParentId || null
    );
  };

  /**
   * Converts the node to a Hierarchy object.
   * Branches have a special hierarchy with locationParentId.
   * 
   * @returns A Hierarchy object
   */
  public convertToHierarchy = (): Hierarchy => {
    return {
      parentId: this.organizationParentId,
      locationParentId: this.locationParentId,
      children: [],
      childBranches: [],
      ancestors: [this.organizationParentId],
      type: this.type,
    };
  };

  /**
   * Branches have no children, so this is a no-op.
   * @override
   */
  protected override async _loadNodeList(_ids: string[], _updateEntryIds: string[]): Promise<void> {
    // Branches have no children, so nothing to load
  }
}
