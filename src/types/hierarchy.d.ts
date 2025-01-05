// types and functions used to manage topic hierarchies
export type Hierarchy = {
  parentId: string | null;   // id of parent
  ancestors: string[];    // ids of all ancestors
  children: string[];    // ids of all direct children
  type: string;    // the type of the entry
}
