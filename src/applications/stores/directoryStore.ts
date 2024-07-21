// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, onMounted, ref, toRaw, watch } from 'vue';

// local imports
import { getGame } from '@/utils/game';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { cleanTrees, hasHierarchy, Hierarchy } from '@/utils/hierarchy';
import { useMainStore } from './mainStore';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { createWorldFolder, getTopicText, validateCompendia } from '@/compendia';
import { inputDialog } from '@/dialogs/input';
import { moduleSettings, SettingKey } from '@/settings/ModuleSettings';

// types
import { DirectoryWorld, DirectoryPack, DirectoryNode, Topic, DirectoryTypeNode, DirectoryEntryNode } from '@/types';

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
  const currentTree = reactive<{value: DirectoryWorld[]}>({value:[]});
  
  // tree currently refreshing
  const isTreeRefreshing = ref<boolean>(false);

  // which mode are we un
  const isGroupedByType = ref<boolean>(false);

  // current sidebar collapsed state
  const directoryCollapsed = ref<boolean>(false);

  ///////////////////////////////
  // actions
  const createWorld = async(): Promise<void> => {
    const worldFolder = await createWorldFolder(true);
    if (worldFolder) {
      await mainStore.setNewWorld(worldFolder.uuid);
    }

    await refreshCurrentTree();
  };

  // expand the given pack, loading the new item data
  const togglePack = async(pack: DirectoryPack) : Promise<void> => {
    // closing is easy
    if (pack.expanded) {
      await _collapseItem(pack, pack.id);
    } else {
      await _expandItem(pack, pack.id);
    }

    await refreshCurrentTree();
  };

  // expand/contract  the given entry, loading the new item data
  // return the new node
  const toggleEntry = async(packId: string, node: DirectoryNode, expanded: boolean) : Promise<DirectoryNode>=> {
    if (node.expanded===expanded || !currentWorldId.value)
      return node;
    
    if (node.expanded) {
      await _collapseItem(node, node.id);
    } else {
      await _expandItem(node, node.id);
    }

    // instead of refreshing the whole tree, we can just update the node
    const updatedNode = foundry.utils.deepClone(node);
    updatedNode.expanded = expanded;

    // make sure all children are properly loaded (if it's being opened)
    if (expanded) {
      const expandedIds = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds) || {};
      const pack = getGame().packs.get(packId);

      if (pack) {
        await _recursivelyLoadNode(pack, updatedNode.children, updatedNode.loadedChildren, expandedIds);
      } else {
        throw new Error('Could load pack in directoryStore.toggleEntry()');
      }
    }
    
    return updatedNode;
  };

  // expand/contract the given type node, loading the new item data
  // return the new node
  const toggleType = async(packId: string, node: DirectoryTypeNode, expanded: boolean) : Promise<DirectoryTypeNode>=> {
    if (node.expanded===expanded || !currentWorldId.value)
      return node;
    
    if (node.expanded) {
      await _collapseItem(node, node.id);
    } else {
      await _expandItem(node, node.id);
    }

    // instead of refreshing the whole tree, we can just update the node
    const updatedNode = foundry.utils.deepClone(node);
    updatedNode.expanded = expanded;

    // everything is loaded, so we don't need to do anything else
    return updatedNode;
  };

  const collapseAll = async(): Promise<void> => {
    if (!currentWorldId.value)
      return;

    await WorldFlags.unset(currentWorldId.value, WorldFlagKey.expandedIds);

    await refreshCurrentTree();
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
    const oldParentId = childNode.parentId;

    // make sure it's not already in the right place
    if (parentId===oldParentId)
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

    await refreshCurrentTree([parentId, oldParentId].filter((id)=>id!==null));

    return true;
  };

  const updateEntryType = async (entryId: string, typeName: string): Promise<void> => {
    const entry = await fromUuid(entryId) as JournalEntry;
    const oldType = EntryFlags.get(entry, EntryFlagKey.type);
    await EntryFlags.set(entry, EntryFlagKey.type, typeName);

    // remove from the old one
    const currentWorldNode = currentTree.value.find((w)=>w.id===currentWorldId.value) || null;
    const packNode = currentWorldNode?.packs.find((p)=>p.id===entry.pack) || null;
    const oldTypeNode = packNode?.loadedTypes.find((t) => t.name===oldType);
    if (oldTypeNode) {
      oldTypeNode.loadedChildren = oldTypeNode.loadedChildren.filter((e)=>e.id !== entryId);
    }

    // add to the new one
    const newTypeNode = packNode?.loadedTypes.find((t) => t.name===typeName);
    if (newTypeNode) {
      newTypeNode.loadedChildren = newTypeNode.loadedChildren.concat([{ id: entryId, name: entry.name || '<Blank>'}]).sort((a,b)=>a.name.localeCompare(b.name));
    }

  };

  const deleteWorld = async (worldId: string): Promise<void> => {
    // delete all the compendia
    const compendia = WorldFlags.get(worldId, WorldFlagKey.compendia);

    for (let i=0; i<Object.values(compendia).length; i++) {
      const pack = getGame().packs.get(Object.values(compendia)[i]);
      if (pack) {
        await pack.configure({ locked:false });
        await pack.deleteCompendium();
      }
    }

    // delete the world folder
    const worldFolder = await fromUuid(worldId) as Folder;
    await worldFolder.delete();

    await refreshCurrentTree();
  };

  // refreshes the directory tree
  // we try to keep it fast by not reloading from disk nodes that we've already loaded before,
  //    but that means that when names change or children change, we're not refreshing them properly
  // so updateEntryIds specifies an array of ids for nodes (entry, not pack) that just changed - this forces a reload of that entry and all its children
  const refreshCurrentTree = async (updateEntryIds?: string[]): Promise<void> => {
    // need to have a current world
    if (!currentWorldId.value)
      return;

    isTreeRefreshing.value = true;

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
      };
    }) || [];

    // find the record for the current world and set the packs
    const currentWorldBlock = tree.find((w)=>w.id===currentWorldId.value);
    if (currentWorldBlock && currentWorld) {
      const expandedNodes = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds);
      const types = WorldFlags.get(currentWorldId.value, WorldFlagKey.types);

      currentWorldBlock.packs = (await Promise.all(currentWorld.entries.map(async (pack: CompendiumCollection<any>): Promise<DirectoryPack> => {
        const topic = WorldFlags.get(pack.folder.uuid, WorldFlagKey.packTopics)[pack.metadata.id];
        
        return {
          pack: pack,
          id: pack.metadata.id,
          name: pack.metadata.label,
          topic: topic,
          topNodes: await _getPackTopNodes(pack),
          loadedTopNodes: [],
          loadedTypes: [],
          expanded: expandedNodes[pack.metadata.id] || false,
        };
      }))).sort((a: DirectoryPack, b: DirectoryPack): number => a.topic - b.topic);

      // load any open packs
      for (let i=0; i<currentWorldBlock?.packs.length; i++) {
        const pack = currentWorldBlock.packs[i];

        if (!pack.expanded)
          continue;

        // have to check all children are loaded and expanded properly
        await _recursivelyLoadNode(pack.pack, pack.topNodes, pack.loadedTopNodes, expandedNodes, updateEntryIds);

        await _loadTypeEntries(pack, types, expandedNodes);
      }
    }

    currentTree.value = tree;
    isTreeRefreshing.value = false;
  };

  const _recursivelyLoadNode = async (pack: CompendiumCollection<any>, children: string[], loadedChildren: DirectoryNode[], expandedNodes: Record<string, boolean | null>, updateEntryIds: string[] = []): Promise<void> => {
    // load any children that haven't been loaded before
    // this guarantees all children are at least in _loadedNodes and updateEntryIds ones have been refreshed
    const nodesToLoad = children.filter((id)=>!loadedChildren.find((n)=>n.id===id) || updateEntryIds.includes(id));

    if (nodesToLoad.length>0)
      await _loadNodeList(pack, nodesToLoad, updateEntryIds);

    // have to check all children loaded and update their expanded states
    for (let i=0; i<children.length; i++) {
      let child: DirectoryNode | null = loadedChildren.find((n)=>n.id===children[i]) || null;

      if (child && !updateEntryIds.includes(child.id)) {
        // this one is already loaded and attached (and not a forced update)
      } else if (_loadedNodes[children[i]]) {
        // it was loaded previously - just reattach it
        // without a deep clone, the reactivity down the tree on node.expanded isn't working... so doing this for now unless it creates performance issues
        // TODO - don't need to clone the 1st time we load from disk... it should ba  load or a clone, not both
        child = foundry.utils.deepClone(_loadedNodes[children[i]]);

        loadedChildren.push(child);
      } else {
        // should never happen because everything should be in _loadedNodes
        throw new Error('Entry failed to load properly in directoryStore._recursivelyLoadNode() ');
      }

      // may need to change the expanded state
      child.expanded = expandedNodes[child.id] || false;

      if (child.expanded) {
        await _recursivelyLoadNode(pack, child.children, child.loadedChildren, expandedNodes, updateEntryIds);
      }
    }      
  };

  const _loadTypeEntries = async (pack: DirectoryPack, worldTypes: Record<Topic, string []>, expandedIds: Record<string, boolean | null>): Promise<void> => {
    // this is relatively fast for now, so we just load them all... otherwise, we need a way to index the entries by 
    //    type on the pack or world, which is a lot of extra data
    const allEntries = await pack.pack.getDocuments({}) as JournalEntry[];
    
    pack.loadedTypes = worldTypes[pack.topic].map((type: string): DirectoryTypeNode => ({
      name: type,
      id: pack.id + ':' + type,
      expanded: expandedIds[pack.id + ':' + type] || false,   
      loadedChildren: allEntries.filter((e: JournalEntry)=> {
        const entryType = EntryFlags.get(e, EntryFlagKey.type);
        return (!entryType && type==='(none)') || (entryType && entryType===type);
      }).map((entry: JournalEntry): DirectoryEntryNode=> ({
        id: entry.uuid,
        name: entry.name || '<Blank>',
      })).sort((a, b) => a.name.localeCompare(b.name))      
    }));
  };
  
  // creates a new entry in the proper compendium in the given world
  // if name is populated will skip the dialog
  type CreateEntryOptions = { name?: string, type?: string, parentId?: string}
  const createEntry = async (worldFolder: Folder, topic: Topic, options: CreateEntryOptions): Promise<JournalEntry | null> => {
    const topicText = getTopicText(topic);

    let nameTouse = options.name || '' as string | null;
    while (nameTouse==='') {  // if hit ok, must have a value
      nameTouse = await inputDialog(`Create ${topicText}`, `${topicText} Name:`);
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameTouse)
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
      name: nameTouse,
      folder: worldFolder.id,
    },{
      pack: compendia[topic],
    });

    await pack.configure({locked:true});

    if (entry) {
      await EntryFlags.set(entry, EntryFlagKey.topic, topic);

      if (options.type!==undefined)
        await EntryFlags.set(entry, EntryFlagKey.type, options.type);

      // set parent if specified
      if (options.parentId==undefined) {
        // no parent - set as a top node
        const topNodes = await WorldFlags.get(worldFolder.uuid, WorldFlagKey.packTopNodes);
        await WorldFlags.set(worldFolder.uuid, WorldFlagKey.packTopNodes, {
          ...topNodes,
          [pack.metadata.id]: topNodes[pack.metadata.id].concat([entry.uuid])
        });

        // set the blank hierarchy
        if (hasHierarchy(topic)) {
          await EntryFlags.set(entry, EntryFlagKey.hierarchy, {
            parentId: '',
            ancestors: [],
            children: [],
          } as Hierarchy);
        }
      } else {
        // add to the tree
        if (hasHierarchy(topic)) {
          await setNodeParent(pack, entry.uuid, options.parentId);
        }
      }

      await refreshCurrentTree([entry.uuid]);
    }

    return entry || null;
  };

  // delete an entry from the world
  const deleteEntry = async (entryId: string) => {
    const entry = await fromUuid(entryId) as JournalEntry;

    // have to unlock the pack
    if (entry && entry.pack) {
      const pack = getGame().packs.get(entry.pack);
      if (pack) {
        await pack.configure({locked:false});

        const hierachy = EntryFlags.get(entry, EntryFlagKey.hierarchy);

        // delete from any trees
        if (hierachy?.ancestors || hierachy?.children) {
          await cleanTrees(entry);
        }

        await entry.delete();

        await pack.configure({locked:false});

        // TODO - remove from any relationships
        // TODO - remove from search

        await refreshCurrentTree();
      }
    }
  };


  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // load an entry from disk and convert it to a node
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

  // loads a set of nodes, including expanded status
  const _loadNodeList = async(pack: CompendiumCollection, ids: string[], updateEntryIds: string[] ): Promise<void> => {

    // we only want to load ones not already in _loadedNodes, unless its in updateEntryIds
    const uuidsToLoad = ids.filter((id)=>!_loadedNodes[id] || updateEntryIds.includes(id));

    // convert uuids to ids
    const convertedIds = uuidsToLoad.map((uuid)=>foundry.utils.parseUuid(uuid).id);

    const entries = await pack.getDocuments({ _id__in: convertedIds }) as JournalEntry[];

    for (let i=0; i<entries.length; i++) {
      const newNode = _convertEntryToNode(entries[i]);
      _loadedNodes[newNode.id] = newNode;
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
  const _collapseItem = async(node: DirectoryNode | DirectoryPack | DirectoryTypeNode, id: string): Promise<void> => {
    if (!currentWorldId.value)
      return;

    await WorldFlags.unset(currentWorldId.value, WorldFlagKey.expandedIds, id);
  };

  const _expandItem = async(node: DirectoryNode | DirectoryPack | DirectoryTypeNode, id: string): Promise<void> => {
    if (!currentWorldId.value)
      return;

    const expandedIds = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds) || {};
    await WorldFlags.set(currentWorldId.value, WorldFlagKey.expandedIds, {...expandedIds, [id]: true});
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
    };
  };

  // converts a DirectoryNode to a Hierarchy object
  const _convertNodeToHierarchy = (node: DirectoryNode): Hierarchy => {
    return {
      parentId: node.parentId,
      children: node.children,
      ancestors: node.ancestors,
    };
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
  
  // save grouping to settings
  watch(isGroupedByType, async (newSetting: boolean) => {
    isGroupedByType.value = newSetting;
    await moduleSettings.set(SettingKey.groupTreeByType, isGroupedByType.value);
  });
  
  ///////////////////////////////
  // lifecycle events
  onMounted(async () => {
    isGroupedByType.value = moduleSettings.get(SettingKey.groupTreeByType);
  });

  ///////////////////////////////
  // return the public interface
  return {
    currentTree,
    directoryCollapsed,
    isTreeRefreshing,
    isGroupedByType,

    toggleEntry,
    togglePack,
    toggleType,
    collapseAll,
    setNodeParent,
    refreshCurrentTree,
    updateEntryType,
    deleteWorld,
    createWorld,
    createEntry,
    deleteEntry,
  };
});