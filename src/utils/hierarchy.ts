import { EntrySummary, Topic, TreeNode } from '@/types';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';

// types and functions used to manage topic hierarchies
export type Hierarchy = {
  parentId: string | null;   // id of parent
  ancestors: string[];    // ids of all ancestors
  children: string[];    // ids of all direct children
}

// does this topic use hierarchy?
export const hasHierarchy = (topic: Topic): boolean => [Topic.Organization, Topic.Location].includes(topic);

// returns a list of valid possible children for a node
// this is to populate a list of possible children for a node (ex. a dropdown)
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

// returns a list of valid possible parents for a node
// a valid parent is anything that does not have this object as an ancestor (to avoid creating loops) 
// only works for topics that have hierachy
export function validParentItems(pack: CompendiumCollection<any>, entry: JournalEntry): string[] {
  if (!entry.id)
    return [];

  // look up the item
  const child = pack.find((j)=>(j.uuid === entry.uuid));

  if (!child)
    return [];

  // get the list - every entry in the pack that is not this one and does not have it as an ancestor
  return pack.filter((j: JournalEntry)=>(
    j.uuid !== entry.uuid && 
    !(EntryFlags.get(j, EntryFlagKey.hierarchy)?.ancestors || []).includes(entry.id!))
  ).map((e)=>e.uuid);
}

// get a structure of TreeNode (suitable for passing to a tree) showing the full ancestor history of the passed entry,
//   the entry itself, and all of the (direct) children of the entry
// values will be populated with uuid
export async function getHierarchyTree(pack: CompendiumCollection<any>, entry: JournalEntry): Promise<TreeNode[]> {
  // first get all the ancestors down to the current entry
  const ancestorTree = await getAncestorTree(pack, entry);

  // now find the bottom and add the children
  let node = ancestorTree[0];
  // note that ancestor tree is only one child per level - it just shows the path from the entry up
  while (node.children.length!==0) { 
    node = node.children[0];
  } 

  // now add all the children, if any
  const childIds = EntryFlags.get(entry, EntryFlagKey.hierarchy)?.children;

  if (childIds?.length) {
    const childEntries = await pack.getDocuments({_id__in: childIds});

    node.children = childEntries.map((entry: JournalEntry): TreeNode => {
      const itemType = EntryFlags.get(entry, EntryFlagKey.type) || '';

      return {
        text: entry.name + ( itemType ? ' (' + itemType + ')' : ''),
        value: entry.uuid,
        children: [],  // we don't want to go further down the tree
        expanded: false,
      };
    });
  }

  return ancestorTree;
}

// get a structure of TreeNode (suitable for passing to a tree) showing the full ancestor history of the passed entry
export async function getAncestorTree(pack: CompendiumCollection<any>, entry: JournalEntry, withItemType=true): Promise<TreeNode[]> {
  // build the tree structure 
  const addNode = function(entryToAdd: JournalEntry): TreeNode {
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
      text: entryToAdd.name + ( withItemType && itemType ? ' (' + itemType + ')' : ''),
      value: entryToAdd.uuid,
      children: children,
      expanded: (entryToAdd.uuid!==entry.uuid),  // don't expand the current node
    };
  };  

  // we're going to loop over all the ancestors for the current item (which is a list, but we don't know the right order)
  let retval = [] as TreeNode[];
  const ancestors = await ancestorItems(pack, entry);

  if (Object.keys(ancestors).length>0) {
    // loop over all of the ancestors to find the top one
    for (let i=0; i<Object.values(ancestors).length; i++) {
      const currentItem = Object.values(ancestors)[i];
      const parentId = EntryFlags.get(currentItem, EntryFlagKey.hierarchy)?.parentId;

      // if it has no parent, it's the top node, so we start there and build the tree
      if (!parentId) {
        retval = [addNode(currentItem)];

        // there's only one top, so we're done
        break;
      }
    }
  } else {
    // just add the entry
    retval = [addNode(entry)];
  }

  return retval;
}

const mapEntryToSummary = (entry: JournalEntry): EntrySummary => ({
  name: entry.name || '',
  uuid: entry.uuid,
});


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
};

// get a structure of TreeNode (suitable for passing to a tree) showing all of the top-level nodes, along with
//    all of their ancesors, for a given type of document (i.e. everything in the passed in pack)
// used to create the directory structure
// values will be populated with uuid
// if search is populated, the list will be filtered to only documents with names matching the (case-insensitive) search
// TODO: need to test this for performance with large collections... otherwise may need to move do a different
//    way of storing the records because there's no way to effectively search based on flags. It's possible the
//    type field could be used to store whether it's a top node or not and then use getDocuments({}) to pull only
//    top nodes, but that seems clunky given that field is used for other things and can be modified by users
//    if they open as a journal entry. 
// Does not include itemtype in name
export async function getDocumentTree(pack: CompendiumCollection<any>, search?: string): Promise<TreeNode[]> {
  const documentTree = [] as TreeNode[];

  // load all the entries to memory
  const allEntries = (await pack.getDocuments());
  const entryMap = allEntries.reduce((result: Record<string, StoredDocument<any>>, e: StoredDocument<any>) => {
    result[e.id] = e;
  }, {} as Record<string, StoredDocument<any>>);

  // returns all of the children TreeNodes of the entry with the given id, along with their full trees (including
  //    the given node)
  const getDescendentTree = (id: string): TreeNode => {
    const entry = entryMap[id];

    const hierarchy = EntryFlags.get(entry, EntryFlagKey.hierarchy);
    if (hierarchy && hierarchy?.children.length > 0) {
      const children = [] as TreeNode[];
      hierarchy.children.forEach((id: string) => {
        children.push(getDescendentTree(id));
      });

      return {
        text: entry.name,
        value: entry.uuid,
        children: children,
        expanded: true, 
      };
    } else {
      return {
        text: entry.name,
        value: entry.uuid,
        children: [],
        expanded: true   
      };
    }
  };

  // do all the ones with no ancestors, because those are the top
  allEntries.forEach((e)=> {
    // TODO - confirm LevelDB sorts 
    const hierarchy = EntryFlags.get(e, EntryFlagKey.hierarchy);
    if (hierarchy && hierarchy?.ancestors.length > 0) {
      documentTree.push(getDescendentTree(e.uuid));
    }
  });

  return documentTree;
}
