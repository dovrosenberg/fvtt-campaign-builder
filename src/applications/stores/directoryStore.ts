// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, ref, toRaw, watch } from 'vue';

// local imports
import { getGame } from '@/utils/game';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { hasHierarchy, Hierarchy } from '@/utils/hierarchy';
import { useMainStore } from './mainStore';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { createWorldFolder, getTopicText, validateCompendia } from '@/compendia';
import { inputDialog } from '@/dialogs/input';

// types
import { DirectoryWorld, DirectoryPack, DirectoryNode, Topic } from '@/types';

// the store definition
export const useDirectoryStore = defineStore('directory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { rootFolder, currentWorldId, currentWorldFolder } = storeToRefs(mainStore); 

  ///////////////////////////////
  // internal state
  let _loadedNodes = {} as Record<string, DirectoryNode>;   // maps uuid to the node for easy lookup

  ///////////////////////////////
  // external state
  
  // the top-level folder structure
  const currentTree = ref<DirectoryWorld[]>([]);

  // current sidebar collapsed state
  const directoryCollapsed = ref<boolean>(false);

  ///////////////////////////////
  // actions
  const createWorld = async(): Promise<void> => {
    const world = await createWorldFolder(true);
    if (world) {
      await mainStore.setNewWorld(world.id);
    }

    await refreshCurrentTree();
  };

  // expand the given pack, loading the new item data
  const togglePack = async(pack: DirectoryPack) : Promise<void> => {
    // closing is easy
    if (pack.expanded) {
      await _collapseItem(pack.id);
    } else {
      await _expandItem(pack.id);
    }
  };

  // expand the given entry, loading the new item data
  const toggleEntry = async(node: DirectoryNode) : Promise<void>=> {
    // closing is easy
    if (node.expanded) {
      await _collapseItem(node.id);
    } else {
      await _expandItem(node.id);
    }
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

    await refreshCurrentTree();

    return true;
  };

  const deleteWorld = async (worldId: string): Promise<void> => {
    // delete all the compendia
    const compendia = WorldFlags.get(worldId, WorldFlagKey.compendia);

    for (let i=0; i<Object.keys(compendia).length; i++) {
      const pack = getGame().packs.get(compendia[Object.keys(compendia)[i]]);
      if (pack) {
        await pack.configure({ locked:false });
        await pack.deleteCompendium();
      }
    }
  };

  const refreshCurrentTree = async (): Promise<void> => {
    // need to have a current world
    if (!currentWorldId.value)
      return;

    // we put in the packs only for the current world
    let tree = [] as DirectoryWorld[];

    // populate the world names, and find the current one
    let currentWorld;
    tree = (toRaw(rootFolder.value) as Folder)?.children?.map((world): DirectoryWorld => {
      if (world.folder.uuid===currentWorldId.value)
        currentWorld = world;

      return {
        name: world.folder.name as string,
        id: world.folder.uuid as string,
        packs: []
      }
    }) || [];

    // find the record for the current world and set the packs
    const currentWorldBlock = tree.find((w)=>w.id===currentWorldId.value);
    if (currentWorldBlock && currentWorld) {
      const expandedNodes = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds) || [];

      currentWorldBlock.packs = await Promise.all(currentWorld.entries.map(async (pack: CompendiumCollection<any>): Promise<DirectoryPack> =>({
        pack: pack,
        id: pack.metadata.id,
        name: pack.metadata.label,
        topic: WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopics)[pack.metadata.id],
        topNodes: await _getPackTopNodes(pack),
        loadedTopNodes: [],
        expanded: expandedNodes[pack.metadata.id] || false,
      })));

      // load any open packs
      for (let i=0; i<currentWorldBlock?.packs.length; i++) {
        const pack = currentWorldBlock.packs[i];

        if (!pack.expanded)
          continue;

        // have to check all children are loaded and expanded properly
        await recursivelyLoadNode(pack.topNodes, pack.loadedTopNodes, expandedNodes);
      }
    }

    currentTree.value = tree;
  };

  const recursivelyLoadNode = async (children: string[], loadedChildren: DirectoryNode[], expandedNodes: Record<string, boolean | null>): Promise<void> => {
    // have to check all children loaded and update their expanded states
    for (let i=0; i<children.length; i++) {
      let child: DirectoryNode | null = loadedChildren.find((n)=>n.id===children[i]) || null;

      if (child) {
        // this one is already loaded and attached
      } else if (_loadedNodes[children[i]]) {
        child = _loadedNodes[children[i]];

        // it was loaded previously - just reattach it
        loadedChildren.push(child);
      } else {
        // need to load it
        child = await _loadNode(children[i], expandedNodes);
        if (!child)
          throw new Error('Attempting to load invalid node in directoryStore.recursivelyLoadNode(): ' + children[i]);

        loadedChildren.push(child);
      }

      // may need to change the expanded state
      child.expanded = expandedNodes[child.id] || false;

      if (child.expanded)
        await recursivelyLoadNode(child.children, child.loadedChildren, expandedNodes);
    }      
  };

  // creates a new entry in the proper compendium in the given world
  const createEntry = async (worldFolder: Folder, topic: Topic): Promise<JournalEntry | null> => {
    const topicText = getTopicText(topic);

    let name;
    do {
      name = await inputDialog(`Create ${topicText}`, `${topicText} Name:`);
    } while (name==='');  // if hit ok, must have a value

    // if name is null, then we cancelled the dialog
    if (!name)
      return null;

    // create the entry
    const compendia = WorldFlags.get(worldFolder.uuid, WorldFlagKey.compendia);

    if (!compendia || !compendia[topic])
      throw new Error('Missing compendia in directoryStore.createEntry()');

    // unlock it to make the change
    const pack = getGame().packs.get(compendia[topic]);
    if (!pack)
      throw new Error('Bad compendia in directoryStore.createEntry()');

    await pack.configure({locked:false});

    const entry = await JournalEntry.create({
      name,
      folder: worldFolder.id,
    },{
      pack: compendia[topic],
    });

    await pack.configure({locked:true});

    if (entry) {
      await EntryFlags.set(entry, EntryFlagKey.topic, topic);

      // setup the hierarchy
      if (hasHierarchy(topic)) {
        await EntryFlags.set(entry, EntryFlagKey.hierarchy, {
          parentId: '',
          ancestors: [],
          children: [],
        } as Hierarchy);
      }

      // add as a topNode by default
      const topNodes = await WorldFlags.get(worldFolder.uuid, WorldFlagKey.packTopNodes);
      await WorldFlags.set(worldFolder.uuid, WorldFlagKey.packTopNodes, {
        ...topNodes,
        [pack.metadata.id]: topNodes[pack.metadata.id].concat([entry.uuid])
      });

      await refreshCurrentTree();
    }

    return entry || null;
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // NOTE: DOES NOT CHECK EXPANDED STATE
  const _loadNode = async(id: string, expandedIds: Record<string, boolean | null>): Promise<DirectoryNode | null> => {
    const entry = await fromUuid(id) as JournalEntry;

    if (!entry)
      return null;
    else {
      const newNode = _convertEntryToNode(entry);
      newNode.expanded = expandedIds[newNode.id] || false;

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

  // used to toggle entries and compendia (not worlds)
  const _collapseItem = async(id: string): Promise<void> => {
    if (!currentWorldId.value)
      return;

    //const expandedIds = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds) || {};
    //delete expandedIds[id];
    await WorldFlags.set(currentWorldId.value, WorldFlagKey.expandedIds, {[`-=${id}`]: null});

    await refreshCurrentTree();
  };

  const _expandItem = async(id: string): Promise<void> => {
    if (!currentWorldId.value)
      return;

    const expandedIds = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds) || {};
    await WorldFlags.set(currentWorldId.value, WorldFlagKey.expandedIds, {...expandedIds, [id]: true});

    await refreshCurrentTree();
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
  watch(currentWorldFolder, async (newWorldFolder: Folder | null): Promise<void> => {
    if (!newWorldFolder) {
      return;
    }

    _loadedNodes = {};
    
    await validateCompendia(newWorldFolder);
    await refreshCurrentTree();
  });
  
  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentTree,
    directoryCollapsed,

    toggleEntry,
    togglePack,
    collapseAll,
    setNodeParent,
    refreshCurrentTree,
    deleteWorld,
    createWorld,
    createEntry,
  };
});