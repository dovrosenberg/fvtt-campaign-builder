import { Topic } from '.';

// a type "group"
export type DirectoryTypeNode = {
  id: string,   // id is the pack id plus the string type
  name: string,
  loadedChildren: DirectoryEntryNode[],
  expanded: boolean,    // is the node expanded 
}

// represents an entry in the type-grouped structure
export type DirectoryEntryNode = {
  id: string,   // id is the pack id plus the string type
  name: string,
}

// an entry (which might have children) in the tree structure
export type DirectoryNode = {
  id: string,
  name: string,
  parentId: string | null,
  children: string[],    // ids of all children (which might not be loaded)
  ancestors: string[],    // ids of all ancestors
  loadedChildren: DirectoryNode[],
  expanded: boolean,    // is the node expanded 
}

export type DirectoryPack = {
  pack: CompendiumCollection<any>,
  id: string,
  name: string,
  topic: Topic,
  loadedTopNodes: DirectoryNode[],
  topNodes: string[],
  loadedTypes: DirectoryTypeNode[],
  expanded: boolean,
}

export type DirectoryWorld = {
  id: string,
  name: string,
  packs: DirectoryPack[],
}
