import { ValidTopic } from '@/types';

export enum FCBDragTypes {
  Entry = 'fcb-entry',
  StoryWeb = 'fcb-storyWeb',
  Setting = 'fcb-setting',
  Front = 'fcb-front',
  Campaign = 'fcb-campaign',
  Arc = 'fcb-arc',
  Session = 'fcb-session',
  Bookmark = 'fcb-bookmark',
  Tab = 'fcb-tab',
}

export interface EntryNodeDragData {
  type: FCBDragTypes.Entry;
  childId: string;
  name: string;
  typeName: string;
  topic: ValidTopic;
};

export interface StoryWebNodeDragData {
  type: FCBDragTypes.StoryWeb;
  storyWebId: string;
  name: string;
};

export interface SettingNodeDragData {
  type: FCBDragTypes.Setting;
  settingId: string;
  name: string;
};

export interface FrontNodeDragData {
  type: FCBDragTypes.Front;
  frontId: string;
  name: string;
};

export interface CampaignNodeDragData {
  type: FCBDragTypes.Campaign;
  campaignId: string;
  name: string;
};

export interface ArcNodeDragData {
  type: FCBDragTypes.Arc;
  arcId: string;
  name: string;
};

export interface SessionNodeDragData {
  type: FCBDragTypes.Session;
  sessionId: string;
  name: string;
};

export interface BookmarkDragDropData {
  type: FCBDragTypes.Bookmark;
  bookmarkId: string;
}

export interface TabDragData {
  type: FCBDragTypes.Tab;
  tabId: string;
}

export type NodeDragDropData = 
  | EntryNodeDragData 
  | CampaignNodeDragData 
  | ArcNodeDragData
  | SessionNodeDragData 
  | SettingNodeDragData
  | FrontNodeDragData
  | StoryWebNodeDragData
  ;

export type FoundryDragType = {
  type: string;
  uuid: string;
}

export type KnownDragTypes = 
  FoundryDragType | 
  { type: 'JournalEntry'; fcbData: NodeDragDropData } |
  BookmarkDragDropData |
  TabDragData;

