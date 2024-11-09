// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, onMounted, ref, toRaw, watch, } from 'vue';

// local imports
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { hasHierarchy, Hierarchy, NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';
import { useMainStore } from '@/applications/stores';
import { createWorldFolder, getTopicText, validateCompendia } from '@/compendia';
import { moduleSettings, SettingKey } from '@/settings/ModuleSettings';

// types
import { DirectoryWorld, DirectoryTopic, DirectoryNode, Topic, DirectoryTypeNode, DirectoryEntryNode, ValidTopic } from '@/types';

// the store definition
export const useDirectoryStore = defineStore('directory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { rootFolder, currentWorldId, currentWorldFolder, currentJournals } = storeToRefs(mainStore); 

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

  // current search text
  const filterText = ref<string>('');

  // currently displayed nodes and types
  const filterNodes = ref<Record<ValidTopic, string[]>>({});
   
  ///////////////////////////////
  // actions
  const createWorld = async(): Promise<void> => {
    const worldFolder = await createWorldFolder(true);
    if (worldFolder) {
      await mainStore.setNewWorld(worldFolder.uuid);
    }

    await refreshCurrentTree();
  };

  // expand the given topic, loading the new item data
  const toggleTopic = async(topic: DirectoryTopic) : Promise<void> => {
    // closing is easy
    if (topic.expanded) {
      await _collapseItem(topic, topic.id);
    } else {
      await _expandItem(topic, topic.id);
    }

    await refreshCurrentTree();
  };

  // move the entry to a new type (doesn't update the entry itself)
  const updateEntryType = async (entry: JournalEntryPage, oldType: string, newType: string): Promise<void> => {
    if (!currentWorldId.value)
      return;

    // remove from the old one
    const currentWorldNode = currentTree.value.find((w)=>w.id===currentWorldId.value) || null;
    const packNode = currentWorldNode?.topics.find((p)=>p.topic===entry.system.topic) || null;
    const oldTypeNode = packNode?.loadedTypes.find((t) => t.name===oldType);
    if (!currentWorldNode || !packNode) 
      throw new Error('Failed to load node in directoryStore.updateEntryTopic()');

    if (oldTypeNode)
      oldTypeNode.loadedChildren = oldTypeNode.loadedChildren.filter((e)=>e.id !== entry.uuid);

    // add to the new one
    const newTypeNode = packNode?.loadedTypes.find((t) => t.name===newType);
    if (newTypeNode) {
      newTypeNode.loadedChildren = newTypeNode.loadedChildren.concat([{ id: entry.uuid, name: entry.name || NO_NAME_STRING}]).sort((a,b)=>a.name.localeCompare(b.name));
    }

    // update the hierarchy
    const hierarchy = WorldFlags.getHierarchy(currentWorldId.value, entry.uuid);
    if (!hierarchy)
      throw new Error(`Could not find hierarchy for ${entry.uuid} in directoryStore.updateEntryTopic()`);

    hierarchy.type = newType;
    await WorldFlags.setHierarchy(currentWorldId.value, entry.uuid, hierarchy);
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

      await _recursivelyLoadNode(updatedNode.children, updatedNode.loadedChildren, expandedIds);
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
  const setNodeParent = async function(topic: Topic, childId: string, parentId: string | null): Promise<boolean> {
    if (!currentWorldId.value)
      return false;

    // we're going to use this to simplify syntax below
    const saveHierarchyToEntryFromNode = async (entry: JournalEntryPage, node: DirectoryNode) : Promise<void> => {
      if (!currentWorldId.value)
        return;

      await WorldFlags.setHierarchy(currentWorldId.value, entry.uuid, _convertNodeToHierarchy(node));
    };

    // topic has to have hierarchy
    if (!hasHierarchy(topic))
      return false;

    // have to have a child
    const child = await fromUuid(childId) as JournalEntryPage;

    if (!child)
      return false;

    // get the parent, if any, and create the nodes for simpler syntax 
    const parent = parentId ? await fromUuid(parentId) as JournalEntryPage: null;
    const parentNode = parent ? _convertEntryToNode(parent) : null;
    const childNode =  _convertEntryToNode(child);
    const oldParentId = childNode.parentId;

    // make sure it's not already in the right place
    if (parentId===oldParentId)
      return false;

    // make sure they share a topic 
    if (parent && EntryFlags.get(child, EntryFlagKey.topic)!==EntryFlags.get(parent, EntryFlagKey.topic))
      return false;
     
    // next, confirm it's a valid target (the child must not be in the parent's ancestor list - or we get loops)
    if (parentNode && parentNode.ancestors.includes(childId))
      return false;

    // if the child already has a parent, remove it from that parent's children
    if (childNode.parentId) {
      const oldParent = await fromUuid(childNode.parentId) as JournalEntryPage;
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
      await saveHierarchyToEntryFromNode(parent as JournalEntryPage, parentNode);

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
      const hierarchies = WorldFlags.get(currentWorldId.value, WorldFlagKey.hierarchies);

      // we switch to entries because of all the data retrieval
      const doUpdateOnDescendents = async (entry: JournalEntryPage): Promise<void> => {
        const children = hierarchies[entry.uuid]?.children || [];

        // this seems safe, despite 
        for (let i=0; i<children?.length; i++) {
          const child = await fromUuid(children[i]) as JournalEntryPage;
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
    let topNodes = WorldFlags.get(currentWorldId.value, WorldFlagKey.topNodes)[topic] || [];

    if (!parentNode && !topNodes.includes(childId)) {
      topNodes = topNodes.concat([childId]);
    } else if (parentNode && topNodes.includes(childId)) {
      topNodes = topNodes.filter((n)=>n!==childId);
    }
    await WorldFlags.set(currentWorldId.value, WorldFlagKey.topNodes, topNodes);

    await refreshCurrentTree([parentId, oldParentId].filter((id)=>id!==null));

    return true;
  };

  const deleteWorld = async (worldId: string): Promise<void> => {
    // delete all the compendia
    if (currentWorldCompendium.value) {
      await currentWorldCompendium.value.configure({ locked:false });
      await currentWorldCompendium.value.deleteCompendium();
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
    let currentWorld;    // the folder of the currently selected world
    tree = (toRaw(rootFolder.value) as Folder)?.children?.map((world: Folder): DirectoryWorld => {
      if (!world.folder)
        throw new Error('World without folder in refreshCurrentTree()');

      if (world.folder.uuid===currentWorldId.value)
        currentWorld = world;

      return {
        name: world.folder.name as string,
        id: world.folder.uuid as string,
        topics: []
      };
    }) || [];

    // find the record for the current world and set the packs
    const currentWorldBlock = tree.find((w)=>w.id===currentWorldId.value);
    if (currentWorldBlock && currentWorld) {
      const expandedNodes = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds);
      const types = WorldFlags.get(currentWorldId.value, WorldFlagKey.types);

      const topics = [Topic.Character, Topic.Event, Topic.Location, Topic.Organization] as ValidTopic[];
      currentWorldBlock.topics = topics.map((topic: ValidTopic): DirectoryTopic => {
        const id = `${currentWorldId.value}.topic.${topic}`;
        return {
          id: id,
          name: getTopicText(topic),
          topic: topic,
          topNodes: WorldFlags.get(currentWorldId.value as string, WorldFlagKey.topNodes)[topic],
          loadedTopNodes: [],
          loadedTypes: [],
          expanded: expandedNodes[id] || false,
        };
      }).sort((a: DirectoryTopic, b: DirectoryTopic): number => a.topic - b.topic);

      // load any open topics
      for (let i=0; i<currentWorldBlock?.topics.length; i++) {
        const directoryTopic = currentWorldBlock.topics[i];

        if (!directoryTopic.expanded)
          continue;

        // have to check all children are loaded and expanded properly
        await _recursivelyLoadNode(directoryTopic.topNodes, directoryTopic.loadedTopNodes, expandedNodes, updateEntryIds);

        await _loadTypeEntries(directoryTopic, types[directoryTopic.topic], expandedNodes);
      }
    }

    currentTree.value = tree;
    isTreeRefreshing.value = false;
  };

  const _recursivelyLoadNode = async (children: string[], loadedChildren: DirectoryNode[], expandedNodes: Record<string, boolean | null>, updateEntryIds: string[] = []): Promise<void> => {
    // load any children that haven't been loaded before
    // this guarantees all children are at least in _loadedNodes and updateEntryIds ones have been refreshed
    const nodesToLoad = children.filter((id)=>!loadedChildren.find((n)=>n.id===id) || updateEntryIds.includes(id));

    if (nodesToLoad.length>0)
      await _loadNodeList(nodesToLoad, updateEntryIds);

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

      if (child.expanded || updateEntryIds.includes(child.id)) {
        await _recursivelyLoadNode(child.children, child.loadedChildren, expandedNodes, updateEntryIds);
      }
    }      
  };

  const _loadTypeEntries = async (topic: DirectoryTopic, worldTypes: Record<Topic, string []>, expandedIds: Record<string, boolean | null>): Promise<void> => {
    // this is relatively fast for now, so we just load them all... otherwise, we need a way to index the entries by 
    //    type on the journalentry, or pack or world, which is a lot of extra data (or consider a special subtype of Journal Entry with a type field in the data model
    //    that is also in the index)
    if (!currentJournals.value)
      return;

    const allEntries = await currentJournals.value[topic.topic].pages.search({
      query: '',
      filters: [{
        field: 'system.topic',
        value: topic.topic,
      }]
    }) as JournalEntryPage[];
    
    topic.loadedTypes = worldTypes[topic.topic].map((type: string): DirectoryTypeNode => ({
      name: type,
      id: topic.id + ':' + type,
      expanded: expandedIds[topic.id + ':' + type] || false,   
      loadedChildren: allEntries.filter((e: JournalEntryPage)=> {
        const entryType = e.system.type;
        return (!entryType && type===NO_TYPE_STRING) || (entryType && entryType===type);
      }).map((entry: JournalEntryPage): DirectoryEntryNode=> ({
        id: entry.uuid,
        name: entry.name || NO_NAME_STRING,
      })).sort((a, b) => a.name.localeCompare(b.name))      
    }));
  };
  
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // load an entry from disk and convert it to a node
  // const _loadNode = async(id: string, expandedIds: Record<string, boolean | null>): Promise<DirectoryNode | null> => {
  //   const entry = await fromUuid(id) as JournalEntryPage;

  //   if (!entry)
  //     return null;
  //   else {
  //     const newNode = _convertEntryToNode(entry);
  //     newNode.expanded = expandedIds[newNode.id] || false;

  //     _loadedNodes[newNode.id] = newNode;

  //     return newNode;
  //   }
  // };

  // populates filterNodes with a list of all the nodes that should be shown in the current tree
  // this includes: all nodes matching the filterText, all of their ancestors, and
  //    all of their types (we also ways leave the packs)
  // it's an object keyed by packId with a list of all the ids to include
  // TODO - a checkbox option that uses search to filter by all searchable fields vs just name
  const updateFilterNodes = (): void => {
    const retval: Record<ValidTopic, string[]> = {
      [Topic.Character]: [],
      [Topic.Event]: [],
      [Topic.Location]: [],
      [Topic.Organization]: [],
    };

    if (!currentWorldId.value || !currentJournals.value)
      return;

    const hierarchies = WorldFlags.get(currentWorldId.value, WorldFlagKey.hierarchies);

    const regex = new RegExp( filterText.value, 'i');  // do case insensitive search
    const topics = [Topic.Character, Topic.Event, Topic.Location, Topic.Organization] as ValidTopic[];

    for (let i=0; i<topics.length; i++) {
      const journal = currentJournals.value[topics[i]];

      let matchedEntries = journal.pages.index.filter((e: JournalEntryPage)=>( filterText.value === '' || regex.test( e.name || '' )))
        .map((e: JournalEntryPage): string=>e.uuid);
  
      // add the ancestors and types; iterate backwards so that we can push on the end and not recheck the ones we're adding
      for (let j=matchedEntries.length-1; j>=0; j--) {
        if (hierarchies[matchedEntries[j]] && hierarchies[matchedEntries[j]].ancestors) {
          matchedEntries = matchedEntries.concat(hierarchies[matchedEntries[j]].ancestors);
        }
  
        // type 
        // note: we add the blank type, even though we don't currently show them in
        //    the grouped tree,
        matchedEntries.push(hierarchies[matchedEntries[j]]?.type || NO_TYPE_STRING);
      }
  
      // eliminate duplicates
      retval[topics[i]] = [...new Set(matchedEntries)];
    }

    filterNodes.value = retval;
  };


  // loads a set of nodes, including expanded status
  const _loadNodeList = async(ids: string[], updateEntryIds: string[] ): Promise<void> => {

    // we only want to load ones not already in _loadedNodes, unless its in updateEntryIds
    const uuidsToLoad = ids.filter((id)=>!_loadedNodes[id] || updateEntryIds.includes(id));

    // convert uuids to ids
    const convertedIds = uuidsToLoad.map((uuid)=>foundry.utils.parseUuid(uuid).id);

    const entries = await currentJournals.value.pages.getDocuments({ _id__in: convertedIds }) as JournalEntryPage[];

    for (let i=0; i<entries.length; i++) {
      const newNode = _convertEntryToNode(entries[i]);
      _loadedNodes[newNode.id] = newNode;
    }
  };

  // used to toggle entries and compendia (not worlds)
  const _collapseItem = async(node: DirectoryNode | DirectoryTopic | DirectoryTypeNode, id: string): Promise<void> => {
    if (!currentWorldId.value)
      return;

    await WorldFlags.unset(currentWorldId.value, WorldFlagKey.expandedIds, id);
  };

  const _expandItem = async(node: DirectoryNode | DirectoryTopic | DirectoryTypeNode, id: string): Promise<void> => {
    if (!currentWorldId.value)
      return;

    const expandedIds = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds) || {};
    await WorldFlags.set(currentWorldId.value, WorldFlagKey.expandedIds, {...expandedIds, [id]: true});
  };


  // converts the entry to a DirectoryNode for cleaner interface
  const _convertEntryToNode = (entry: JournalEntryPage): DirectoryNode => {
    if (!currentWorldId.value)
      throw new Error('No currentWorldId in directoryStore._convertEntryToNode()');

    const hierachy = WorldFlags.getHierarchy(currentWorldId.value, entry.uuid);

    return {
      id: entry.uuid,
      name: entry.name || NO_NAME_STRING,
      parentId: hierachy?.parentId || null,
      children: hierachy?.children || [],
      ancestors: hierachy?.ancestors || [],
      loadedChildren: [],
      type: entry.system.type || NO_TYPE_STRING,
      expanded: false,  // TODO- load this, too
    };
  };

  // converts a DirectoryNode to a Hierarchy object
  const _convertNodeToHierarchy = (node: DirectoryNode): Hierarchy => {
    return {
      parentId: node.parentId,
      children: node.children,
      ancestors: node.ancestors,
      type: node.type,
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
    await updateFilterNodes();  
    await refreshCurrentTree();
  });
  
  // save grouping to settings
  watch(isGroupedByType, async (newSetting: boolean) => {
    isGroupedByType.value = newSetting;
    await moduleSettings.set(SettingKey.groupTreeByType, isGroupedByType.value);
  });

  // update the filter when text changes
  watch(filterText, async () => {
    await updateFilterNodes();
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
    filterText,
    filterNodes,

    toggleEntry,
    toggleTopic,
    toggleType,
    collapseAll,
    setNodeParent,
    refreshCurrentTree,
    updateEntryType,
    updateFilterNodes,
    deleteWorld,
    createWorld,
  };
});