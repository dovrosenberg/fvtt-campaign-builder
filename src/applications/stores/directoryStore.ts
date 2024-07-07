// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { ref, toRaw, watch } from 'vue';

// local imports
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { useMainStore } from './mainStore';

// types
export type DirectoryNode = {
  id: string,
  name: string,
  children: string[],    // ids of all children (which might not be loaded)
  loadedChildren: DirectoryNode[],
  expanded: boolean,    // is the node expanded 
}

export type DirectoryPack = {
  pack: CompendiumCollection<any>,
  id: string,
  name: string,
  loadedTopNodes: DirectoryNode[],
  topNodes: string[],
  expanded: boolean,
}

export type DirectoryWorld = {
  id: string,
  name: string,
  packs: DirectoryPack[],
}

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
  const toggleNode = async(pack: CompendiumCollection<any>, node: DirectoryNode) : Promise<void>=> {
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
 
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _loadNode = async(id: string): Promise<DirectoryNode | null> => {
    const entry = await fromUuid(id);

    if (!entry)
      return null;
    else {
      const newNode = {
        id: id,
        name: entry.name || '<Blank>',
        children: EntryFlags.get(entry as JournalEntry, EntryFlagKey.hierarchy)?.children || [],
        loadedChildren: [],
        expanded: false,
      };

      _loadedNodes[newNode.id] = newNode;

      return newNode;
    }
  };

  ///////////////////////////////
  // watchers
  // when the root folder changes, load the top level info (worlds and packs)
  watch(rootFolder, (newRootFolder: Folder | null): void => {
    if (!newRootFolder) {
      currentTree.value = [];
      return;
    }

    currentTree.value = (toRaw(rootFolder.value) as Folder)?.children?.map((world):DirectoryWorld => ({
      name: world.folder.name as string,
      id: world.folder.uuid as string,
      packs: world.entries.map((compendium): DirectoryPack =>({
        pack: compendium,
        id: compendium.metadata.id,
        name: compendium.metadata.label,
        topNodes: compendium.tree?.entries?.map((entry): string=> entry.uuid) || [],
        loadedTopNodes: [],
        // TODO - store and retrieve expanded status
        expanded: false,   //        !expandedCompendia.value[compendium.metadata.id],
      })),
    })) || [];
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
  };
});