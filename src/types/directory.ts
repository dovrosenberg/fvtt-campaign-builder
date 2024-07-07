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
