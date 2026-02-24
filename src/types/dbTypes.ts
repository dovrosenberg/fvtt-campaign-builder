import { ToDoTypes } from '@/types';

// Database storage types for Arc-related content
// Note: No base types - each type explicitly declares all fields for clarity

export interface ArcLocation {
  uuid: string;
  notes: string;
  groupId: string | null;
}

export interface ArcParticipant {
  uuid: string;
  notes: string;
  groupId: string | null;
}

export interface ArcMonster {
  uuid: string;
  notes: string;
  groupId: string | null;
}

export interface ArcVignette {
  uuid: string;
  description: string;
  groupId: string | null;
}

export interface ArcLore {
  uuid: string;
  description: string;
  groupId: string | null;
  journalEntryPageId: string | null;  // TODO: remove once 1.8.6 migration isn't needed
}

export interface ArcIdea {
  uuid: string;
  text: string;
  groupId: string | null;
}

export interface ArcJournal {
  uuid: string;  // composite key journalUuid|pageUuid|anchor-slug
  journalUuid: string;
  pageUuid: string | null;
  anchor: { slug: string; name: string; } | null;
  packId: string | null;
  packName: string | null;
  groupId: string | null;
}

// Database storage types for Session-related content
// Note: No base types - each type explicitly declares all fields for clarity

export interface SessionLocation {
  uuid: string;
  delivered: boolean;
  notes: string;
  groupId: string | null;
}

export interface SessionItem {
  uuid: string;
  delivered: boolean;
  notes: string;
  groupId: string | null;
}

export interface SessionNPC {
  uuid: string;
  delivered: boolean;
  notes: string;
  groupId: string | null;
}

export interface SessionMonster {
  uuid: string;
  delivered: boolean;
  number: number;
  notes: string;
  groupId: string | null;
}

export interface SessionVignette {
  uuid: string;
  delivered: boolean;
  description: string;
  groupId: string | null;
}

export interface SessionLore {
  uuid: string;
  delivered: boolean;
  significant: boolean;
  description: string;
  groupId: string | null;
  journalEntryPageId: string | null;  // TODO: remove once 1.8.6 migration isn't needed
}

export interface SessionJournal {
  uuid: string;  // composite key journalUuid|pageUuid|anchor-slug
  journalUuid: string;
  pageUuid: string | null;
  anchor: { slug: string; name: string; } | null;
  packId: string | null;
  packName: string | null;
  groupId: string | null;
}

// Database storage types for Campaign-related content

export interface CampaignLore {
  uuid: string;
  delivered: boolean;
  significant: boolean;
  description: string;
  // groupId: string | null;
  lockedToSessionId: string | null;
  lockedToSessionName: string | null;
}

export interface CampaignToDo {
  uuid: string;
  lastTouched: string | null;
  manuallyUpdated: boolean;
  linkedUuid: string | null;
  linkedText: string | null;
  sessionUuid: string | null;
  groupId: string | null;
  text: string;
  type: ToDoTypes;
}

export interface CampaignIdea {
  uuid: string;
  text: string;
  groupId: string | null;
}

export interface CampaignPC {
  uuid: string;
  type: string;
  actorId: string | null;
  groupId: string | null;
}

export interface CampaignJournal {
  uuid: string;  // composite key journalUuid|pageUuid|anchor-slug
  journalUuid: string;
  pageUuid: string | null;
  anchor: { slug: string; name: string; } | null;
  packId: string | null;
  packName: string | null;
  groupId: string | null;
}

// Database storage types for Entry Relationships

export interface EntryJournal {
  uuid: string;  // composite key journalUuid|pageUuid|anchor-slug
  journalUuid: string;
  pageUuid: string | null;
  anchor: { slug: string; name: string; } | null;
  packId: string | null;   // uuid of the parent compendium (null if it's a world entry)
  packName: string | null;
  groupId: string | null;
}
