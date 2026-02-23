import { ToDoTypes } from '@/types';
import { BaseRow, GroupedTableGridRow } from './tables';

// UI table row types for Arc-related content
// Each row type corresponds to a database type, with additional display fields

export interface ArcLocationRow extends GroupedTableGridRow {
  name: string;           // display field - from linked Entry
  type: string;           // display field - from linked Entry
  parent: string;         // display field - from linked Entry's parent
  parentId: string | null; // display field - from linked Entry's parent
  notes: string;
}

export interface ArcParticipantRow extends GroupedTableGridRow {
  name: string;           // display field - from linked Entry
  type: string;           // display field - from linked Entry
  notes: string;
}

export interface ArcMonsterRow extends GroupedTableGridRow {
  name: string;           // display field - from linked Actor
  notes: string;
}

export interface ArcVignetteRow extends GroupedTableGridRow {
  description: string;
}

export interface ArcLoreRow extends GroupedTableGridRow {
  description: string;
  onClick?: (event: MouseEvent, uuid: string) => void | Promise<void>;  // UI handler
}

export interface ArcIdeaRow extends GroupedTableGridRow {
  text: string;
}

export interface ArcJournalRow extends GroupedTableGridRow {
  journalName: string;    // display field - from linked Journal
  pageName: string;       // display field - from linked Page + anchor
  journalUuid: string;
  pageUuid: string | null;
  anchor: string;
  location: string;       // display field - "World" or "Compendium: {name}"
}

// UI table row types for Session-related content
// Each row type corresponds to a database type, with additional display fields

export interface SessionLocationRow extends GroupedTableGridRow {
  name: string;           // display field - from linked Entry
  type: string;           // display field - from linked Entry
  parent: string;         // display field - from linked Entry's parent
  parentId: string | null; // display field - from linked Entry's parent
  notes: string;
  delivered: boolean;
}

export interface SessionNPCRow extends GroupedTableGridRow {
  name: string;           // display field - from linked Entry
  type: string;           // display field - from linked Entry
  notes: string;
  delivered: boolean;
}

export interface SessionItemRow extends GroupedTableGridRow {
  name: string;           // display field - from linked Item document
  delivered: boolean;
  notes: string;
  dragTooltip?: string;   // UI-only field
}

export interface SessionMonsterRow extends GroupedTableGridRow {
  name: string;           // display field - from linked Actor
  number: number;
  delivered: boolean;
  notes: string;
  dragTooltip?: string;   // UI-only field
}

export interface SessionVignetteRow extends GroupedTableGridRow {
  description: string;
  delivered: boolean;
}

export interface SessionLoreRow extends GroupedTableGridRow {
  delivered: boolean;
  description: string;
  significant: boolean;
  onClick?: (event: MouseEvent, uuid: string) => void | Promise<void>;  // UI handler
}

export interface SessionJournalRow extends GroupedTableGridRow {
  journalName: string;    // display field - from linked Journal
  pageName: string;       // display field - from linked Page + anchor
  journalUuid: string;
  pageUuid: string | null;
  anchor: string;
  location: string;       // display field - "World" or "Compendium: {name}"
}

// UI table row types for Campaign-related content

export interface CampaignLoreRow extends GroupedTableGridRow {
  delivered: boolean;
  description: string;
  significant: boolean;
  onClick?: (event: MouseEvent, uuid: string) => void | Promise<void>;  // UI handler
  lockedToSessionId: string | null;
  lockedToSessionName: string | null;
}

export interface CampaignToDoRow extends GroupedTableGridRow {
  lastTouched: string | null;
  manuallyUpdated: boolean;
  linkedUuid: string | null;
  linkedText: string | null;
  sessionUuid: string | null;
  text: string;
  type: ToDoTypes;
}

export interface CampaignIdeaRow extends GroupedTableGridRow {
  text: string;
}

export interface CampaignPCRow extends GroupedTableGridRow {
  name: string;
  type: string;
  actor: string;
  playerName: string;
  actorId: string | null;
}

// SessionPCRow is an alias - sessions use the same row type as campaigns
export type SessionPCRow = CampaignPCRow;

export interface CampaignJournalRow extends GroupedTableGridRow {
  journalName: string;    // display field - from linked Journal
  pageName: string;       // display field - from linked Page + anchor
  journalUuid: string;
  pageUuid: string | null;
  anchor: string;
  location: string;       // display field - "World" or "Compendium: {name}"
}

// UI table row types for Entry Relationships

export interface EntryJournalRow extends GroupedTableGridRow {
  journalName: string;    // display field - from linked Journal
  pageName: string;       // display field - from linked Page + anchor
  journalUuid: string;
  pageUuid: string | null;
  anchor: string;
  location: string;       // display field - "World" or "Compendium: {name}"
}

export interface RelatedEntryRow extends BaseRow {
  name: string;           // display field - from linked Entry
  topic: string;
  type: string;
  extraFields: Record<string, unknown>;  // relationship-specific fields
}

export interface RelatedDocumentRow extends BaseRow {
  name: string;           // display field - from linked document
  packId: string | null;
  packName: string | null;
}
