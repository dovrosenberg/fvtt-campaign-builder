import { Topic } from '.'

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
  expanded: boolean,
}

export type DirectoryWorld = {
  id: string,
  name: string,
  packs: DirectoryPack[],
}
