export type * from './directory.d.ts';
export type * from './tables.d.ts';
export type * from './relationships.d.ts';
export type * from './hierarchy.d.ts';
export type * from './global.d.ts';
export type * from './species.d.ts';
export type * from './dialogs.d.ts';
export type * from './flexsearch.d.ts';
export type * from './tags.d.ts';

// @ts-ignore - need to pull enum
export * from './generators.ts';

// used to determine which component to display in the tab
export enum WindowTabType  {
  NewTab,
  Entry,
  Campaign,
  Session,
  PC,
  World,
}

export type WindowTabHistory = {
  contentId: string | null;   // the uuid of the entry, campaign, etc.
  tabType: WindowTabType;
  contentTab: string | null;  // the current content tab (subtab) that was active
}

export type Bookmark = {
  id: string;   // id of the bookmark
  tabInfo: WindowTabHistory;
  header: TabHeader;
}

export type TabHeader = {
  /** uuid of the entity being displayed */
  uuid: string | null;   

  /** name to display in header */
  name: string;

  /** class of icon to display in the header */
  icon: string; 
}

export type TabSummary = {
  uuid: string;   
  name: string;
}

// this oder is also the order that they get sorted in
export enum Topics {
  None = 0,
  Character = 1,
  Location = 2,
  Organization = 3,
  Event = 4,
}

// topics except None
export type ValidTopic = Exclude<Topics, Topics.None>;

// content tabs that are document links not other entries
export enum DocumentLinkType {
  None,
  Scenes,
  Actors,
  Items,
}

// relationships
export type TreeNode = {
  text: string;   // the label
  value: string;   // a value to be passed up when clicked (ex. a uuid)
  children: TreeNode[];   // the children, if any
  expanded?: boolean;   // is it expanded
}

// session display mode in directory
export enum SessionDisplayMode {
  Number = 'number',
  Date = 'date',
  Name = 'name'
}
