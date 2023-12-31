import { EntrySummary, Topic } from '@/types';
import { TreeNode } from '@/components/Tree';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';

// types and functions used to manage topic hierarchies
// note: this uses ids not uuids because getDocuments can't search by uuid and they're all in the
//    same compendium regardless
export type Hierarchy = {
  parentId: string;   // id of parent
  ancestors: string[];    // ids of all ancestors
  children: string[];    // ids of all direct children
}

// does this topic use hierarchy?
export const hasHierarchy = (topic: Topic): boolean => [Topic.Organization, Topic.Location].includes(topic);

// returns a list of valid possible children for a location
// this is to populate a list of possible children for a location (ex. a dropdown)
// a valid child is one that is not an ancestor of the parent (to avoid creating loops) or the parent itself
// only works for topics that have hierachy
export function validChildItems(pack: CompendiumCollection<any>, entry: JournalEntry): EntrySummary[] {
  if (!entry.id)
    return [];

  // look up the item
  const parent = pack.find((j)=>(j.uuid === entry.uuid));

  if (!parent)
    return [];

  const ancestors = EntryFlags.get(parent, EntryFlagKey.hierarchy)?.ancestors || [];

  // get the list - every entry in the pack that is not the one we're looking for or any of its ancestors
  return pack.find((j)=>(j.uuid !== entry.uuid && !ancestors.includes(entry.id!))).map(mapEntryToSummary);
}

// returns a list of valid possible parents for a location
// a valid parent is anything that does not have this object as an ancestor (to avoid creating loops) 
// only works for topics that have hierachy
export function validParentItems(pack: CompendiumCollection<any>, entry: JournalEntry): EntrySummary[] {
  if (!entry.id)
    return [];

  // look up the item
  const child = pack.find((j)=>(j.uuid === entry.uuid));

  if (!child)
    return [];

  // get the list - every entry in the pack that is not one and does not have it as an ancestor
  return pack.find((j: JournalEntry)=>(
    j.uuid !== entry.uuid && 
    !(EntryFlags.get(j, EntryFlagKey.hierarchy)?.ancestors || []).includes(entry.id!))
  ).map(mapEntryToSummary);
}

// get a structure of TreeNode (suitable for passing to a tree) showing the full ancestor history of the passed entry
export async function getAncestorTree(pack: CompendiumCollection<any>, entry: JournalEntry): Promise<TreeNode[]> {
  // build the tree structure 
  const addNode = function(entryToAdd: JournalEntry): TreeNode | null {
    const children = [] as TreeNode[];

    // if we're on the current node, we don't want to add its children (because we don't show it in descendent trees)
    if (entryToAdd.uuid !== entry.uuid) {
      EntryFlags.get(entryToAdd, EntryFlagKey.hierarchy)?.children.forEach((childId: string) => {
        const descendents = addNode(pack.find((j)=>(j.id===childId)));

        if (descendents) {
          children.push(descendents);
        }
      });
    }

    const itemType = EntryFlags.get(entryToAdd, EntryFlagKey.type) || '';
    return {
      text: entryToAdd.name + ( itemType ? ' (' + itemType + ')' : ''),
      value: entryToAdd.uuid,
      children: children,
    };
  };  

  // we're going to loop over all the ancestors for the current item (which is a list, but we don't know the right order)
  let retval = [] as TreeNode[];
  const ancestors = await ancestorItems(pack, entry);

  // loop over all of the ancestors to find the top one
  for (let i=0; i<Object.values(ancestors).length; i++) {
    const currentItem = Object.values(ancestors)[i];
    const parentId = EntryFlags.get(currentItem, EntryFlagKey.hierarchy)?.parentId;

    // if it has no parent, it's the top node, so we start there and build the tree
    // but if it's also the current node, then there is no parent, so we shouldn't show a tree at all (i.e. we just return the current [] value)
    if (!parentId && currentItem.uuid !== entry.uuid) {
      const node = addNode(currentItem);
      if (node) {
        retval = [{
          ...node,
          expanded: true,  // default them all to expanded
        }];
      }

      // there's only one top, so we're done
      break;
    }
  }

  return retval;
}



const mapEntryToSummary = (entry: JournalEntry): EntrySummary => ({
  name: entry.name || '',
  uuid: entry.uuid,
});



// // returns all of the descendents of an item that has an ancestors field (not including the item itself)
// // only works for types that have ancestor field
// const descendentItems = async function<T extends DBItemWithTree> (collection: Collection<T>, worldId: ObjectId, _id: ObjectId, context: {userId: string}): Promise<T[]> {
//   // check authorization
//   if (!await hasAccessToWorld(context, worldId))
//     throw new Error('Unauthorized in descendentTree');

//   // pull everything that is below this location
//   const retval = await (await collection.find({ worldId, ancestors: _id} as unknown as Filter<T>)).toArray()
//   return retval as T[];
// }

// returns all of the ancestors of an entry (including the entry itself) as a map from their uuid
// only works for topics that have hierachy
const ancestorItems = async function(pack:CompendiumCollection<any>, entry: JournalEntry): Promise<Record<string, JournalEntry>> {
  // get the list of ancestors
  const ancestors = EntryFlags.get(entry, EntryFlagKey.hierarchy)?.ancestors || [];

  // convert to a map
  const entries = (await pack.getDocuments({ _id__in: ancestors })) as JournalEntry[];
  
  return entries.reduce((acc: Record<string, JournalEntry>, ancestor: JournalEntry): Record<string, JournalEntry> => {
    acc[ancestor.uuid] = ancestor;
    return acc;
  }, {});
}

