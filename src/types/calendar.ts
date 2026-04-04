/**
 * Types for calendar support in timeline.
 * These represent arbitrary calendar systems (not just Gregorian).
 */

import { CalendariaRawNote } from './timeline';

/** Month definition in a calendar */
export interface CalendarMonth {
  /** Month index (0-based) */
  index: number;
  /** Localized name */
  name: string;
  /** Abbreviated name */
  shortName: string;
  /** Number of days in this month (can vary by year for leap year systems) */
  days: number;
}

/** Week definition in a calendar */
export interface CalendarWeek {
  /** Number of days in a week */
  days: number;
  /** Names of weekdays (index 0 = first day of week) */
  dayNames: string[];
  /** Abbreviated weekday names */
  dayShortNames: string[];
}

/** Time unit for timeline zoom/step operations */
export type CalendarTimeUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** Zoom level configuration for timeline */
export interface CalendarZoomLevel {
  /** Unique identifier for this zoom level */
  id: string;
  /** Display name */
  name: string;
  /** Time unit for this zoom level */
  unit: CalendarTimeUnit;
  /** Number of units visible at this zoom level */
  visibleUnits: number;
  /** Snap unit when dragging/resizing */
  snapUnit: CalendarTimeUnit;
  /** Scale factor relative to base (days per pixel approximation) */
  scale: number;
}

/** Complete calendar definition */
export interface CalendarDefinition {
  /** Unique calendar ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** All months in the calendar */
  months: CalendarMonth[];
  /** Week definition */
  week: CalendarWeek;
  /** Available zoom levels for timeline */
  zoomLevels: CalendarZoomLevel[];
  /** Year 0 reference point description (e.g., "Founding of the Empire") */
  epochDescription?: string;
  /** 
   * Unix timestamp (ms) for calendar year 0, day 1.
   * Maps fantasy calendar dates to real-world dates for vis-timeline.
   * If not provided, defaults to mapping year 1500 to Jan 1, 2024.
   */
  epochOffset?: number;
  /** Number of days in a year (sum of all month days, may vary by year) */
  daysInYear: number | ((year: number) => number);
  /** Whether this calendar has leap years */
  hasLeapYears: boolean;
  /** Leap year calculation (returns true if year is a leap year) */
  isLeapYear?: (year: number) => boolean;
  /** Optional: number of leap days added in a leap year */
  leapDays?: number;
}

export type CalendariaDate = {
  year: number;
  month: number;
  day: number;  // 1-indexed
  /** Hour (0-23). Undefined defaults to 0 (midnight). */
  hour?: number;
  /** Minute (0-59). Undefined defaults to 0. */
  minute?: number;
  /** Second (0-59). Undefined defaults to 0. */
  second?: number;
}

export type CalendariaCategory = {
  id: string;
  label: string;
  color: string;
  icon: string;
}

/** Calendar-aware date range */
export interface CalendarDateRange {
  /** Start of range */
  start: CalendariaDate;
  /** End of range */
  end: CalendariaDate;
  /** Calendar ID */
  calendarId: string;
}

/** Duration in calendar units */
export interface CalendarDuration {
  /** Number of years */
  years?: number;
  /** Number of months */
  months?: number;
  /** Number of weeks */
  weeks?: number;
  /** Number of days */
  days?: number;
  /** Number of hours */
  hours?: number;
  /** Number of minutes */
  minutes?: number;
  /** Number of seconds */
  seconds?: number;
}

/** Calendaria calendar object returned by getActiveCalendar() */
export interface CalendariaCalendar {
  days: {
    daysPerYear: number;
    values: Array<{
      name: string;
      abbreviation: string;
      ordinal: number;
      isRestDay: boolean;
    }>;
  };

  months: Array<{
    name: string;
    abbreviation: string;
    ordinal: number;
    days: number;
    leapDays?: number;
    startingWeekday?: number;
    type?: string;
    weekdays?: Array<number>;
  }>;

  weeks: {
    enabled: boolean;
    names: string[];
    perMonth?: number;
    type: string;
  };
}


/** Calendaria API interface - methods used from requireCalendariaApi() */
export interface CalendariaAPI {
  /** Convert a Calendaria date to a timestamp (seconds) */
  dateToTimestamp: (date: CalendariaDate) => number;

  /** Convert a timestamp (seconds) to a Calendaria date */
  timestampToDate: (timestamp: number) => CalendariaDate;

  /** Format a date using a format string or preset */
  formatDate: (date: CalendariaDate | null, formatOrPreset: string) => string;

  /** Get the currently active calendar */
  getActiveCalendar: () => CalendariaCalendar | null;

  /** Get all available categories for timeline notes */
  getPresets: () => CalendariaCategory[];

  /** Get all available calendars */
  getAllCalendars: () => Map<string, CalendarDefinition>;

  /** Get a specific calendar by ID */
  getCalendar: (id: string) => CalendarDefinition | null;

  /** Gets notes in a date range */
  getNotesInRange: (startDate: CalendariaDate, endDate: CalendariaDate) => CalendariaRawNote[];

  /** Gets all notes */
  getAllNotes: () => CalendariaRawNote[];

  /** Calculate number of days between two dates */
  daysBetween: (start: CalendariaDate, end: CalendariaDate) => number;

  /** Calculate number of months between two dates */
  monthsBetween: (start: CalendariaDate, end: CalendariaDate) => number;

  /** Calculate number of years between two dates */
  yearsBetween: (start: CalendariaDate, end: CalendariaDate) => number;

  /** Add years to a date */
  addYears: (date: CalendariaDate, years: number) => CalendariaDate;

  /** Add months to a date */
  addMonths: (date: CalendariaDate, months: number) => CalendariaDate;

  /** Add days to a date */
  addDays: (date: CalendariaDate, days: number) => CalendariaDate;

  /** Get the current date-time */
  getCurrentDateTime: () => CalendariaDate;

  /** Get the day of week index (0-based) for a date */
  dayOfWeek: (date: CalendariaDate) => number;
}
