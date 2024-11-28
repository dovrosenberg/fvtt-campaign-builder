export type * from './directory.d.ts';
export type * from './tables.d.ts';
export type * from './relationships.d.ts';
export type * from './global.d.ts';

// used to determine which component to display in the tab
export enum WindowTabType  {
  Entry,
  Campaign,
  Session,
}

export type WindowTab = {
  id: string;   // unique id
  active: boolean;   // is this the currently active tab
  history: string[];    // array of the history of entryIds shown in this tab (for the forward/back arrows) 
  historyIdx: number;   // index of current history point
  tabType: WindowTabType;   // the type of tab
  header: TabHeader;  // reference to journal entry  -- leaving open possibility of expanding this type in the future
}

export type Bookmark = {
  id: string;   // id of the bookmark
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
export enum Topic {
  None = 0,
  Character = 1,
  Location = 2,
  Organization = 3,
  Event = 4,
}

// topics except None
export type ValidTopic = Exclude<Topic, Topic.None>;

// relationships
export type TreeNode = {
  text: string;   // the label
  value: string;   // a value to be passed up when clicked (ex. a uuid)
  children: TreeNode[];   // the children, if any
  expanded?: boolean;   // is it expanded
}
