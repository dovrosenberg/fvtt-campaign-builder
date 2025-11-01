import { TabSummary,  Hierarchy, Topics, EntryBasicIndex, } from '@/types';
import { TopicFolder, Entry, FCBSetting, } from '@/classes';

/**
 * Display string used for entries that have no type assigned.
 * Shown in type groupings and filters when an entry lacks a type value.
 */
export const NO_TYPE_STRING = '(none)';

/**
 * Display string used for entries that have no name assigned.
 * Fallback text shown when an entry's name field is empty.
 */
export const NO_NAME_STRING = '<Blank>';

/**
 * Determines whether a topic supports hierarchical organization.
 * Currently only Organizations and Locations support parent-child relationships.
 * 
 * @param topic - The topic to check for hierarchy support
 * @returns True if the topic supports hierarchy, false otherwise
 */
export const hasHierarchy = (topic: Topics): boolean => [Topics.Organization, Topics.Location].includes(topic);

/**
 * Returns a list of valid possible parents for a hierarchical entry.
 * Used to populate dropdowns and selection lists for FCBSetting parent relationships.
 * A valid parent is anything that does not have this object as an ancestor (to avoid creating loops).
 * Only works for topics that have hierarchy support.
 * 
 * @param FCBSetting - The FCBSetting containing the hierarchy data
 * @param entry - The entry to find valid parents for
 * @returns Array of objects with name and id properties representing valid parent entries
 */
export function validParentItems(FCBSetting: FCBSetting, entry: Entry): {name: string; id: string}[] {
  if (!entry.uuid)
    return [];

  const hierarchies = FCBSetting.hierarchies;
  const topicFolder = FCBSetting.topicFolders[entry.topic];

  if (!topicFolder || !hasHierarchy(entry.topic))
    return [];

  // get the list - every entry in the pack that is not this one and does not have it as an ancestor
  return topicFolder.entryIndex
    .map((index: EntryBasicIndex)=> ({ name: index.name, id: index.uuid}))
    .filter(e=>( e.id !== entry.uuid && !(hierarchies[e.id]?.ancestors || []).includes(entry.uuid)));
}

/**
 * Gets the parent ID for a hierarchical entry.
 * Returns null for topics that don't support hierarchy or entries without parents.
 * 
 * @param FCBSetting - The FCBSetting containing the hierarchy data
 * @param entry - The entry to get the parent ID for
 * @returns The UUID of the parent entry, or null if no parent exists
 */
export function getParentId(FCBSetting: FCBSetting, entry: Entry): string | null {
  if (!hasHierarchy(entry.topic))
    return null;

  const hierarchies = FCBSetting.hierarchies;
  const hierarchy = hierarchies[entry.uuid];
  return hierarchy?.parentId ?? null;
}

/**
 * Maps an Entry object to a TabSummary object for use in selection lists.
 * Extracts the essential information needed for displaying entries in dropdowns.
 * 
 * @param entry - The entry to convert to a summary
 * @returns A TabSummary object with name and uuid properties
 */
const mapEntryToSummary = (entry: Entry): TabSummary => ({
  name: entry.name || '',
  uuid: entry.uuid,
});

/**
 * Cleans up hierarchy relationships after an item is deleted.
 * Removes the deleted item from all hierarchy trees and reconnects its children to its parent.
 * Also updates the topic's top nodes list and cleans up orphaned relationships.
 * 
 * @private We need to remove it from any trees where it is a child or ancestor, and from the ancestor
 * list of all the items that will now be orphaned below it
 * 
 * @param FCBSetting - The FCBSetting containing the hierarchy data
 * @param topicFolder - The topic folder containing the deleted item
 * @param deletedItemId - The UUID of the item that was deleted
 * @param deletedHierarchy - The hierarchy data of the deleted item before deletion
 * @returns A promise that resolves when cleanup is complete
 */
export const cleanTrees = async function(FCBSetting: FCBSetting, topicFolder: TopicFolder, deletedItemId: string, deletedHierarchy: Hierarchy): Promise<void> {
  const hierarchies = FCBSetting.hierarchies;

  // Get the grandparent ID (if any)
  const grandparentId = deletedHierarchy.parentId || null;

  // Get the children of the deleted item
  const childrenIds = deletedHierarchy.children || [];

  const newTopNodes: string[] = [];

  // First, handle the children of the deleted item - connect them to the grandparent
  for (const childId of childrenIds) {
    if (!hierarchies[childId]) continue;

    // Update the child's parent to be the grandparent
    hierarchies[childId].parentId = grandparentId;

    // Update the child's ancestors (i.e. remove the deleted item)
    // other ancestors should be fine, except the now-deleted parent 
    hierarchies[childId].ancestors = hierarchies[childId].ancestors.filter(id => id !== deletedItemId);

    // If there's no grandparent, this becomes a top node
    if (!grandparentId) {
      newTopNodes.push(childId);
      hierarchies[childId].ancestors = [];
    }
  }

  // connect the children to the grandparent and remove this node
  if (grandparentId && hierarchies[grandparentId]) {
    hierarchies[grandparentId].children = [
      ...hierarchies[grandparentId].children.filter(id => id !== deletedItemId),
      ...childrenIds
    ];
}

  // Now process all other entries - we're looking for downstream descendants
  //    that need to have their ancestor list cleaned
  for (const id in hierarchies) {
    // if it's the one being deleted or children we've handled, skip
    if (id === deletedItemId || childrenIds.includes(id))
      continue;

    // For all other entries, remove the deleted item from ancestors
    if (hierarchies[id].ancestors) {
      hierarchies[id].ancestors = hierarchies[id].ancestors.filter(id => id !== deletedItemId);
    }
  }

  // delete the item from hierarchy
  delete hierarchies[deletedItemId];

  // store updated hierarchy
  FCBSetting.hierarchies = hierarchies;
  await FCBSetting.save();

  // update topNodes
  const topNodes = topicFolder.topNodes;
  topicFolder.topNodes = [...topNodes.filter(id => id !== deletedItemId), ...newTopNodes];
  await topicFolder.save();
};

