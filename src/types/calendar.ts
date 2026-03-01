/**
 * Types for calendar support in timeline.
 * These represent arbitrary calendar systems (not just Gregorian).
 */

/** A specific date in a calendar system */
export interface CalendarDate {
  /** Year in the calendar system */
  year: number;
  /** Month index (0-based) */
  month: number;
  /** Day of month (1-based) */
  day: number;
  /** Optional hour (0-23) */
  hour?: number;
  /** Optional minute (0-59) */
  minute?: number;
  /** Optional second (0-59) */
  second?: number;
}

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

/** 
 * Normalized date representation for internal calculations.
 * Uses absolute day count from a reference epoch.
 */
export interface NormalizedDate {
  /** Absolute day number from calendar epoch */
  absoluteDay: number;
  /** Fraction of day (0-1) for time precision */
  dayFraction: number;
  /** Reference calendar ID */
  calendarId: string;
}

/** Result of date arithmetic */
export interface DateArithmeticResult {
  /** The resulting calendar date */
  date: CalendarDate;
  /** Whether the result crossed a year boundary */
  crossedYear: boolean;
  /** Whether the result crossed a month boundary */
  crossedMonth: boolean;
}

/** Time axis tick information */
export interface TimeAxisTick {
  /** Position in pixels */
  position: number;
  /** JS Date for vis-timeline compatibility */
  date: Date;
  /** Calendar date representation */
  calendarDate: CalendarDate;
  /** Formatted label for this tick */
  label: string;
  /** Whether this is a major tick (year/month boundary) */
  isMajor: boolean;
  /** Unit this tick represents */
  unit: CalendarTimeUnit;
}

/** Configuration for time axis formatting */
export interface TimeAxisFormatConfig {
  /** Calendar to use for formatting */
  calendarId: string;
  /** Current zoom level */
  zoomLevel: CalendarZoomLevel;
  /** Locale for formatting */
  locale?: string;
  /** Whether to show weekday names */
  showWeekdays: boolean;
  /** Whether to show year on major ticks */
  showYear: boolean;
}

/** Calendar-aware date range */
export interface CalendarDateRange {
  /** Start of range */
  start: CalendarDate;
  /** End of range */
  end: CalendarDate;
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
