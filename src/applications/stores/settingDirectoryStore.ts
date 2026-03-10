// this store handles the directory tree

// library imports
import { storeToRefs, } from 'pinia';
import { reactive, onMounted, ref, watch, nextTick } from 'vue';

// local imports
import { ModuleSettings, SettingKey, } from '@/settings';
import { hasHierarchy, NO_TYPE_STRING } from '@/utils/hierarchy';
import { useMainStore, useNavigationStore, useStoryWebStore } from '@/applications/stores';
import { getCurrentSetting, getTopicTextPlural, } from '@/compendia';
import { localize } from '@/utils/game';
import { FCBDialog } from '@/dialogs';
import DirectoryScrollService from '@/utils/directoryScroll';
import GlobalSettingService from '@/utils/globalSettings';

// types
import { Entry, DirectoryTopicFolderNode, DirectoryTypeEntryNode, DirectoryEntryNode, DirectoryTypeNode, CreateEntryOptions, FCBSetting, TopicFolder,  } from '@/classes';
import { DirectorySetting, Hierarchy, Topics, ValidTopic, ValidTopicRecord, EntryBasicIndex } from '@/types';
import { MenuItem } from '@imengyu/vue3-context-menu';

// the store definition
export const settingDirectoryStore = () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const storyWebStore = useStoryWebStore();
  const { currentSetting, currentEntry, refreshCurrentEntry, currentStoryWeb } = storeToRefs(mainStore); 
  
  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  // the top-level folder structure
  // its an array for historic reasons and in case we ever want to go back
  //    to showing more than 1 setting in the list
  const currentSettingTree = reactive<{value: DirectorySetting[]}>({value:[]});

  // reactive list of all settings for the dropdown
  const settingIndexList = ref<Array<{name: string, settingId: string, packId: string}>>([]);

  // topic tree currently refreshing
  const isSettingTreeRefreshing = ref<boolean>(false);

  // which mode are we un
  const isGroupedByType = ref<boolean>(false);

  // current search text
  const filterText = ref<string>('');

  // currently displayed nodes and types based on the filter text
  const filterNodes = ref<ValidTopicRecord<string[]>>({});

  ///////////////////////////////
  // actions
  const createSetting = async(): Promise<void> => {
    const setting = await FCBSetting.create(true);
    if (setting) {
      await mainStore.setNewSetting(setting.uuid);

      await refreshSettingDirectoryTree();

      // create a new setting tab as a starting point
      await navigationStore.openSetting(setting.uuid, { newTab: true, activate: true });
    }
  };

  /**
   * Toggles the expansion state of the given topic node.
   * 
   * @param topic - The topic node to be toggled.
   * @returns A promise that resolves when the topic has been toggled.
   */
  const toggleTopic = async(topicNode: DirectoryTopicFolderNode) : Promise<void> => {
    await topicNode.toggleWithLoad(!topicNode.expanded);
    await refreshSettingDirectoryTree();
  };

  // move the entry to a new type (doesn't update the entry itself)
  // entry should already have been updated
  const updateEntryType = async (entry: Entry, oldType: string): Promise<void> => {
    const newType = entry.type;

    if (oldType===newType || !currentSetting.value)
      return;

    // remove from the old one
    const currentSettingNode = currentSettingTree.value.find((w)=>w.id===currentSetting.value?.uuid) || null;
    const topicNode = currentSettingNode?.topicNodes.find((p)=>p.topicFolder.topic===entry.topic) || null;
    const oldTypeNode = topicNode?.loadedTypes.find((t) => t.name===oldType);
    if (!currentSettingNode || !topicNode) 
      throw new Error('Failed to load node in settingDirectoryStore.updateEntryType()');

    if (oldTypeNode) {
      oldTypeNode.loadedChildren = oldTypeNode.loadedChildren.filter((e)=>e.id !== entry.uuid);
      oldTypeNode.children = oldTypeNode.children.filter((id)=>id !== entry.uuid);

      // remove node if nothing left
      if (oldTypeNode.loadedChildren.length===0) {
        topicNode.loadedTypes = topicNode.loadedTypes.filter((t)=>t.name !== oldType);

        // also delete from the main type list
        if (topicNode.topicFolder) {
          topicNode.topicFolder.types = topicNode.topicFolder.types.filter((t)=>t!==oldType);
          await topicNode.topicFolder.save();
        }
      }
    }

    // add to the new one
    let newTypeNode = topicNode?.loadedTypes.find((t) => t.name===newType);
    if (!newTypeNode) {
      // need to create the new type
      newTypeNode = new DirectoryTypeNode(topicNode.id, newType);
      topicNode.loadedTypes.push(newTypeNode);
    }

    newTypeNode.loadedChildren = newTypeNode.loadedChildren.concat([DirectoryTypeEntryNode.fromEntryBasicIndex(entry, newTypeNode)]).sort((a,b)=>a.name.localeCompare(b.name));
    newTypeNode.children.push(entry.uuid);

    // update the hierarchy (even for entries without hierarchy, we still need it for filtering)
    const hierarchy = currentSetting.value.getEntryHierarchy(entry.uuid);
    if(!hierarchy)
      throw new Error(`Could not find hierarchy for ${entry.uuid} in settingDirectoryStore.updateEntryType()`);

    if (hierarchy.type !== newType) {
      hierarchy.type = newType;
      await currentSetting.value.setEntryHierarchy(entry.uuid, hierarchy);
    }

    await refreshSettingDirectoryTree([entry.uuid, newTypeNode.id]);
  };

  // expand/contract  the given entry, loading the new item data
  // return the new node
  const toggleWithLoad = async<T extends DirectoryEntryNode | DirectoryTypeNode>(node: T, expanded: boolean) : Promise<T>=> {
    return await node.toggleWithLoad(expanded) as T;
  };


  const collapseAll = async(): Promise<void> => {
    if (!currentSetting.value)
      return;

    await currentSetting.value.collapseAll();

    await refreshSettingDirectoryTree();
  };
 
  // set the parent for a node, cleaning up all associated relationships/records
  // pass a null parent to make it a top node
  // returns whether it was successful
  const setNodeParent = async function(topicFolder: TopicFolder, childId: string, parentId: string | null): Promise<boolean> {
    if (!currentSetting.value)
      return false;

    // Batch hierarchy updates - update the object directly without saving
    const updateHierarchyFromNode = (entryUuid: string, node: DirectoryEntryNode) : void => {
      if (!currentSetting.value)
        return;

      currentSetting.value.hierarchies[entryUuid] = node.convertToHierarchy();
    };

    // topic has to have hierarchy
    if (!hasHierarchy(topicFolder.topic))
      return false;

    // have to have a child
    const child = await Entry.fromUuid(childId);

    if (!child)
      return false;

    const childNode =  DirectoryEntryNode.fromEntryBasicIndex({uuid: child.uuid, name: child.name, type: child.type}, topicFolder);
    const oldParentId = childNode.parentId;

    // make sure it's not already in the right place
    if (parentId===oldParentId)
      return false;

    // get the parent, if any, and create the nodes for simpler syntax 
    const parent = parentId ? await Entry.fromUuid(parentId) : null;
    const parentNode = parent ? DirectoryEntryNode.fromEntryBasicIndex({uuid: parent.uuid, name: parent.name, type: parent.type}, topicFolder) : null;
    
    // make sure they share a topic (if parent isn't null)
    if (parent && child.topic !== parent.topic)
      return false;
     
    // next, confirm it's a valid target (the child must not be in the parent's ancestor list - or we get loops)
    if (parentNode && parentNode.ancestors.includes(childId))
      return false;

    // if the child already has a parent, remove it from that parent's children
    if (childNode.parentId) {
      const oldParent = await Entry.fromUuid(childNode.parentId);

      if (oldParent) {
        const oldParentNode = DirectoryEntryNode.fromEntryBasicIndex({uuid: oldParent.uuid, name: oldParent.name, type: oldParent.type}, topicFolder);
        if (oldParentNode) {
          oldParentNode.children = oldParentNode.children.filter((c)=>c!==childId);
          updateHierarchyFromNode(oldParent.uuid, oldParentNode);
        }
      }
    }

    const originalChildAncestors = childNode.ancestors;  // save this for adjusting all the ancestors later

    if (parent && parentNode) {   
      // add the child to the children list of the parent (if it has a parent)
      parentNode.children = [...parentNode.children, childId];
      updateHierarchyFromNode(parent.uuid, parentNode);

      // set the parent and the ancestors of the child (ancestors = parent + parent's ancestors)
      childNode.parentId = parentId;
      childNode.ancestors = parentNode.ancestors.concat(parentId ? [parentId] : []);
      updateHierarchyFromNode(child.uuid, childNode);
    } else {
      // parent and ancestors are null
      childNode.parentId = null;
      childNode.ancestors = [];
      updateHierarchyFromNode(child.uuid, childNode);
    }

    // recalculate the ancestor lists for all of the descendants of the child
    // first, figure out the differences between the child's old ancestors and the new ones (so we can touch fewer items)
    // we add an extra value to ancestorsToRemove so that we can ensure it's never empty (which will cause the $ne to throw an error)
    const ancestorsToAdd = childNode.ancestors.filter(a => !originalChildAncestors.includes(a));
    const ancestorsToRemove = originalChildAncestors.filter(a => !childNode.ancestors.includes(a));

    // then, update all of the child's descendants ancestor fields with that set of changes
    if (ancestorsToAdd || ancestorsToRemove) {
      // we switch to entries because of all the data retrieval
      const doUpdateOnDescendants = async (entry: Entry): Promise<void> => {
        const hierarchies = currentSetting.value!.hierarchies;
        const children = hierarchies[entry.uuid]?.children || [];

        for (let i=0; i<children?.length; i++) {
          const childEntry = await Entry.fromUuid(children[i]);

          if (!childEntry)
            continue;

          const childNode = DirectoryEntryNode.fromEntryBasicIndex({uuid: childEntry.uuid, name: childEntry.name, type: childEntry.type}, topicFolder);
          childNode.ancestors = childNode.ancestors.filter(a => !ancestorsToRemove.includes(a));
          childNode.ancestors = childNode.ancestors.concat(ancestorsToAdd);

          updateHierarchyFromNode(childEntry.uuid, childNode);

          // now do it's kids
          await doUpdateOnDescendants(childEntry);
        }
      };

      await doUpdateOnDescendants(child);
    }

    // if the child doesn't have a parent, make sure it's in the topNode list
    //    and vice versa
    let topNodes = topicFolder.topNodes || [];

    if (!parentNode && !topNodes.includes(childId)) {
      topNodes = topNodes.concat([childId]);
    } else if (parentNode && topNodes.includes(childId)) {
      topNodes = topNodes.filter((n)=>n!==childId);
    } else {
      topNodes = topicFolder.topNodes || [];
    }
    
    topicFolder.topNodes = topNodes;

    // if we have a valid parent - make sure it's expanded (batch with save below)
    if (parentId && currentSetting.value) {
      currentSetting.value.expandedIds[parentId] = true;
    }

    // Save all hierarchy and expandedIds changes in one batch
    await currentSetting.value.save();
    
    // Save topicFolder separately
    await topicFolder.save();

    // force current entry to refresh if needed
    const needCurrentRefresh = [childId, parentId].includes(currentEntry.value?.uuid || null);

    await refreshSettingDirectoryTree([parentId, oldParentId, childId].filter((id)=>id!==null));

    // wait for the tree to be rebuilt first or we get race conditions with the
    //   status of currentSetting.hierarchies
    if (needCurrentRefresh) {
      refreshCurrentEntry.value = true;      
    }

    return true;
  };


  const createEntry = async (topicFolder: TopicFolder, options: CreateEntryOptions): Promise<Entry | null> => {
    if (!currentSetting.value)
      return null;

    const entry = await Entry.create(topicFolder, options);

    if (entry) {
      const uuid = entry.uuid;

      // we always add a hierarchy, because we use it for filtering
      await currentSetting.value.setEntryHierarchy(uuid, 
        {
          parentId: '',
          ancestors: [],
          children: [],
          type: '',
        } as Hierarchy
      );

      // set parent if specified
      if (options.parentId==undefined) {
        // no parent - set as a top node
        const topNodes = topicFolder.topNodes;
        topicFolder.topNodes = topNodes.concat([uuid]);
        await topicFolder.save();
      } else {
        // add to the tree
        if (hasHierarchy(topicFolder.topic)) {
          // this creates the proper hierarchy
          await setNodeParent(topicFolder, uuid, options.parentId);
        }
      }

      if (options.parentId) {
        await refreshSettingDirectoryTree([options.parentId, entry.uuid]);
      } else {
        await refreshSettingDirectoryTree([entry.uuid]);
      }
    }

    return entry || null;
  };

  /**
   * Creates a Character entry from a dropped Foundry actor.
   * Extracts name, image, and description/biography from the actor,
   * creates a Character entry, links the actor, and returns the entry.
   * 
   * @param actorUuid - The UUID of the actor to create an entry from
   * @returns The created Entry, or null if creation failed
   */
  const createEntryFromActor = async (actorUuid: string): Promise<Entry | null> => {
    if (!currentSetting.value)
      return null;

    // Load the actor
    const actor = await foundry.utils.fromUuid<Actor>(actorUuid);
    if (!actor)
      return null;

    // Get the Character topic folder
    const topicFolder = currentSetting.value.topicFolders[Topics.Character];
    if (!topicFolder)
      return null;

    // Extract actor data
    const name = actor.name;
    const img = actor.img || (actor.prototypeToken as any)?.texture?.src || '';

    // Get description based on system
    let description = '';
    const systemId = game.system.id;
    
    if (systemId === 'dnd5e') {
      // dnd5e uses system.details.biography.value
      description = (actor as any).system?.details?.biography?.value || '';
    } else if (systemId === 'pf2e') {
      // pf2e uses system.details.biography.value or system.description.value
      description = (actor as any).system?.details?.biography?.value 
        || (actor as any).system?.description?.value 
        || '';
    } else {
      // Try common biography/description patterns for other systems
      description = (actor as any).system?.details?.biography?.value 
        || (actor as any).system?.biography?.value 
        || (actor as any).system?.description?.value 
        || '';
    }

    // Create the entry using createEntry (handles hierarchy, top nodes, tree refresh)
    const entry = await createEntry(topicFolder, { name });

    if (!entry)
      return null;

    // Set the image and description
    entry.img = img;
    entry.description = description;

    // Link the actor
    entry.actors = [actorUuid];

    // Save the entry
    await entry.save();

    return entry;
  };

  /**
   * Deletes a setting identified by the given settingId.
   * This includes deleting all associated compendia and the setting folder itself.
   * After deletion, the directory tree is refreshed.
   * 
   * @param settingId - The UUID of the setting to be deleted.
   * @param external if true, the entry is being deleted from outside the app (e.g. Foundry); does cleanup but not doc delete
   * 
   * @returns A promise that resolves when the setting and its compendia are deleted.
   */
  const deleteSetting = async (settingId: string, external = false): Promise<Boolean> => {
    let setting = await GlobalSettingService.getGlobalSetting(settingId);

    if (!setting)
      return false;

    // confirm
    if (!external && !(await FCBDialog.confirmDialog(localize('dialogs.deleteSetting.title'), localize('dialogs.deleteSetting.message'))))
      return false;
    
    await setting.delete(external);

    // pick another setting
    setting = await getCurrentSetting();
    if (setting) {
      await mainStore.setNewSetting(setting.uuid);
    } else {
      // close all tabs and bookmarks (if we're changing settings they'll reset automatically)
      await navigationStore.clearTabsAndBookmarks();
      await mainStore.setNewSetting(null);
    }

    await refreshSettingDirectoryTree();

    return true;
  };
  /**
   * Deletes a entry from the setting and handles all cleanup.
   * 
   * @param entryId the UUID of the entry to delete
   * @param external if true, the entry is being deleted from outside the app (e.g. Foundry); does cleanup but not doc delete
   * 
   * @returns false if delete was cancelled, true otherwise
   */
  // delete an entry from the setting
  const deleteEntry = async (entryId: string, external = false): Promise<boolean> => {
    if (!currentSetting.value)
      return false;

    // confirm
    if (!external && !(await FCBDialog.confirmDialog(localize('dialogs.deleteEntry.title'), localize('dialogs.deleteEntry.message'))))
      return false;

    // save the parent
    const parentId = currentSetting.value.getEntryHierarchy(entryId)?.parentId || null;

    const entry = await Entry.fromUuid(entryId);
    if (!entry)
      return false;

    await entry.delete(external);

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(entryId);

    // refresh and force its parent to update
    await refreshSettingDirectoryTree(parentId ? [parentId] : []);

    return true;
  };
 
  // refreshes the directory tree 
  // we try to keep it fast by not reloading from disk nodes that we've already loaded before,
  //    but that means that when names change or children change, we're not refreshing them properly
  // so updateEntryIds specifies an array of ids for nodes (entry, not pack) that just changed - this forces a reload of that entry and all its children
  const refreshSettingDirectoryTree = async (updateEntryIds?: string[]): Promise<void> => {
    // Prevent concurrent refreshes
    if (isSettingTreeRefreshing.value) {
      return;
    }

    // need to have a current setting and journals loaded
    if (!currentSetting.value) {
      // empty it out
      currentSettingTree.value = [];
      return;
    }

    isSettingTreeRefreshing.value = true;

    // Preserve scroll position before refresh
    let scrollContainer: HTMLElement | null = document.querySelector('.fcb-setting-directory') as HTMLElement;
    const originalScrollTop = scrollContainer?.scrollTop || 0;

    // populate the setting names, and find the current one
    const allSettings = ModuleSettings.get(SettingKey.settingIndex) || [];
    // Update the reactive setting list for the dropdown
    settingIndexList.value = [...allSettings];
    
    const currentSettingIndex = allSettings.find((s)=>s.settingId===currentSetting.value?.settingId);

    if (!currentSettingIndex) {
      currentSettingTree.value = [];
      return;
    }
    
    const currentSettingBlock = {
      name: currentSettingIndex.name,
      id: currentSettingIndex.settingId,
      topicNodes: []
    } as DirectorySetting;

    // find the record for the current setting and set the entries for each topic
    // make sure the folders have been loaded
    const topicFolders = currentSetting.value.topicFolders;
    const expandedNodes = currentSetting.value.expandedIds;

    const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[];
    currentSettingBlock.topicNodes = topics.map((topic: ValidTopic): DirectoryTopicFolderNode => {
      const id = `${(currentSetting.value as FCBSetting).uuid}.topic.${topic}`;
      const topicObj = topicFolders[topic] as TopicFolder;

      return new DirectoryTopicFolderNode(
        id,
        getTopicTextPlural(topic),
        topicObj,
        topicObj.topNodes.concat(),
        [],
        [],
        expandedNodes[id] || false,
      );
    }).sort((a: DirectoryTopicFolderNode, b: DirectoryTopicFolderNode): number => a.topicFolder.topic - b.topicFolder.topic);

    // load the children for any open topics
    for (let i=0; i<currentSettingBlock?.topicNodes.length; i++) {
      const DirectoryTopicFolderNode = currentSettingBlock.topicNodes[i];

      if (!DirectoryTopicFolderNode.expanded)
        continue;

      // have to check all children are loaded and expanded properly
      await DirectoryTopicFolderNode.recursivelyLoadNode(expandedNodes, updateEntryIds);

      // load the type-grouped entries
      await DirectoryTopicFolderNode.loadTypeEntries(topicFolders[DirectoryTopicFolderNode.topicFolder.topic]!.types, expandedNodes);
    }

    // @ts-ignore (fvtt circularity issue)
    currentSettingTree.value = [currentSettingBlock];

    // make sure the node list is up to date
    await updateFilterNodes();

    isSettingTreeRefreshing.value = false;

    // Wait for next tick to ensure DOM is updated
    await nextTick();

    // Perform scroll restoration once after DOM updates
    // We get the container again because it was unmounted and remounted
    scrollContainer = document.querySelector<HTMLElement>('.fcb-setting-directory');
    if (scrollContainer && originalScrollTop) {
      scrollContainer.scrollTop = originalScrollTop;
    }
  };

  const getTopicNodeContextMenuItems = (topic: ValidTopic, entryId: string): MenuItem[] => {
    if (!topic || !currentSetting.value)
      throw new Error('Invalid topic in getTopicNodeContextMenuItems()');

    const items = [] as MenuItem[];

    if (hasHierarchy(topic)) {
      items.push({ 
        icon: 'fa-atlas',
        iconFontClass: 'fas',
        label: localize(`contextMenus.topicFolder.create.${topic}`) + ' as child',
        onClick: async () => {
          const entry = await FCBDialog.createEntryDialog(topic, { parentId: entryId, generateMode: true } );

          if (entry) {
            await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, });
          }
        }
      });
    }

    items.push({
      icon: 'fa-trash',
      iconFontClass: 'fas',
      label: localize('contextMenus.directoryEntry.delete'),
      onClick: async () => {
        await deleteEntry(entryId);
      }
    });

    // Add story web options if a story web is active
    items.push({
      icon: 'fa-diagram-project',
      iconFontClass: 'fas',
      label: localize('contextMenus.addToStoryWeb'),
      disabled: !currentStoryWeb.value,
      onClick: async () => {
        await storyWebStore.addEntry(entryId, null, false);
      }
    });
    items.push({
      icon: 'fa-sitemap',
      iconFontClass: 'fas',
      label: localize('contextMenus.addWithRelationships'),
      disabled: !currentStoryWeb.value,
      onClick: async () => {
        await storyWebStore.addEntry(entryId, null, true);
      }
    });

    return items;
  }

  const getGroupedTypeNodeContextMenuItems = (topic: ValidTopic, type: string): MenuItem[] => {
    if (!topic || !type ||!currentSetting.value)
      throw new Error('Invalid topic in getGroupedTypeNodeContextMenuItems()');

    return [{ 
      icon: 'fa-atlas',
      iconFontClass: 'fas',
      label: `${localize('contextMenus.typeFolder.create')} ${type}`, 
      onClick: async () => {
        // get the right topic
        if (!currentSetting.value)
        return;

        const entry = await FCBDialog.createEntryDialog(topic, { type: type, generateMode: true } );

        if (entry) {
          await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
        }
      }
    }];
  }

  const getTopicContextMenuItems = (topicFolder: TopicFolder): MenuItem[] => {
    return [{ 
      icon: 'fa-atlas',
      iconFontClass: 'fas',
      label: localize(`contextMenus.topicFolder.create.${topicFolder.topic}`), 
      onClick: async () => {
        if (!topicFolder)
          throw new Error('Invalid header in Directory.onTopicContextMenu.onClick');

        if (topicFolder.topic===Topics.PC) {
          // TODO-PC - just get the player name and create

          const entry = await createEntry(topicFolder, {});
            
          if (entry) {
            await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, });
          }
        } else {
          const entry = await FCBDialog.createEntryDialog(topicFolder.topic, { generateMode: true } );

          if (entry) {
            await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
          }
        }
      }
    }];
}

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  // populates filterNodes with a list of all the nodes that should be shown in the current tree
  // this includes: all nodes matching the filterText, all of their ancestors, and
  //    all of their types 
  // it's an object keyed by topic with a list of all the ids to include
  const updateFilterNodes = () => {
    if (!currentSetting.value)
      return;

    const retval: ValidTopicRecord<string[]> = {};

    // note this is safe only because setting doesn't get updated during the loop below
    const hierarchies = currentSetting.value.hierarchies;

    const regex = new RegExp( filterText.value, 'iu');  // do case insensitive search
    const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[];

    for (let i=0; i<topics.length; i++) {
      const topic = topics[i];
      const topicObj = currentSetting.value.topicFolders[topic];

      if (!topicObj)
        continue;

      // filter on name and type
      const matchedEntryObjects = topicObj.entryIndex.filter((e: EntryBasicIndex) =>( filterText.value === '' || regex.test( e.name || '' ) || regex.test( e.type || '' )));
    
      let allItemsToShow: string[] = [];

      // add the ancestors and types;
      for (const entry of matchedEntryObjects) {
        allItemsToShow.push(entry.uuid);

        // type filter IDs must match DirectoryTypeNode.id, which is built as
        //   `${topicId}:${typeName}` where topicId is the DirectoryTopicFolderNode id.
        // DirectoryTopicFolderNode ids are built in refreshSettingDirectoryTree as
        //   `${currentSetting.uuid}.topic.${topic}`.
        const topicId = `${currentSetting.value.uuid}.topic.${topic}`;
        const typeName = entry.type || NO_TYPE_STRING;
        const typeNodeId = `${topicId}:${typeName}`;
        allItemsToShow.push(typeNodeId);

        const hierarchy = hierarchies[entry.uuid];
        if (hierarchy && hierarchy.ancestors) {
          allItemsToShow = allItemsToShow.concat(hierarchy.ancestors);
        }
      }
  
      // eliminate duplicates
      retval[topics[i]] = [...new Set(allItemsToShow)];
    }

    filterNodes.value = retval;
  };

  
  ///////////////////////////////
  // watchers
  // when the root folder changes, load the top level info (settings and packs)
  // when the setting changes, clean out the cache of loaded items
  //@ts-ignore - Vue can't handle reactive classes
  watch(currentSetting, async (newSetting: FCBSetting | null, oldSetting: FCBSetting | null): Promise<void> => {
    if (!newSetting) {
      return;
    }

    // Only refresh if the setting actually changed (not just a reactive update)
        if (newSetting.uuid !== oldSetting?.uuid) {
      await refreshSettingDirectoryTree();
    }
  });
  
  // when the current journal set is updated, refresh the tree
  // watch(currentTopicJournals, async (_newJournals: ValidTopicRecord<JournalEntry> | null): Promise<void> => {
  //   await refreshSettingDirectoryTree();
  // });
  
  // save grouping to settings
  watch(isGroupedByType, async (newSetting: boolean) => {
    isGroupedByType.value = newSetting;
    await ModuleSettings.set(SettingKey.groupTreeByType, isGroupedByType.value);
    
    // Scroll to the active entry since the tree structure has changed
    await DirectoryScrollService.scrollToActiveEntry();
  });

  // update the filter when text changes
  watch(filterText, async () => {
    await updateFilterNodes();
  });
  
  ///////////////////////////////
  // lifecycle events
  onMounted(() => {
    isGroupedByType.value = ModuleSettings.get(SettingKey.groupTreeByType);
    // Initialize the setting list
    settingIndexList.value = ModuleSettings.get(SettingKey.settingIndex) || [];
  });

  ///////////////////////////////
  // return the public interface
  return {
    currentSettingTree,
    settingIndexList,
    isSettingTreeRefreshing,
    isGroupedByType,
    filterText,
    filterNodes,

    toggleTopic,
    toggleWithLoad,
    collapseAll,
    setNodeParent,
    refreshSettingDirectoryTree,
    updateEntryType,
    deleteSetting,
    createSetting,
    createEntry,
    createEntryFromActor,
    deleteEntry,
    getTopicNodeContextMenuItems,
    getGroupedTypeNodeContextMenuItems,
    getTopicContextMenuItems,
  };
};