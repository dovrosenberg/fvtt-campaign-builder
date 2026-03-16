import { ValidTopic } from '@/types';
import DragDropService from '@/utils/dragDrop'

export interface EntryNodeDragData {
  type: DragDropService.FCBDragTypes.Entry;
  childId: string;
  name: string;
  typeName: string;
  topic: ValidTopic;
  isBranch?: boolean;
};

export interface StoryWebNodeDragData {
  type: DragDropService.FCBDragTypes.StoryWeb;
  storyWebId: string;
  name: string;
};

export interface SettingNodeDragData {
  type: DragDropService.FCBDragTypes.Setting;
  settingId: string;
  name: string;
};

export interface FrontNodeDragData {
  type: DragDropService.FCBDragTypes.Front;
  frontId: string;
  name: string;
};

export interface CampaignNodeDragData {
  type: DragDropService.FCBDragTypes.Campaign;
  campaignId: string;
  name: string;
};

export interface ArcNodeDragData {
  type: DragDropService.FCBDragTypes.Arc;
  arcId: string;
  name: string;
};

export interface SessionNodeDragData {
  type: DragDropService.FCBDragTypes.Session;
  sessionId: string;
  name: string;
};

export interface BookmarkDragDropData {
  type: DragDropService.FCBDragTypes.Bookmark;
  bookmarkId: string;
}

export interface TabDragData {
  type: DragDropService.FCBDragTypes.Tab;
  tabId: string;
  panelIndex: number;
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
  anchor?: { slug: string; name: string };
}

export type FCBDragType<T extends NodeDragDropData> = {
  type: 'JournalEntry';
  uuid: string;
  fcbData: T;
}

export type KnownDragTypes = 
  FoundryDragType | 
  FCBDragType<NodeDragDropData> |
  BookmarkDragDropData |
  TabDragData;

