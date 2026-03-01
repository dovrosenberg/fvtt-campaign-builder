/**
 * Calendar adapter for vis-timeline integration.
 * Bridges the gap between arbitrary calendar systems and vis-timeline's JS Date-based API.
 */

import MockCalendariaService from '@/utils/mockCalendaria';
import type { CalendarDate, CalendarDefinition, CalendarZoomLevel, CalendarTimeUnit } from '@/types';

/**
 * Adapter for integrating arbitrary calendars with vis-timeline.
 * Handles conversion between calendar dates and JS Dates, formatting for axis labels,
 * and providing calendar-aware configuration for the timeline.
 */
const CalendarAdapter = {
  /**
   * Get the currently active calendar ID.
   * @returns Active calendar ID
   */
  getActiveCalendarId: (): string => {
    return MockCalendariaService.getActiveCalendar().id;
  },

  /**
   * Get the currently active calendar definition.
   * @returns Active calendar definition
   */
  getActiveCalendarDefinition: (): CalendarDefinition => {
    return MockCalendariaService.getActiveCalendarDefinition();
  },

  /**
   * Convert a Calendaria date (from notes) to a JavaScript Date for vis-timeline.
   * @param date - Calendaria date { year, month, dayOfMonth }
   * @returns JavaScript Date
   */
  calendariaDateToJSDate: (date: { year: number; month: number; dayOfMonth: number }): Date => {
    const calendarDate: CalendarDate = {
      year: date.year,
      month: date.month,
      day: date.dayOfMonth,
    };
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const normalized = MockCalendariaService.normalizeDate(calendarId, calendarDate);
    return MockCalendariaService.normalizedToJSDate(normalized);
  },

  /**
   * Convert a JavaScript Date to a Calendaria date.
   * @param jsDate - JavaScript Date
   * @returns Calendaria date { year, month, dayOfMonth }
   */
  jsDateToCalendariaDate: (jsDate: Date): { year: number; month: number; dayOfMonth: number } => {
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const normalized = MockCalendariaService.jsDateToNormalized(calendarId, jsDate);
    const calendarDate = MockCalendariaService.denormalizeDate(calendarId, normalized);
    return {
      year: calendarDate.year,
      month: calendarDate.month,
      dayOfMonth: calendarDate.day,
    };
  },

  /**
   * Convert a JavaScript Date to a full CalendarDate.
   * @param jsDate - JavaScript Date
   * @returns CalendarDate with time components
   */
  jsDateToCalendarDate: (jsDate: Date): CalendarDate => {
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const normalized = MockCalendariaService.jsDateToNormalized(calendarId, jsDate);
    return MockCalendariaService.denormalizeDate(calendarId, normalized);
  },

  /**
   * Format a JavaScript Date for display using the active calendar.
   * @param jsDate - JavaScript Date
   * @param format - Format string (e.g., 'MMMM DD, YYYY')
   * @returns Formatted date string
   */
  formatDate: (jsDate: Date, format: string): string => {
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    return MockCalendariaService.formatDate(calendarId, calendarDate, format);
  },

  /**
   * Format a date for timeline axis minor label.
   * @param jsDate - JavaScript Date
   * @param unit - Current zoom unit
   * @returns Formatted string for minor axis label
   */
  formatAxisMinorLabel: (jsDate: Date, unit: CalendarTimeUnit): string => {
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    return MockCalendariaService.formatAxisMinorLabel(calendarId, calendarDate, unit);
  },

  /**
   * Format a date for timeline axis major label.
   * @param jsDate - JavaScript Date
   * @param unit - Current zoom unit
   * @returns Formatted string for major axis label
   */
  formatAxisMajorLabel: (jsDate: Date, unit: CalendarTimeUnit): string => {
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    return MockCalendariaService.formatAxisMajorLabel(calendarId, calendarDate, unit);
  },

  /**
   * Get the best zoom level for a given date range.
   * @param startDate - Start JavaScript Date
   * @param endDate - End JavaScript Date
   * @returns Best matching zoom level
   */
  getBestZoomLevel: (startDate: Date, endDate: Date): CalendarZoomLevel => {
    const startCalendarDate = CalendarAdapter.jsDateToCalendarDate(startDate);
    const endCalendarDate = CalendarAdapter.jsDateToCalendarDate(endDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    return MockCalendariaService.getBestZoomLevel(calendarId, startCalendarDate, endCalendarDate);
  },

  /**
   * Get zoom levels for the active calendar.
   * @returns Array of zoom levels
   */
  getZoomLevels: (): CalendarZoomLevel[] => {
    const calendarId = CalendarAdapter.getActiveCalendarId();
    return MockCalendariaService.getZoomLevels(calendarId);
  },

  /**
   * Snap a JavaScript Date to the start of a calendar unit.
   * @param jsDate - JavaScript Date to snap
   * @param unit - Unit to snap to
   * @returns Snapped JavaScript Date
   */
  snapToStart: (jsDate: Date, unit: CalendarTimeUnit): Date => {
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const snappedDate = MockCalendariaService.snapToStart(calendarId, calendarDate, unit);
    const normalized = MockCalendariaService.normalizeDate(calendarId, snappedDate);
    return MockCalendariaService.normalizedToJSDate(normalized);
  },

  /**
   * Snap a JavaScript Date to the end of a calendar unit.
   * @param jsDate - JavaScript Date to snap
   * @param unit - Unit to snap to
   * @returns Snapped JavaScript Date
   */
  snapToEnd: (jsDate: Date, unit: CalendarTimeUnit): Date => {
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const snappedDate = MockCalendariaService.snapToEnd(calendarId, calendarDate, unit);
    const normalized = MockCalendariaService.normalizeDate(calendarId, snappedDate);
    return MockCalendariaService.normalizedToJSDate(normalized);
  },

  /**
   * Create a vis-timeline compatible time axis formatter function.
   * This function will be called by vis-timeline to format axis labels.
   * @param unit - The current zoom unit
   * @param isMajor - Whether this is a major or minor label
   * @returns Formatter function that takes a date and returns formatted string
   */
  createAxisFormatter: (unit: CalendarTimeUnit, isMajor: boolean): ((date: Date) => string) => {
    if (isMajor) {
      return (date: Date) => CalendarAdapter.formatAxisMajorLabel(date, unit);
    }
    return (date: Date) => CalendarAdapter.formatAxisMinorLabel(date, unit);
  },

  /**
   * Get vis-timeline format configuration for the active calendar.
   * This provides custom formatters for major and minor axis labels.
   * Note: vis-timeline passes Moment objects to format functions, not Date objects.
   * @returns vis-timeline format configuration object
   */
  getTimelineFormatConfig: () => {
    // Helper to convert Moment to Date and format
    const formatMinor = (momentDate: { toDate(): Date }, unit: CalendarTimeUnit): string => {
      return CalendarAdapter.formatAxisMinorLabel(momentDate.toDate(), unit);
    };
    
    const formatMajor = (momentDate: { toDate(): Date }, unit: CalendarTimeUnit): string => {
      return CalendarAdapter.formatAxisMajorLabel(momentDate.toDate(), unit);
    };
    
    return {
      // Custom formatters for each zoom level
      // Functions receive a Moment object, not a Date
      minorLabels: {
        millisecond: (d: { toDate(): Date }) => formatMinor(d, 'second'),
        second: (d: { toDate(): Date }) => formatMinor(d, 'second'),
        minute: (d: { toDate(): Date }) => formatMinor(d, 'minute'),
        hour: (d: { toDate(): Date }) => formatMinor(d, 'hour'),
        day: (d: { toDate(): Date }) => formatMinor(d, 'day'),
        week: (d: { toDate(): Date }) => formatMinor(d, 'week'),
        month: (d: { toDate(): Date }) => formatMinor(d, 'month'),
        year: (d: { toDate(): Date }) => formatMinor(d, 'year'),
      },
      majorLabels: {
        millisecond: (d: { toDate(): Date }) => formatMajor(d, 'second'),
        second: (d: { toDate(): Date }) => formatMajor(d, 'second'),
        minute: (d: { toDate(): Date }) => formatMajor(d, 'minute'),
        hour: (d: { toDate(): Date }) => formatMajor(d, 'hour'),
        day: (d: { toDate(): Date }) => formatMajor(d, 'day'),
        week: (d: { toDate(): Date }) => formatMajor(d, 'week'),
        month: (d: { toDate(): Date }) => formatMajor(d, 'month'),
        year: (d: { toDate(): Date }) => formatMajor(d, 'year'),
      },
    };
  },

  /**
   * Get the weekday name for a JavaScript Date using the active calendar.
   * @param jsDate - JavaScript Date
   * @returns Weekday name
   */
  getWeekdayName: (jsDate: Date): string => {
    const calendar = CalendarAdapter.getActiveCalendarDefinition();
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const weekdayIndex = MockCalendariaService.getWeekday(calendarId, calendarDate);
    return calendar.week.dayNames[weekdayIndex] ?? '';
  },

  /**
   * Get the month name for a JavaScript Date using the active calendar.
   * @param jsDate - JavaScript Date
   * @returns Month name
   */
  getMonthName: (jsDate: Date): string => {
    const calendar = CalendarAdapter.getActiveCalendarDefinition();
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const month = calendar.months[calendarDate.month];
    return month?.name ?? '';
  },

  /**
   * Calculate the number of days between two JavaScript Dates using the active calendar.
   * @param start - Start date
   * @param end - End date
   * @returns Number of days between dates
   */
  getDaysBetween: (start: Date, end: Date): number => {
    const startCalendarDate = CalendarAdapter.jsDateToCalendarDate(start);
    const endCalendarDate = CalendarAdapter.jsDateToCalendarDate(end);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    return MockCalendariaService.getDaysBetween(calendarId, startCalendarDate, endCalendarDate);
  },

  /**
   * Add a duration to a JavaScript Date using the active calendar.
   * @param jsDate - Starting date
   * @param duration - Duration to add
   * @returns Resulting JavaScript Date
   */
  addDuration: (jsDate: Date, duration: { years?: number; months?: number; weeks?: number; days?: number; hours?: number; minutes?: number; seconds?: number }): Date => {
    const calendarDate = CalendarAdapter.jsDateToCalendarDate(jsDate);
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const resultDate = MockCalendariaService.addDuration(calendarId, calendarDate, duration);
    const normalized = MockCalendariaService.normalizeDate(calendarId, resultDate);
    return MockCalendariaService.normalizedToJSDate(normalized);
  },

  /**
   * Get a snap function for vis-timeline drag/resize operations.
   * Returns a function that snaps a date to the appropriate calendar unit.
   * @param snapUnit - The unit to snap to
   * @returns Snap function for vis-timeline
   */
  createSnapFunction: (snapUnit: CalendarTimeUnit): ((date: Date) => Date) => {
    return (date: Date) => CalendarAdapter.snapToStart(date, snapUnit);
  },
};

export default CalendarAdapter;
