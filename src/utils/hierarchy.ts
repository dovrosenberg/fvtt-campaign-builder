import { TabSummary,  Hierarchy, Topics, ValidTopic, } from '@/types';
import { Entry, } from '@/classes';

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
export function validChildItems(currentWorldId: string, topic: ValidTopic, entry: Entry): TabSummary[] {
  if (!entry.uuid)
    return [];

  const ancestors = WorldFlags.getHierarchy(currentWorldId, entry.uuid)?.ancestors || [];

  // get the list - every entry in the pack that is not the one we're looking for or any of its ancestors
  // TODO: need to change find to forEach to populate an array
  return Entry.filter(topic, (e: Entry)=>(e.uuid !== entry.uuid && !ancestors.includes(entry.uuid)))
    .map(mapEntryToSummary) || [];
}

// returns a list of valid possible parents for a node
// a valid parent is anything that does not have this object as an ancestor (to avoid creating loops) 
// only works for topics that have hierachy
export function validParentItems(currentWorldId: string, topic: ValidTopic, entry: Entry): {name: string; id: string}[] {
  if (!entry.uuid)
    return [];

  const hierarchies = WorldFlags.get(currentWorldId, WorldFlagKey.hierarchies);

  // get the list - every entry in the pack that is not this one and does not have it as an ancestor
  return Entry
    .filter(topic, (e: Entry)=>( e.uuid !== entry.uuid && !(hierarchies[e.uuid]?.ancestors || []).includes(entry.uuid)))
    .map((e: Entry)=>({ name: e.name, id: e.uuid}));
}

const mapEntryToSummary = (entry: Entry): TabSummary => ({
  name: entry.name || '',
  uuid: entry.uuid,
});

// after we delete an item, we need to remove it from any trees where it is a child or ancestor,
//    along with all of the items that are now orphaned
export const cleanTrees = async function(world: WBWorld, topic: ValidTopic, deletedItemId: string, deletedHierarchy: Hierarchy): Promise<void> {
  const hierarchies = WorldFlags.get(currentWorldId, WorldFlagKey.hierarchies); 
  
  // remove deleted item and all its ancestors from any object who had them as ancestors previously
  // because we only allow one parent, any ancestor coming from the deleted item cannot be an ancestor of any other item
  //    so we can just remove all of the deleted item's ancestors from the ancestors list
  const itemsToRemove = [deletedItemId, ...deletedHierarchy.ancestors];

  const newTopNodes: string[] = [];
  for (let i=0; i<Object.keys(hierarchies).length; i++) {
    // if it's the one being deleted, skip it
    if (Object.keys(hierarchies)[i]===deletedItemId)
      continue;

    // if its parent is being removed, move it up one 
    if (hierarchies[Object.keys(hierarchies)[i]].parentId===deletedItemId) {
      hierarchies[Object.keys(hierarchies)[i]].parentId=deletedHierarchy.parentId;

      // and add to children of new parent or make a topnode
      if (deletedHierarchy.parentId) 
        hierarchies[deletedHierarchy.parentId].children.push(Object.keys(hierarchies)[i]);
      else
        newTopNodes.push(Object.keys(hierarchies)[i]);
    }

    // remove all the elements
    hierarchies[Object.keys(hierarchies)[i]].ancestors = hierarchies[Object.keys(hierarchies)[i]].ancestors.filter((s: string)=>!itemsToRemove.includes(s));
  }

  // remove it from the children list of its parent
  if (deletedHierarchy.parentId) {
    hierarchies[deletedHierarchy.parentId].children = hierarchies[deletedHierarchy.parentId].children.filter((s:string)=>s!=deletedItemId);
  }

  // delete the item from hierarchy
  delete hierarchies[deletedItemId];

  // store updated hierarchy
  await WorldFlags.set(currentWorldId, WorldFlagKey.hierarchies, hierarchies);

  // update topNodes
  let topNodes = WorldFlags.getTopicFlag(currentWorldId, WorldFlagKey.topNodes, topic);
  topNodes = topNodes.filter((s: string)=>s!=deletedItemId).concat(newTopNodes);
  await WorldFlags.setTopicFlag(currentWorldId, WorldFlagKey.topNodes, topic, topNodes);
};

