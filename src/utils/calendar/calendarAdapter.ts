/**
 * Calendar adapter for vis-timeline integration.
 * Bridges the gap between arbitrary calendar systems and vis-timeline's JS Date-based API.
 */

import type { CalendariaDate, CalendarZoomLevel, CalendarTimeUnit, CalendariaCategory, CalendariaAPI, CalendariaCalendar, CalendariaNote, CalendariaRawNote } from '@/types';

/**
 * Get the Calendaria API, throwing if not available or if there's no active calendar.
 * @returns Calendaria API object
 * @throws Error if Calendaria module is not active
 */
function requireCalendariaApi(): CalendariaAPI {
  const calendaria = game.modules.get('calendaria');

  if (!calendaria?.active)
    throw new Error('Calendaria module is not active. The timeline requires Calendaria to be installed and enabled.');

  // @ts-ignore
  if (!CALENDARIA?.api?.getActiveCalendar())
    throw new Error('No active calendar in Calendaria. The timeline requires an active calendar.');

  // @ts-ignore
  return (CALENDARIA as any).api as CalendariaAPI;
}

/**
 * Adapter for integrating arbitrary calendars with vis-timeline.
 * Handles conversion between calendar dates and JS Dates, formatting for axis labels,
 * and providing calendar-aware configuration for the timeline.
 */
export const CalendarAdapter = {
  /**
   * Convert a Calendaria date to a JavaScript Date for vis-timeline.
   * @param date - Calendaria date { year, month, day }
   * @returns JavaScript Date
   */
  calendariaToJS: (calendariaDate: CalendariaDate): Date => {
    const api = requireCalendariaApi();
    
    // get the timestamp (in seconds)
    const timestamp = api.dateToTimestamp(calendariaDate);

    // Calendaria returns world time in seconds, convert to JS Date (ms)
    return new Date(timestamp * 1000);
  },

  /**
   * Convert a Javascript date to a Calendaria Date.
   * Uses Calendaria timestamp conversion.
   * @param jsDate - Javascript date
   * @returns Calendaria Date
   * @throws Error if Calendaria is not available
   */
  jsToCalendaria: (jsDate: Date): CalendariaDate => {
    const api = requireCalendariaApi();
    
    // get the timestamp (in ms)
    const timestamp = jsDate.getTime();

    // Get date from API
    const date = api.timestampToDate(timestamp / 1000);

    if (date == null) {
      throw new Error('Failed to convert timestamp to Calendaria date');
    }
    
    return date;
  },

  formatDate: (date: CalendariaDate, formatOrPreset: string): string => {
    const api = requireCalendariaApi();
    
    return api.formatDate(date, formatOrPreset);
  },

  /**
   * Format a date for timeline axis minor label.
   * @param jsDate - date
   * @param unit - Current zoom unit
   * @returns Formatted string for minor axis label
   */
  formatAxisMinorLabel: (jsDate: Date, unit: CalendarTimeUnit): string => {
    const date = CalendarAdapter.jsToCalendaria(jsDate); 

    switch (unit) {
      case 'year':
        return String(date.year);
      case 'month':
        return CalendarAdapter.formatDate(date, 'MMM');
      case 'week':
        return `W${CalendarAdapter.formatDate(date, 'w')}`;
      case 'day':
        return CalendarAdapter.formatDate(date, 'EEE');
      case 'hour':
        return CalendarAdapter.formatDate(date, 'H');
      case 'minute':
        return CalendarAdapter.formatDate(date, 'm');
      case 'second':
        return CalendarAdapter.formatDate(date, 's');
      default:
        return String(date.day);
    }
  },

  /**
   * Format a date for timeline axis major label.
   * @param jsDate - date
   * @param unit - Current zoom unit
   * @returns Formatted string for major axis label
   */
  formatAxisMajorLabel: (jsDate: Date, unit: CalendarTimeUnit): string => {
    const date = CalendarAdapter.jsToCalendaria(jsDate);

    switch (unit) {
      case 'year':
        return CalendarAdapter.formatDate(date, 'era');
      case 'month':
        return String(date.year);
      case 'week':
      case 'day':
      case 'hour':
      case 'minute':
      case 'second':
        return CalendarAdapter.formatDate(date, 'MMMM y');
      default:
        return String(date.year);
    }
  },

  /**
   * Get the appropriate zoom level for a given time range.
   * @param calendarId - Calendar ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Best matching zoom level
   */
  getBestZoomLevel: (startDate: CalendariaDate, endDate: CalendariaDate): CalendarZoomLevel => {
    const api = requireCalendariaApi();
    
    const daysInRange = api.daysBetween(startDate, endDate);
    
    for (const level of CalendarAdapter.getZoomLevels()) {
      const levelDays = level.visibleUnits * level.scale;
      if (daysInRange <= levelDays * 2) {
        return level;
      }
    }
    
    return CalendarAdapter.getZoomLevels()[0];
  },

  getNotesInRange(startDate: CalendariaDate, endDate: CalendariaDate): CalendariaNote[] {
    const api = requireCalendariaApi();    
    return api.getNotesInRange(startDate, endDate).map(CalendarAdapter.convertApiNote);
  },

  getAllNotes(): CalendariaNote[] {
    const api = requireCalendariaApi();
    return api.getAllNotes().map(CalendarAdapter.convertApiNote);
  },

  /**
   * Get the number of days in a specific month.
   * @param year - Needed to check for leap year
   * @param month - Month index
   * @returns Number of days in the month
   */
  daysInMonth: (_year: number, month: number): number => {
    // TODO: how do i figure out if it's a leapyear
    const isLeapYear = false;
    const api = requireCalendariaApi();

    const cal = api.getActiveCalendar();
    
    if (!cal)
      throw new Error('No active calendar in CalendarAdapter.daysInMonth');

    const monthDef = cal.months.values[month];
    if (!monthDef)
      throw new Error('No month definition in CalendarAdapter.daysInMonth');

    if (isLeapYear && monthDef.leapDays)
      return monthDef.leapDays;

    return monthDef.days;
  },

  /**
   * Get the number of months in a specific year.
   * @returns Number of months in the year
   */
  monthsInYear: (): number => {
    const api = requireCalendariaApi();

    const cal = api.getActiveCalendar();

    if (!cal)
      throw new Error('No active calendar in CalendarAdapter.monthsInYear');
    
    return cal.months.length;
  },

  getActiveCalendar: (): CalendariaCalendar => {
    const api = requireCalendariaApi();

    const cal = api.getActiveCalendar();

    if (!cal)
      throw new Error('No active calendar in CalendarAdapter.getActiveCalendar');

    return cal;
  },

  /**
   * Get zoom levels for a calendar.
   * @param calendarId - Calendar ID
   * @returns Array of zoom levels
   */
  getZoomLevels: (): CalendarZoomLevel[] => {
    const api = requireCalendariaApi();

    const cal = api.getActiveCalendar();
    if (!cal) {
      return [];
    }

    const daysPerYear = cal.days.daysPerYear;
    const daysPerWeek = daysPerYear / cal.days.values.length;
    const monthsPerYear = cal.months.length;
    const numMonths = daysPerYear / monthsPerYear;
    const daysPerMonth = daysPerYear / numMonths;

    return [
      { id: 'year', name: 'Years', unit: 'year', visibleUnits: monthsPerYear - 2, snapUnit: 'month', scale: daysPerYear },
      { id: 'month', name: 'Months', unit: 'month', visibleUnits: numMonths, snapUnit: 'day', scale: daysPerMonth },
      { id: 'week', name: 'Weeks', unit: 'week', visibleUnits: daysPerWeek + 1, snapUnit: 'day', scale: daysPerWeek },
      { id: 'day', name: 'Days', unit: 'day', visibleUnits: 30, snapUnit: 'day', scale: 1 },
    ];
  },

  /**
   * Get all categories.
   * @returns Array of category definitions
   */
  getCategories: (): CalendariaCategory[] => {
    const api = requireCalendariaApi();
    return api.getPresets();
  },

  /**
   * Snap a date to the start of a calendar unit.
   * @param calendarId - Calendar ID
   * @param date - Date to snap
   * @param unit - Unit to snap to
   * @returns Snapped date at start of unit
   */
  snapToStart: (date: CalendariaDate, unit: CalendarTimeUnit): CalendariaDate => {
    const api = requireCalendariaApi();

    switch (unit) {
      case 'year':
        return { year: date.year, month: 0, day: 1 };
      case 'month':
        return { year: date.year, month: date.month, day: 1 };
      case 'week': {
        const weekday = parseInt(CalendarAdapter.formatDate(date, 'e'));
        return api.addDays(date, -weekday);
      }
      case 'day':
        return { ...date, hour: 0, minute: 0, second: 0 };
      case 'hour':
        return { ...date, hour: date.hour ?? 0, minute: 0, second: 0 };
      case 'minute':
        return { ...date, hour: date.hour ?? 0, minute: date.minute ?? 0, second: 0 };
      case 'second':
      default:
        return { ...date };
    }
  },

  /**
   * Snap a date to the end of a calendar unit.
   * @param calendarId - Calendar ID
   * @param date - Date to snap
   * @param unit - Unit to snap to
   * @returns Snapped date at end of unit
   */
  snapToEnd: (date: CalendariaDate, unit: CalendarTimeUnit): CalendariaDate => {
    const api = requireCalendariaApi();
    const cal = api.getActiveCalendar();

    if (!cal)
      throw new Error('Tried to CalendarAdapter.snapToEnd without an active calendar');
    
    // generally, the approach is add one, go to the beginning, go back one
    switch (unit) {
      case 'year': {
        let result = api.addYears(date, 1);
        result = CalendarAdapter.snapToStart(result, 'year');
        return api.addDays(result, -1); 
      }
      case 'month': {
        let result = api.addMonths(date, 1);
        result = CalendarAdapter.snapToStart(result, 'month');
        return api.addDays(result, -1); 
      }
      case 'week': {        
        const daysInWeek = cal.days.values.length;
        const weekday = parseInt(CalendarAdapter.formatDate(date, 'e'));
        return api.addDays(date, (daysInWeek - 1) - weekday);
      }
      case 'day':
        return { ...date, hour: 23, minute: 59, second: 59 };
      case 'hour':
        return { ...date, hour: date.hour ?? 0, minute: 59, second: 59 };
      // minute/second always assumed 0, no change needed
      case 'minute':
        return { ...date, hour: date.hour ?? 0, minute: date.minute ?? 0, second: 59 };
      case 'second':
      default:
        return { ...date };
    }
  },

  /**
   * Convert a Calendaria API note to our CalendariaNote type.
   * @param apiNote - Note from Calendaria API
   * @returns CalendariaNote object
   */
  convertApiNote: (apiNote: CalendariaRawNote): CalendariaNote => ({
    id: apiNote.id,
    name: apiNote.name,
    content: game.journal.get(apiNote.journalId)?.pages?.contents?.[0]?.text?.content || '',
    journalId: apiNote.journalId,
    // content: undefined,  // need to pull async when needed
    startDate: {
      year: apiNote.flagData.startDate.year,
      month: apiNote.flagData.startDate.month,
      day: apiNote.flagData.startDate.day,
    },
    endDate: apiNote.flagData.endDate ? {
      year: apiNote.flagData.endDate.year,
      month: apiNote.flagData.endDate.month,
      day: apiNote.flagData.endDate.day,  
    } : undefined,
    categories: apiNote.flagData.categories,
    icon: apiNote.flagData.icon,
    color: apiNote.flagData.color,
    gmOnly: apiNote.flagData.gmOnly,
  }),

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

  // TODO - replace with api when available; assume 60/60 hour/minute for now
  hoursBetween: (start: CalendariaDate, end: CalendariaDate): number => {
    const jsStart = CalendarAdapter.calendariaToJS(start);
    const jsEnd = CalendarAdapter.calendariaToJS(end);
    const diffMs = jsEnd.getTime() - jsStart.getTime();
    return diffMs / (60 * 60 * 1000);
  },

  // TODO - replace with api when available; assume 60 minutes for now
  minutesBetween: (start: CalendariaDate, end: CalendariaDate): number => {
    const jsStart = CalendarAdapter.calendariaToJS(start);
    const jsEnd = CalendarAdapter.calendariaToJS(end);
    const diffMs = jsEnd.getTime() - jsStart.getTime();
    return diffMs / (60 * 1000);
  },

  // TODO - replace with api when available; assume 60 seconds for now
  secondsBetween: (start: CalendariaDate, end: CalendariaDate): number => {
    const jsStart = CalendarAdapter.calendariaToJS(start);
    const jsEnd = CalendarAdapter.calendariaToJS(end);
    const diffMs = jsEnd.getTime() - jsStart.getTime();
    return diffMs / (1000);
  },

  daysBetween: (start: CalendariaDate, end: CalendariaDate): number => {
    const api = requireCalendariaApi();
    return api.daysBetween(start, end);
  },

  monthsBetween: (start: CalendariaDate, end: CalendariaDate): number => {
    const api = requireCalendariaApi();
    return api.monthsBetween(start, end);
  },

  yearsBetween: (start: CalendariaDate, end: CalendariaDate): number => {
    const api = requireCalendariaApi();
    return api.yearsBetween(start, end);
  },

  addYears: (date: CalendariaDate, years: number): CalendariaDate => {
    const api = requireCalendariaApi();
    return api.addYears(date, years);
  },

  addMonths: (date: CalendariaDate, months: number): CalendariaDate => {
    const api = requireCalendariaApi();
    return api.addMonths(date, months);
  },

  addDays: (date: CalendariaDate, days: number): CalendariaDate => {
    const api = requireCalendariaApi();
    return api.addDays(date, days);
  },


  // TODO: replace with api when available
  addHours: (date: CalendariaDate, hours: number): CalendariaDate => {
    let result = { ...date };

    // Handle hour addition with day rollover (assumes 24 hours/day)
    const newHourTotal = (result.hour ?? 0) + hours; 
    
    // Handle day rollover using floor (rounds toward negative infinity)
    const daysToAdd = Math.floor(newHourTotal / 24); 
    const newHour = ((newHourTotal % 24) + 24) % 24; // Ensure positive result 0-23
    
    if (daysToAdd !== 0) {
      result = CalendarAdapter.addDays(result, daysToAdd);
    }
    result.hour = newHour;

    return result;
  },

  
  // TODO: replace with api when available
  addMinutes: (date: CalendariaDate, minutes: number): CalendariaDate => {
    let result = { ...date };

    // Handle minute addition with hour rollover (assumes 60 minutes/hour)
    const newMinuteTotal = (result.minute ?? 0) + minutes; 
    
    // Handle hour rollover using floor (rounds toward negative infinity)
    const hoursToAdd = Math.floor(newMinuteTotal / 60); 
    const newMinutes = ((newMinuteTotal % 60) + 60) % 60; // Ensure positive result 0-23
    
    if (hoursToAdd !== 0) {
      result = CalendarAdapter.addHours(result, hoursToAdd);
    }
    result.minute = newMinutes;

    return result;
  },

  
  // TODO: replace with api when available
  addSeconds: (date: CalendariaDate, seconds: number): CalendariaDate => {
    let result = { ...date };

    // Handle second addition with minute rollover (assumes 60 seconds/minute)
    const newSecondTotal = (result.second ?? 0) + seconds; 
    
    // Handle minute rollover using floor (rounds toward negative infinity)
    const minutesToAdd = Math.floor(newSecondTotal / 60); 
    const newSeconds = ((newSecondTotal % 60) + 60) % 60; // Ensure positive result 0-23
    
    if (minutesToAdd !== 0) {
      result = CalendarAdapter.addMinutes(result, minutesToAdd);
    }
    result.second = newSeconds;

    return result;
  },

  /** Get the number of days since 0/0/0 
   * 
   * @param date - The date to calculate to
   * @returns The number of days since 0/0/0 (I suppose negative if before)
  */
  calendariaToAbsolute: (date: CalendariaDate): number => {
    const api = requireCalendariaApi();
    
    return api.daysBetween({ year: 0, month: 0, day: 1 }, date);
  },
  
  /** 
   * @param absoluteDay - The number of days since 0/0/0 (that being day 0)
   * @returns The calendar date
   */
  absoluteToCalendaria: (absoluteDay: number): CalendariaDate => {
    const api = requireCalendariaApi();
    
    return api.addDays({ year: 0, month: 0, day: 1 }, absoluteDay);
  },

  dayOfYear: (date: CalendariaDate): number => {
    const yearStart: CalendariaDate = { year: date.year, month: 0, day: 1 };
    return CalendarAdapter.calendariaToAbsolute(date) - CalendarAdapter.calendariaToAbsolute(yearStart) + 1;
  },

  getCurrentDate: (): CalendariaDate => {
    const api = requireCalendariaApi();

    return api.getCurrentDateTime();
  },

  /**
   * Get a snap function for vis-timeline drag/resize operations.
   * Returns a function that snaps a date to the appropriate calendar unit.
   * @param snapUnit - The unit to snap to
   * @returns Snap function for vis-timeline
   */
  createSnapFunction: (snapUnit: CalendarTimeUnit): ((date: Date) => Date) => {
    return (date: Date): Date => {
      const calDate = CalendarAdapter.jsToCalendaria(date);
      return CalendarAdapter.calendariaToJS(CalendarAdapter.snapToStart(calDate, snapUnit));
    }
  },
};

export default CalendarAdapter;
