// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, onMounted, ref, toRaw, watch, } from 'vue';

// local imports
import { moduleSettings, SettingKey, } from '@/settings';
import { hasHierarchy, NO_TYPE_STRING } from '@/utils/hierarchy';
import { useMainStore, useNavigationStore, } from '@/applications/stores';
import { getTopicTextPlural, } from '@/compendia';

// types
import { Entry, DirectoryTopicNode, DirectoryTypeEntryNode, DirectoryEntryNode, DirectoryTypeNode, CreateEntryOptions, WBWorld, Topic, } from '@/classes';
import { DirectoryWorld, Hierarchy, Topics, ValidTopic, } from '@/types';

// the store definition
export const useTopicDirectoryStore = defineStore('topicDirectory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { rootFolder, currentWorld,} = storeToRefs(mainStore); 

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
  
  // the top-level folder structure
  const currentWorldTree = reactive<{value: DirectoryWorld[]}>({value:[]});

  // topic tree currently refreshing
  const isTopicTreeRefreshing = ref<boolean>(false);

  // which mode are we un
  const isGroupedByType = ref<boolean>(false);

  // current search text
  const filterText = ref<string>('');

  // currently displayed nodes and types
  const filterNodes = ref<Record<ValidTopic, string[]>>({} as Record<ValidTopic, string[]>);
   
  ///////////////////////////////
  // actions
  const createWorld = async(): Promise<void> => {
    const world = await WBWorld.create(true);
    if (world) {
      await mainStore.setNewWorld(world.uuid);
    }

    await refreshTopicDirectoryTree();
  };

  /**
   * Toggles the expansion state of the given topic node.
   * 
   * @param topic - The topic node to be toggled.
   * @returns A promise that resolves when the topic has been toggled.
   */
  const toggleTopic = async(topic: DirectoryTopicNode) : Promise<void> => {
    await topic.toggleWithLoad(!topic.expanded);
    await refreshTopicDirectoryTree();
  };

  // move the entry to a new type (doesn't update the entry itself)
  // entry should already have been updated
  const updateEntryType = async (entry: Entry, oldType: string): Promise<void> => {
    const newType = entry.type;

    if (oldType===newType || !currentWorld.value)
      return;

    // remove from the old one
    const currentWorldNode = currentWorldTree.value.find((w)=>w.id===currentWorld.value?.uuid) || null;
    const topicNode = currentWorldNode?.topics.find((p)=>p.topic.topic===entry.topic) || null;
    const oldTypeNode = topicNode?.loadedTypes.find((t) => t.name===oldType);
    if (!currentWorldNode || !topicNode) 
      throw new Error('Failed to load node in topicDirectoryStore.updateEntryType()');

    if (oldTypeNode) {
      oldTypeNode.loadedChildren = oldTypeNode.loadedChildren.filter((e)=>e.id !== entry.uuid);
      oldTypeNode.children = oldTypeNode.children.filter((id)=>id !== entry.uuid);

      // remove node if nothing left
      if (oldTypeNode.loadedChildren.length===0) {
        topicNode.loadedTypes = topicNode.loadedTypes.filter((t)=>t.name !== oldType);
      }
    }

    // add to the new one
    let newTypeNode = topicNode?.loadedTypes.find((t) => t.name===newType);
    if (!newTypeNode) {
      // need to create the new type
      newTypeNode = new DirectoryTypeNode(topicNode.id, newType);
      topicNode.loadedTypes.push(newTypeNode);
    }

    newTypeNode.loadedChildren = newTypeNode.loadedChildren.concat([DirectoryTypeEntryNode.fromEntry(entry, newTypeNode)]).sort((a,b)=>a.name.localeCompare(b.name));
    newTypeNode.children.push(entry.uuid);

    // update the hierarchy (even for entries without hierarchy, we still need it for filtering)
    const hierarchy = currentWorld.value.getEntryHierarchy(entry.uuid);
    if(!hierarchy)
      throw new Error(`Could not find hierarchy for ${entry.uuid} in topicTirectoryStore.updateEntryType()`);

    if (hierarchy.type !== newType) {
      hierarchy.type = newType;
      currentWorld.value.setEntryHierarchy(entry.uuid, hierarchy);
      await currentWorld.value.save();
    }

    await refreshTopicDirectoryTree([entry.uuid, newTypeNode.id]);
  };

  // expand/contract  the given entry, loading the new item data
  // return the new node
  const toggleWithLoad = async<T extends DirectoryEntryNode | DirectoryTypeNode>(node: T, expanded: boolean) : Promise<T>=> {
    return await node.toggleWithLoad(expanded) as T;
  };


  const collapseAll = async(): Promise<void> => {
    if (!currentWorld.value)
      return;

    await currentWorld.value.collapseTopicDirectory();

    await refreshTopicDirectoryTree();
  };
 
  // set the parent for a node, cleaning up all associated relationships/records
  // pass a null parent to make it a top node
  // returns wheether it was successful
  const setNodeParent = async function(topic: Topic, childId: string, parentId: string | null): Promise<boolean> {
    if (!currentWorld.value)
      return false;

    // we're going to use this to simplify syntax below
    const saveHierarchyToEntryFromNode = async (entry: Entry, node: DirectoryEntryNode) : Promise<void> => {
      if (!currentWorld.value)
        return;

      currentWorld.value.setEntryHierarchy(entry.uuid, node.convertToHierarchy());
      await currentWorld.value.save();
    };

    // topic has to have hierarchy
    if (!hasHierarchy(topic.topic))
      return false;

    // have to have a child
    const child = await Entry.fromUuid(childId, topic);

    if (!child)
      return false;

    // get the parent, if any, and create the nodes for simpler syntax 
    const parent = parentId ? await Entry.fromUuid(parentId, topic): null;

    if (!parent)
      return false;

    const parentNode = DirectoryEntryNode.fromEntry(parent);
    const childNode =  DirectoryEntryNode.fromEntry(child);
    const oldParentId = childNode.parentId;

    // make sure it's not already in the right place
    if (parentId===oldParentId)
      return false;

    // make sure they share a topic 
    if (child.topic !== parent.topic)
      return false;
     
    // next, confirm it's a valid target (the child must not be in the parent's ancestor list - or we get loops)
    if (parentNode && parentNode.ancestors.includes(childId))
      return false;

    // if the child already has a parent, remove it from that parent's children
    if (childNode.parentId) {
      const oldParent = await Entry.fromUuid(childNode.parentId, topic);

      if (oldParent) {
        const oldParentNode = DirectoryEntryNode.fromEntry(oldParent);
        if (oldParentNode) {
          oldParentNode.children = oldParentNode.children.filter((c)=>c!==childId);
          await saveHierarchyToEntryFromNode(oldParent, oldParentNode);
        }
      }
    }

    const originalChildAncestors = childNode.ancestors;  // save this for adjusting all the ancestors later

    if (parentNode) {   
      // add the child to the children list of the parent (if it has a parent)
      parentNode.children = [...parentNode.children, childId];
      await saveHierarchyToEntryFromNode(parent, parentNode);

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
      const hierarchies = currentWorld.value.hierarchies;

      // we switch to entries because of all the data retrieval
      const doUpdateOnDescendents = async (entry: Entry): Promise<void> => {
        const children = hierarchies[entry.uuid]?.children || [];

        // this seems safe, despite 
        for (let i=0; i<children?.length; i++) {
          const child = await Entry.fromUuid(children[i], topic);

          if (!child)
            continue;

          const childNode = DirectoryEntryNode.fromEntry(child);
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
    let topNodes = topic.topNodes || [];

    if (!parentNode && !topNodes.includes(childId)) {
      topNodes = topNodes.concat([childId]);
    } else if (parentNode && topNodes.includes(childId)) {
      topNodes = topNodes.filter((n)=>n!==childId);
    } else {
      topNodes = topic.topNodes || [];
    }
    
    topic.topNodes = topNodes;
    await topic.save();

    await refreshTopicDirectoryTree([parentId, oldParentId].filter((id)=>id!==null));

    return true;
  };


  const createEntry = async (topic: Topic, options: CreateEntryOptions): Promise<Entry | null> => {
    if (!currentWorld.value)
      return null;

    const entry = await Entry.create(topic, options);

    if (entry) {
      const uuid = entry.uuid;

      // we always add a hierarchy, because we use it for filtering
      currentWorld.value.setEntryHierarchy(uuid, 
        {
          parentId: '',
          ancestors: [],
          children: [],
          type: '',
        } as Hierarchy
      );
      await currentWorld.value.save();

      // set parent if specified
      if (options.parentId==undefined) {
        // no parent - set as a top node
        const topNodes = topic.topNodes;
        topic.topNodes = topNodes.concat([uuid]);
        await topic.save();
      } else {
        // add to the tree
        if (hasHierarchy(topic.topic)) {
          // this creates the proper hierarchy
          await setNodeParent(topic, uuid, options.parentId);
        }
      }

      if (options.parentId) {
        await refreshTopicDirectoryTree([options.parentId, entry.uuid]);
      } else {
        await refreshTopicDirectoryTree([entry.uuid]);
      }
    }

    return entry || null;
  };

  /**
   * Deletes a world identified by the given worldId.
   * This includes deleting all associated compendia and the world folder itself.
   * After deletion, the directory tree is refreshed.
   * 
   * @param worldId - The UUID of the world to be deleted.
   * @returns A promise that resolves when the world and its compendia are deleted.
   */
  const deleteWorld = async (worldId: string): Promise<void> => {
    const world = await WBWorld.fromUuid(worldId);

    if (!world)
      return;

    await world.delete();

    await refreshTopicDirectoryTree();
  };

  // delete an entry from the world
  const deleteEntry = async (topic: ValidTopic, entryId: string) => {
    if (!currentWorld.value)
      return;

    const hierarchy = currentWorld.value.getEntryHierarchy(entryId);

    const entry = currentWorld.value.topics[topic].filterEntries((e: Entry) => e.uuid === entryId)[0];
    await entry.delete();

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(entryId);

    // refresh and force its parent to update
    await refreshTopicDirectoryTree(hierarchy?.parentId ? [hierarchy?.parentId] : []);
  };
 
  // refreshes the directory tree 
  // we try to keep it fast by not reloading from disk nodes that we've already loaded before,
  //    but that means that when names change or children change, we're not refreshing them properly
  // so updateEntryIds specifies an array of ids for nodes (entry, not pack) that just changed - this forces a reload of that entry and all its children
  // TODO: consider wrapping the rootfolder in a class vs. doing this foundry work here
  const refreshTopicDirectoryTree = async (updateEntryIds?: string[]): Promise<void> => {
    // need to have a current world and journals loaded
    if (!currentWorld.value)
      return;

    isTopicTreeRefreshing.value = true;

    // we put in the packs only for the current world
    let tree = [] as DirectoryWorld[];

    // populate the world names, and find the current one
    let currentWorldFound = false;
    tree = (toRaw(rootFolder.value) as Folder)?.children?.map((world: Folder): DirectoryWorld => {
      if (!world.folder)
        throw new Error('World without folder in refreshTopicDirectoryTree()');

      if (world.folder.uuid===currentWorld.value?.uuid) {
        currentWorldFound = true;
      }

      return {
        name: world.folder.name as string,
        id: world.folder.uuid as string,
        topics: []
      };
    }) || [];

    // find the record for the current world and set the packs
    const currentWorldBlock = tree.find((w)=>w.id===currentWorld.value?.uuid);
    if (currentWorldBlock && currentWorldFound && currentWorld.value) {
      const expandedNodes = currentWorld.value.expandedIds;

      const topics = [Topics.Character, Topics.Event, Topics.Location, Topics.Organization] as ValidTopic[];
      currentWorldBlock.topics = topics.map((topic: ValidTopic): DirectoryTopicNode => {
        const id = `${(currentWorld.value as WBWorld).uuid}.topic.${topic}`;
        const topicObj = (currentWorld.value as WBWorld).topics[topic] as Topic;

        return new DirectoryTopicNode(
          id,
          getTopicTextPlural(topic),
          topicObj,
          topicObj.topNodes.concat(),
          [],
          [],
          expandedNodes[id] || false,
        );
      }).sort((a: DirectoryTopicNode, b: DirectoryTopicNode): number => a.topic.topic - b.topic.topic);

      // load any open topics
      for (let i=0; i<currentWorldBlock?.topics.length; i++) {
        const directoryTopicNode = currentWorldBlock.topics[i];

        if (!directoryTopicNode.expanded)
          continue;

        // have to check all children are loaded and expanded properly
        await directoryTopicNode.recursivelyLoadNode(expandedNodes, updateEntryIds);

        await directoryTopicNode.loadTypeEntries(currentWorld.value.topics[directoryTopicNode.topic.topic].types, expandedNodes);
      }
    }

    currentWorldTree.value = tree;

    // make sure the node list is up to date
    updateFilterNodes();

    isTopicTreeRefreshing.value = false;
  };
  
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  // populates filterNodes with a list of all the nodes that should be shown in the current tree
  // this includes: all nodes matching the filterText, all of their ancestors, and
  //    all of their types (we also ways leave the packs)
  // it's an object keyed by topic with a list of all the ids to include
  // TODO - a checkbox option that uses search to filter by all searchable fields vs just name
  const updateFilterNodes = (): void => {
    if (!currentWorld.value)
      return;

    const retval: Record<ValidTopic, string[]> = {
      [Topics.Character]: [],
      [Topics.Event]: [],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    };

    const hierarchies = currentWorld.value.hierarchies;

    const regex = new RegExp( filterText.value, 'i');  // do case insensitive search
    const topics = [Topics.Character, Topics.Event, Topics.Location, Topics.Organization] as ValidTopic[];

    for (let i=0; i<topics.length; i++) {
      const topicObj = currentWorld.value.topics[topics[i]];

      // filter on name and type
      let matchedEntries = topicObj.filterEntries((e: Entry)=>( filterText.value === '' || regex.test( e.name || '' ) || regex.test( e.type || '' )))
        .map((e: Entry): string=>e.uuid) as string[];
  
      // add the ancestors and types; iterate backwards so that we can push on the end and not recheck the ones we're adding
      for (let j=matchedEntries.length-1; j>=0; j--) {
        if (hierarchies[matchedEntries[j]] && hierarchies[matchedEntries[j]].ancestors) {
          matchedEntries = matchedEntries.concat(hierarchies[matchedEntries[j]].ancestors);
        }
  
        // add the type
        // note: we add the blank type, even though we don't currently show them in the grouped tree
        matchedEntries.push(hierarchies[matchedEntries[j]]?.type || NO_TYPE_STRING);
      }
  
      // eliminate duplicates
      retval[topics[i]] = [...new Set(matchedEntries)] as string[];
    }

    filterNodes.value = retval;
  };

  
  ///////////////////////////////
  // watchers
  // when the root folder changes, load the top level info (worlds and packs)
  // when the world changes, clean out the cache of loaded items
  //@ts-ignore - Vue can't handle reactive classes
  watch(currentWorld, async (newWorld: WBWorld | null): Promise<void> => {
    if (!newWorld) {
      return;
    }

    await refreshTopicDirectoryTree();
  });
  
  // when the current journal set is updated, refresh the tree
  // watch(currentTopicJournals, async (_newJournals: Record<ValidTopic, JournalEntry> | null): Promise<void> => {
  //   await refreshTopicDirectoryTree();
  // });
  
  // save grouping to settings
  watch(isGroupedByType, async (newSetting: boolean) => {
    isGroupedByType.value = newSetting;
    await moduleSettings.set(SettingKey.groupTreeByType, isGroupedByType.value);
  });

  // update the filter when text changes
  watch(filterText, () => {
    updateFilterNodes();
  });
  
  ///////////////////////////////
  // lifecycle events
  onMounted(() => {
    isGroupedByType.value = moduleSettings.get(SettingKey.groupTreeByType);
  });

  ///////////////////////////////
  // return the public interface
  return {
    currentWorldTree,
    isTopicTreeRefreshing,
    isGroupedByType,
    filterText,
    filterNodes,

    toggleTopic,
    toggleWithLoad,
    collapseAll,
    setNodeParent,
    refreshTopicDirectoryTree,
    updateEntryType,
    updateFilterNodes,
    deleteWorld,
    createWorld,
    createEntry,
    deleteEntry,
  };
});