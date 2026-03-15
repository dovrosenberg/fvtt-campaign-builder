// types and functions used to manage topic hierarchies
export interface Hierarchy {
  parentId: string | null;   // id of parent
  locationParentId: string | null;   // for branches: uuid of the location this branch is in
  ancestors: string[];    // ids of all ancestors
  children: string[];    // ids of all direct children
  childBranches: string[];    // uuids of branches for this org or location
  type: string;    // the type of the entry
}
