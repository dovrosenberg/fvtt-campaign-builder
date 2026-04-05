/**
 * Types for timeline functionality.
 */

import { CalendariaDate } from './calendar';

/** Filters for timeline events */
export interface TimelineFilters {
  /** Event categories to show (empty = all) */
  categories: string[];

  /** Text search filter - matches against name and content */
  textSearch: string;

  /** Exclude GM-only events */
  excludeGMOnly: boolean;

  /** Show events referencing the current content */
  referenceEntity: boolean;

  /** Include nested content UUIDs when filtering by reference */
  includeNestedUuids: boolean;

  /** Visible date range for timeline  */
  visibleRange: {
    start: CalendariaDate;
    end: CalendariaDate;
  } | null;
}

export const TIMELINE_DEFAULT_FILTERS: TimelineFilters = {
  categories: [] as string[],
  textSearch: '',
  excludeGMOnly: false,
  referenceEntity: false,
  includeNestedUuids: false,
  visibleRange: null,
} as const;

export const TIMELINE_DEFAULT: TimelineConfig = {
  filters: TIMELINE_DEFAULT_FILTERS,
} as const;

/** Configuration for a single timeline */
export interface TimelineConfig {
  /** Filters applied to the timeline */
  filters: TimelineFilters;

  // Future expansion:
  // zoomLevel?: number;
  // visibleRange?: { start: Date; end: Date };
  // displayOptions?: TimelineDisplayOptions;
}

/** A Calendaria note */
export interface CalendariaRawNote {
  /** Unique identifier */
  id: string;

  /** world journalEntry id */
  journalId: string;
  
  /** Note name/title */
  name: string;

  /** Flag data */
  flagData: {
    /** Note content (HTML) */
    content: string;

    /** Start date components */
    startDate: { year: number; month: number; day: number };

    /** End date components (for range events) */
    endDate?: { year: number; month: number; day: number };

    /** Event categories (array of category IDs) */
    categories: string[];

    /** Icon class for display */
    icon: string;

    /** Color for timeline item */
    color: string;

    /** Is this GM-only */
    gmOnly: boolean;

    // /** Recurrence type */
    // repeat: TimelineRecurrenceType;
  }
}

/** A Calendaria note */
export interface CalendariaNote {
  /** Unique identifier */
  id: string;

  /** id of journal entry */
  journalId: string;

  /** Note name/title */
  name: string;

  /** Note content (HTML) */
  content: string;

  /** Start date components */
  startDate: CalendariaDate;

  /** End date components (for range events) */
  endDate?: CalendariaDate;

  /** Event categories (array of category IDs) */
  categories: string[];

  /** Icon class for display */
  icon: string;

  /** Color for timeline item */
  color: string;

  /** Is this GM-only */
  gmOnly: boolean;

  // /** Recurrence type */
  // repeat: TimelineRecurrenceType;
}

/** A vis-timeline item */
export interface TimelineItem {
  id: string;
  content: string;
  start: Date;
  end?: Date;
  type?: 'box' | 'point' | 'range' | 'background';
  className?: string;
  style?: string;
  /** Tooltip content (HTML) */
  title?: string;
}
