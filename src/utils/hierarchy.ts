import { TabSummary,  Hierarchy, Topics, } from '@/types';
import { TopicFolder, Entry, WBWorld, } from '@/classes';

// the string to show for items with no type
export const NO_TYPE_STRING = '(none)';

// the string to show for items with no name
export const NO_NAME_STRING = '<Blank>';

// does this topic use hierarchy?
export const hasHierarchy = (topic: Topics): boolean => [Topics.Organization, Topics.Location].includes(topic);

// returns a list of valid possible children for a node
// this is to populate a list of possible children for a node (ex. a dropdown)
// a valid child is one that is not an ancestor of the parent (to avoid creating loops) or the parent itself
// only works for topics that have hierachy
export function validChildItems(world: WBWorld, entry: Entry): TabSummary[] {
  if (!entry.uuid)
    return [];

  const topicFolder = world.topicFolders[entry.topic];

  const ancestors = world.getEntryHierarchy(entry.uuid)?.ancestors || [];

  // get the list - every entry in the pack that is not the one we're looking for or any of its ancestors
  return topicFolder.filterEntries((e: Entry)=>(e.uuid !== entry.uuid && !ancestors.includes(entry.uuid)))
    .map(mapEntryToSummary) || [];
}

// returns a list of valid possible parents for a node
// a valid parent is anything that does not have this object as an ancestor (to avoid creating loops) 
// only works for topics that have hierachy
export function validParentItems(world: WBWorld, entry: Entry): {name: string; id: string}[] {
  if (!entry.uuid)
    return [];

  const hierarchies = world.hierarchies;
  const topicFolder = world.topicFolders[entry.topic];

  if (!topicFolder || !hasHierarchy(entry.topic))
    return [];

  // get the list - every entry in the pack that is not this one and does not have it as an ancestor
  return topicFolder
    .filterEntries((e: Entry)=>( e.uuid !== entry.uuid && !(hierarchies[e.uuid]?.ancestors || []).includes(entry.uuid)))
    .map((e: Entry)=>({ name: e.name, id: e.uuid}));
}

export function getParentId(world: WBWorld, entry: Entry): string | null {
  if (!hasHierarchy(entry.topic))
    return null;

  const hierarchies = world.hierarchies;
  const hierarchy = hierarchies[entry.uuid];
  return hierarchy?.parentId ?? null;
}

const mapEntryToSummary = (entry: Entry): TabSummary => ({
  name: entry.name || '',
  uuid: entry.uuid,
});

// after we delete an item, we need to remove it from any trees where it is a child or ancestor,
//    along with all of the items that are now orphaned
// Also cleans up the topic topNodes
export const cleanTrees = async function(world: WBWorld, topicFolder: TopicFolder, deletedItemId: string, deletedHierarchy: Hierarchy): Promise<void> {
  const hierarchies = world.hierarchies;

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

    // Update the child's ancestors 
    if (grandparentId) {
      // If there's a grandparent, add the child to its children and remove the deleted item
      if (hierarchies[grandparentId]) {
        hierarchies[grandparentId].children = [
          ...hierarchies[grandparentId].children.filter(id => id !== deletedItemId),
          childId
        ];

        // other ancestors should be fine, except the now-deleted parent 
        hierarchies[childId].ancestors = hierarchies[childId].ancestors.filter(id => id !== deletedItemId);
      }
    } else {
      // If there's no grandparent, this becomes a top node
      newTopNodes.push(childId);
      hierarchies[childId].ancestors = [];
    }
  }

  // Now process all other entries - we're looking for downstream descendents
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
  world.hierarchies = hierarchies;
  await world.save();

  // update topNodes
  const topNodes = topicFolder.topNodes;
  topicFolder.topNodes = [...topNodes.filter(id => id !== deletedItemId), ...newTopNodes];
  await topicFolder.save();
};

