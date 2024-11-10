import { ValidTopic } from '.';

// a type "group"
export type DirectoryTypeNode = {
  id: string;   // id is the pack id plus the string type
  name: string;
  loadedChildren: DirectoryTypeEntryNode[];
  expanded: boolean;    // is the node expanded 
}

// represents an entry in the type-grouped structure
export type DirectoryTypeEntryNode = {
  id: string;   // id is the pack id plus the string type
  name: string;
}

// an entry (which might have children) in the tree structure
export type DirectoryEntryNode = {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];    // ids of all children (which might not be loaded)
  ancestors: string[];    // ids of all ancestors
  loadedChildren: DirectoryEntryNode[];
  expanded: boolean;    // is the node expanded 
  type: string;    // the type of the entry
}

export type DirectoryTopicNode = {
  id: string;
  name: string;
  topic: ValidTopic;
  loadedTopNodes: DirectoryEntryNode[];
  topNodes: string[];  // ids of all the top items
  loadedTypes: DirectoryTypeNode[];
  expanded: boolean;
}

export type DirectoryWorld = {
  id: string;   // the world folder ID
  name: string;
  topics: DirectoryTopicNode[];
}
