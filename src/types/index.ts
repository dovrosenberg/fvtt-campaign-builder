import { DOCUMENT_TYPES } from '@/documents/types.js';

export type * from './directory.d.ts';
export * from './tables';
export * from './documentGroups';
export type * from './hierarchy.d.ts';
export type * from './global.d.ts';
export type * from './species.d.ts';
export type * from './dialogs.d.ts';
export type * from './search.d.ts';
export type * from './tags.d.ts';
export type * from './dragDrop.ts';
export type * from './documentIndices.ts';
export type * from './relationships.d.ts';
export * from './tabVisibility';
export * from './timeline';
export * from './calendar';

// New centralized type files - import first for use in backward compatibility aliases
export * from './dbTypes';
export * from './rowTypes';

// @ts-ignore - need to pull enum
export * from './generators.ts';
export type * from './generators.ts';

// @ts-ignore - need to pull enum
export * from './customFields.ts';
export type * from './customFields.ts';

export * from '@/documents/fields/StoryWebEdge';
export * from '@/documents/fields/StoryWebNode';

// get all the ones defined in the schemas
export type * from '@/documents/fields/index.ts';

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export enum WindowTabType  {
  NewTab,
  Entry,
  Campaign,
  Session,
  Setting,
  Front,
  Arc,
  StoryWeb,
  TagResults,
}

export interface WindowTabHistory {
  contentId: string | null;   // the uuid of the entry, campaign, etc.
  tabType: WindowTabType;
  contentTab: string | null;  // the current content tab (subtab) that was active
}

export interface Bookmark {
  id: string;   // id of the bookmark
  tabInfo: WindowTabHistory;
  header: TabHeader;
}

export interface TabHeader {
  /** uuid of the entity being displayed */
  uuid: string | null;   

  /** name to display in header */
  name: string;

  /** class of icon to display in the header */
  icon: string; 
}

export interface TabSummary {
  uuid: string;   
  name: string;
}

// this order is also the order that they get sorted in
export enum Topics {
  None = 0,
  Character = 1,
  Location = 2,
  Organization = 3,
  PC = 4,
  // Event = 5, // Commented out for now
}

// topics except None
export type ValidTopic = Exclude<Topics, Topics.None>;

// this  is a common structure
export type ValidTopicRecord<T> = Partial<Record<ValidTopic, T>>;

// content tabs that are document links not other entries
export enum DocumentLinkType {
  None,
  Scenes,
  Actors,
  Items,
  Journals,
  GenericFoundry,
}

// relationships
export interface TreeNode {
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

export enum RelatedEntryDialogModes {
  Add = 'add',
  Edit = 'edit',
  Session = 'session', // for adding to sessions
  ArcLocation = 'arcLocation',  // for adding locations to arcs
}

export enum ToDoTypes {
  Manual = 'manual',
  Entry = 'entry',
  Lore = 'lore',
  Vignette = 'vignette',
  Monster = 'monster',
  Item = 'item',
  GeneratedName = 'generatedName'  // generated name
}

export interface BaseTableGridRow extends Record<string, any> { 
  uuid: string; 
}

export interface SettingIndex {
  settingId: string;
  name: string;
  packId: string;
}

/** This is the format of how our entries are stored in the topic folder */
export interface EntryBasicIndex { 
  uuid: string;
  name: string; 
  type: string; 
};

export interface TopicBasicIndex { 
  topic: ValidTopic; 
  types: string[]; 
  topNodes: string[]; 
  entries: EntryBasicIndex[];
};

/** This is the format of how our sessions are stored in campaigns */
export interface SessionBasicIndex { 
  uuid: string;
  name: string; 
  number: number; 

  /** ISO string */
  date: string | null;
}


/** Index of an arc for in-memory storage */
export interface ArcBasicIndex {
  uuid: string;
  name: string;
  startSessionNumber: number;
  endSessionNumber: number;
  sortOrder: number;
}

/** Index of a campaign for in-memory storage */
export interface CampaignBasicIndex {
  uuid: string;
  name: string;
  completed: boolean;
  arcs: ArcBasicIndex[];
}

export type ValidDocType = 
  typeof DOCUMENT_TYPES.Setting | 
  typeof DOCUMENT_TYPES.Campaign | 
  typeof DOCUMENT_TYPES.Entry | 
  typeof DOCUMENT_TYPES.Session |
  typeof DOCUMENT_TYPES.Front |
  typeof DOCUMENT_TYPES.Arc |
  typeof DOCUMENT_TYPES.StoryWeb;

export interface ContentTabDescriptor {
  id: string;
  label: string;
  deletable?: boolean;
}
  
