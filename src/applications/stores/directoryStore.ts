// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { ref, toRaw, watch } from 'vue';

// local imports
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { hasHierarchy, Hierarchy } from '@/utils/hierarchy';
import { useMainStore } from './mainStore';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';

// types
import { DirectoryWorld, DirectoryPack, DirectoryNode } from '@/types';

// the store definition
export const useDirectoryStore = defineStore('directory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { rootFolder, currentWorldId } = storeToRefs(mainStore); 

  ///////////////////////////////
  // internal state
  let _loadedNodes = {} as Record<string, DirectoryNode>;   // maps uuid to the node for easy lookup

  ///////////////////////////////
  // external state
  
  // the top-level folder structure
  const currentTree = ref<DirectoryWorld[]>([]);

  ///////////////////////////////
  // actions
  // expand the given pack, loading the new item data
  const togglePack = async(pack: DirectoryPack) : Promise<void> => {
    // closing is easy
    if (pack.expanded) {
      // TODO - does this trigger reactivity
      pack.expanded = false;
      return;
    }

    // see if we already loaded the children
    if (pack.topNodes.length!==pack.loadedTopNodes.length) {
      // need to load them - note: we only go one layer deep
      for (let i=0; i<pack.topNodes.length; i++) {
        if (pack.loadedTopNodes.find((n)=>n.id===pack.topNodes[i])) {
          // this one is already loaded and attached
          continue;
        } else if (_loadedNodes[pack.topNodes[i]]) {
          // it was loaded previously - just reattach it
          pack.loadedTopNodes.push(_loadedNodes[pack.topNodes[i]]);
          continue;
        } else {
          // need to load it
          const newNode = await _loadNode(pack.topNodes[i]);
          if (!newNode)
            throw new Error('Attempting to load invalid node in directoryStore.toggleNode(): ' + pack.topNodes[i]);

          pack.loadedTopNodes.push(newNode);
        }
      }      
    } 
    
    // TODO - does this trigger reactivity if node is already expanded?
    pack.expanded = true;
  };

  // expand the given node, loading the new item data
  const toggleNode = async(node: DirectoryNode) : Promise<void>=> {
    // closing is easy
    if (node.expanded) {
      // TODO - does this trigger reactivity
      node.expanded = false;
      return;
    }

    // see if we already loaded the children
    if (node.children.length!==node.loadedChildren.length) {
      // need to load them - note: we only go one layer deep
      for (let i=0; i<node.children.length; i++) {
        if (node.loadedChildren.find((n)=>n.id===node.children[i])) {
          // this one is already loaded and attached
          continue;
        } else if (_loadedNodes[node.children[i]]) {
          // it was loaded previously - just reattach it
          node.loadedChildren.push(_loadedNodes[node.children[i]]);
          continue;
        } else {
          // need to load it
          const newNode = await _loadNode(node.children[i]);
          if (!newNode)
            throw new Error('Attempting to load invalid node in directoryStore.toggleNode(): ' + node.children[i]);

          node.loadedChildren.push(newNode);
        }
      }      
    } 
    
    // TODO - does this trigger reactivity if node is already expanded?
    node.expanded = true;
  };

  const collapseAll = async(): Promise<void> => {
    // TODO
  };
 
  // set the parent for a node, cleaning up all associated relationships/records
  // pass a null parent to make it a top node
  // returns wheether it was successful
  const setNodeParent = async function(pack: CompendiumCollection<any>, childId: string, parentId: string | null): Promise<boolean> {
    // we're going to use this to simplify syntax below
    const saveHierarchyToEntryFromNode = async (entry: JournalEntry, node: DirectoryNode) : Promise<void> => {
      await EntryFlags.set(entry, EntryFlagKey.hierarchy, _convertNodeToHierarchy(node));
    };

    // topic has to have hierarchy
    if (!hasHierarchy(WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopics)[pack.metadata.id]))
      return false;

    // have to have a child
    const child = await fromUuid(childId) as JournalEntry;

    if (!child)
      return false;

    // get the parent, if any, and create the nodes for simpler syntax 
    const parent = parentId ? await fromUuid(parentId) as JournalEntry: null;
    const parentNode = parent ? _convertEntryToNode(parent) : null;
    const childNode =  _convertEntryToNode(child);

    // make sure it's not already in the right place
    if (parentId===childNode.parentId)
      return false;

    // make sure they share a topic (and so does the pack)
    if (parent && EntryFlags.get(child, EntryFlagKey.topic)!==EntryFlags.get(parent, EntryFlagKey.topic) ||
        EntryFlags.get(child, EntryFlagKey.topic)!==WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopics)[pack.metadata.id])
      return false;
     
    // next, confirm it's a valid target (the child must not be in the parent's ancestor list - or we get loops)
    if (parentNode && parentNode.ancestors.includes(childId))
      return false;

    // if the child already has a parent, remove it from that parent's children
    if (childNode.parentId) {
      const oldParent = await fromUuid(childNode.parentId) as JournalEntry;
      const oldParentNode = oldParent ? _convertEntryToNode(oldParent) : null;
      if (oldParentNode) {
        oldParentNode.children = oldParentNode.children.filter((c)=>c!==childId);
        await saveHierarchyToEntryFromNode(oldParent, oldParentNode);
      }
    }

    const originalChildAncestors = childNode.ancestors;  // save this for adjusting all the ancestors later

    if (parentNode) {   
      // add the child to the children list of the parent (if it has a parent)
      parentNode.children = [...parentNode.children, childId];
      await saveHierarchyToEntryFromNode(parent as JournalEntry, parentNode);

      // set the parent and the ancestors of the child (ancestors = parent + parent's ancestors)
      childNode.parentId = parentId;
      childNode.ancestors = [parentId as string].concat(parentNode.ancestors);
      await saveHierarchyToEntryFromNode(child, childNode);
    } else {
      // parent and ancestors are null
      childNode.parentId = null;
      childNode.ancestors = [];
      await saveHierarchyToEntryFromNode(child, childNode);
    }

    // recalculate the ancestor lists for all of the descendents of the child
    // first, figure out the differences between the child's old ancestors and the new ones (so we can touch fewer items)
    // we add an extra value to ancestorsToRemove so that we can ensure it's never empty (which will cause the $ne to throw an error)
    const ancestorsToAdd = originalChildAncestors.filter(a => !childNode.ancestors.includes(a));
    const ancestorsToRemove = childNode.ancestors.filter(a => !originalChildAncestors.includes(a));

    // then, update all of the child's descendents ancestor fields with that set of changes
    if (ancestorsToAdd || ancestorsToRemove) {
      // we switch to entries because of all the data retrieval
      const doUpdateOnDescendents = async (entry: JournalEntry): Promise<void> => {
        const children = EntryFlags.get(entry, EntryFlagKey.hierarchy)?.children || [];

        // this seems safe, despite 
        for (let i=0; i<children?.length; i++) {
          const child = await fromUuid(children[i]) as JournalEntry;
          const childNode = _convertEntryToNode(child);
          childNode.ancestors = childNode.ancestors.filter(a => !ancestorsToRemove.includes(a));
          childNode.ancestors = childNode.ancestors.concat(ancestorsToAdd);

          await saveHierarchyToEntryFromNode(child, childNode);

          // now do it's kids
          await doUpdateOnDescendents(child);
        }
      };

      await doUpdateOnDescendents(child);
    }

    // if the child doesn't have a parent, make sure it's in the topnode list
    //    and vice versa
    let topNodes = await _getPackTopNodes(pack);

    if (!parentNode && !topNodes.includes(childId)) {
      topNodes = topNodes.concat([childId]);
      await _savePackTopNodes(pack, topNodes);
    } else if (parentNode && topNodes.includes(childId)) {
      topNodes = topNodes.filter((n)=>n!==childId);
      await _savePackTopNodes(pack, topNodes);
    }

    return true;
  };

  const refreshCurrentTree = async (): Promise<void> => {
    currentTree.value = await Promise.all((toRaw(rootFolder.value) as Folder)?.children?.map(async (world): Promise<DirectoryWorld> => {
      return {
        name: world.folder.name as string,
        id: world.folder.uuid as string,
        packs: await Promise.all(world.entries.map(async (pack: CompendiumCollection<any>): Promise<DirectoryPack> =>({
          pack: pack,
          id: pack.metadata.id,
          name: pack.metadata.label,
          topic: WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopics)[pack.metadata.id],
          topNodes: await _getPackTopNodes(pack),
          loadedTopNodes: [],
          // TODO - store and retrieve expanded status
          expanded: true,   //        !expandedCompendia.value[pack.metadata.id],
        }))),
      };
    })) || [];
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _loadNode = async(id: string): Promise<DirectoryNode | null> => {
    const entry = await fromUuid(id) as JournalEntry;

    if (!entry)
      return null;
    else {
      const newNode = _convertEntryToNode(entry);

      _loadedNodes[newNode.id] = newNode;

      return newNode;
    }
  };

  const _savePackTopNodes = async (pack: CompendiumCollection<any>, topNodes: string[]): Promise<void> => {
    if (!currentWorldId.value)
      return;

    // get the settings
    const allTopNodes = (WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopNodes));

    // save back with the new array
    await WorldFlags.set(currentWorldId.value, WorldFlagKey.packTopNodes, {...allTopNodes, [pack.metadata.id]: topNodes});
  };

  const _getPackTopNodes = async (pack: CompendiumCollection<any>) : Promise<string[]> => {
    const packId = pack.metadata.id;

    // get the settings
    const allTopNodes = (WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopNodes));

    // TODO - whenever we add a node to a pack, we need to refresh topNodes

    // if it has the config set, just use that (note it could be empty, so need to allow for that)
    if (allTopNodes[packId]!==null && allTopNodes[packId]!==undefined)
      return allTopNodes[packId];

    // otherwise, find all the top nodes and set the config
    // if the pack has no hierachy, just made all the nodes top nodes
    let topNodes: string[];
    if (!hasHierarchy(WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopics)[packId])) {
      topNodes = pack.tree.entries.map((e)=>e.uuid);
    } else {
      topNodes = await toRaw(pack).tree?.entries?.reduce(async (retval: Promise<string[]>, entry: JournalEntry): Promise<string[]> => {
        const newretval = await retval;

        // those are just indexes, so have to get the full thing
        const fullEntry = await fromUuid(entry.uuid) as JournalEntry;

        // if the pack has no hierarchy or the node has no ancestors, it's a top node
        const hierarchy = EntryFlags.get(fullEntry, EntryFlagKey.hierarchy);
        if (!hierarchy || !hierarchy.ancestors)
          throw new Error('Missing hierarchy in directoryStore._getPackTopNodes()) for uuid: ' + entry.uuid);
        else if (hierarchy.ancestors.length===0)
          newretval.push(fullEntry.uuid);

        return newretval;
      }, Promise.resolve([] as string[]));
    }

    // save the results back to the settings
    await _savePackTopNodes(pack, topNodes);

    return topNodes;
  };

  // converts the entry to a DirectoryNode for cleaner interface
  const _convertEntryToNode = (entry: JournalEntry): DirectoryNode => {
    return {
      id: entry.uuid,
      name: entry.name || '<Blank>',
      parentId: EntryFlags.get(entry, EntryFlagKey.hierarchy)?.parentId || null,
      children: EntryFlags.get(entry, EntryFlagKey.hierarchy)?.children || [],
      ancestors: EntryFlags.get(entry, EntryFlagKey.hierarchy)?.ancestors || [],
      loadedChildren: [],
      expanded: false,  // TODO- load this, too
    }
  };

  // converts a DirectoryNode to a Hierarchy object
  const _convertNodeToHierarchy = (node: DirectoryNode): Hierarchy => {
    return {
      parentId: node.parentId,
      children: node.children,
      ancestors: node.ancestors,
    }
  };

  ///////////////////////////////
  // watchers
  // when the root folder changes, load the top level info (worlds and packs)
  watch(rootFolder, async (newRootFolder: Folder | null): Promise<void> => {
    if (!newRootFolder) {
      currentTree.value = [];
      return;
    }

    await refreshCurrentTree();
  });

  // when the world changes, clean out the cache of loaded items
  watch(currentWorldId, async (newWorldId: string | null): Promise<void> => {
    if (!newWorldId) {
      return;
    }

    _loadedNodes = {};
    
    // re-collapse everything
    await collapseAll();

    // TODO - will have to expand down the tree
  });
  
  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentTree,

    toggleNode,
    togglePack,
    collapseAll,
    setNodeParent,
    refreshCurrentTree,
  };
});