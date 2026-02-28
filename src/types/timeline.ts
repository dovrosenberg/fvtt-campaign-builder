/**
 * Types for timeline functionality.
 */

/** Filters for timeline events */
export interface TimelineFilters {
  /** Event categories to show (empty = all) */
  categories?: string[];

  /** Text search filter - matches against name and content */
  textSearch?: string;

  /** Show GM-only events only */
  gmOnly?: boolean;

  /** Show events referencing this UUID */
  referencedUuid?: string;
}

/** Configuration for a single timeline */
export interface TimelineConfig {
  /** Filters applied to the timeline */
  filters: TimelineFilters;

  // Future expansion:
  // zoomLevel?: number;
  // visibleRange?: { start: Date; end: Date };
  // displayOptions?: TimelineDisplayOptions;
}

/** A Calendaria note (mock structure for POC) */
export interface CalendariaNote {
  /** Unique identifier */
  id: string;

  /** Note name/title */
  name: string;

  /** Note content (HTML) */
  content: string;

  /** Start date components */
  startDate: {
    year: number;
    month: number;  // 0-indexed
    dayOfMonth: number;
    hour?: number;
    minute?: number;
  };

  /** End date components (for range events) */
  endDate?: {
    year: number;
    month: number;
    dayOfMonth: number;
    hour?: number;
    minute?: number;
  };

  /** Event categories */
  categories: string[];

  /** Color for the event */
  color: string;

  /** Icon/emblem class */
  icon: string;

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
}
