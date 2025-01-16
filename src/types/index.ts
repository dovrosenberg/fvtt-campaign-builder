export type * from './directory.d.ts';
export type * from './tables.d.ts';
export type * from './relationships.d.ts';
export type * from './hierarchy.d.ts';
export type * from './global.d.ts';

// used to determine which component to display in the tab
export enum WindowTabType  {
  NewTab,
  Entry,
  Campaign,
  Session,
  PC,
}

export type WindowTabHistory = {
  contentId: string | null;
  tabType: WindowTabType;
}

export type Bookmark = {
  id: string;   // id of the bookmark
  tabInfo: WindowTabHistory;
  header: TabHeader;
}

export type TabHeader = {
  uuid: string | null;   
  name: string;
  icon: string;  // class of icon to display
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
}

// relationships
export type TreeNode = {
  text: string;   // the label
  value: string;   // a value to be passed up when clicked (ex. a uuid)
  children: TreeNode[];   // the children, if any
  expanded?: boolean;   // is it expanded
}
