/**
 * CalendariaMoment - A moment-like wrapper for arbitrary calendar systems.
 * 
 * This implements the minimal moment.js API surface that vis-timeline requires,
 * delegating all operations to the active calendar system via CalendarAdapter.
 * 
 * When injected via `options.moment`, vis-timeline will:
 * - Place ticks at calendar month/year boundaries (not Gregorian)
 * - Format labels with calendar month/weekday names
 * - Step by calendar-aware units
 */

import { CalendarAdapter } from '@/utils/calendar';
import type { CalendariaDate, CalendarTimeUnit, } from '@/types';

/**
 * A moment-like object backed by Calendaria calendar system.
 */
class CalendariaMoment {
  private _calendariaDate: CalendariaDate;

  /**
   * Create a CalendariaMoment from a date.
   */
  private constructor(date: CalendariaDate) {
    if (!date) {
      throw new Error('Cannot create CalendariaMoment with null or undefined date');
    }
    this._calendariaDate = date;
  }

  // ==================== Factory Methods ====================

  /**
   * Create a moment from a JS Date, timestamp, or string.
   * This is the main entry point used by vis-timeline.
   */
  static create(input?: Date | number | string | CalendariaMoment): CalendariaMoment {
    if (input == null) {
      // Current date
      const currentDate = CalendarAdapter.getCurrentDate();
      return new CalendariaMoment(currentDate);
    }
    
    if (input instanceof CalendariaMoment) {
      return input.clone();
    }
    
    if (input instanceof Date) {
      return new CalendariaMoment(CalendarAdapter.jsToCalendaria(input));
    }
    
    if (typeof input === 'number') {
      // Timestamp in milliseconds
      const jsDate = new Date(input);
      return new CalendariaMoment(CalendarAdapter.jsToCalendaria(jsDate));
    }
    
    if (typeof input === 'string') {
      // Parse ISO string
      const jsDate = new Date(input);
      return new CalendariaMoment(CalendarAdapter.jsToCalendaria(jsDate));
    }
    
    // Fallback to now
    const currentDate = CalendarAdapter.getCurrentDate();
    return new CalendariaMoment(currentDate);
  }

  // ==================== Core Methods ====================

  /**
   * Get the millisecond timestamp value.
   */
  valueOf(): number {
    return CalendarAdapter.calendariaToJS(this._calendariaDate).getTime();
  }

  /**
   * Convert to JavaScript Date.
   */
  toDate(): Date {
    return CalendarAdapter.calendariaToJS(this._calendariaDate);
  }

  /**
   * Create a copy.
   */
  clone(): CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot clone an empty CalendariaMoment');
    } else {
      return new CalendariaMoment({ ...this._calendariaDate });
    }
  }

  /**
   * Check if this is a valid date.
   */
  isValid(): boolean {
    return !isNaN(this.valueOf());
  }

  /**
   * Get or set the locale (language).
   * Returns this for chaining when setting (vis-timeline calls m.lang('en')).
   */
  lang(locale?: string): CalendariaMoment | string {
    if (locale === undefined) {
      return 'en';
    }
    // Setting locale - return this for chaining
    return this;
  }
  
  /**
   * Get or set the locale (alias for lang).
   * Returns this for chaining when setting.
   */
  locale(locale?: string): CalendariaMoment | string {
    return this.lang(locale);
  }

  // ==================== Getters ====================

  /**
   * Get the week in the calendar system.
   * When called with an argument, sets the year and returns this for chaining.
   */
  week(): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get week() on invalid CalendariaMoment');
    }

    return parseInt(CalendarAdapter.formatDate(this._calendariaDate, 'w'));
  }

  /**
   * Get or set the year in the calendar system.
   * When called with an argument, sets the year and returns this for chaining.
   */
  year(value?: number): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get/set year() on invalid CalendariaMoment');
    }

    if (value === undefined) {
      return this._calendariaDate.year;
    }
    this._calendariaDate.year = value;
    return this;
  }

  /**
   * Get or set the month (0-indexed) in the calendar system.
   * When called with an argument, sets the month and returns this for chaining.
   */
  month(value?: number): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get/set month() on invalid CalendariaMoment');
    }

    if (value === undefined) {
      return this._calendariaDate.month;
    }
    this._calendariaDate.month = value;
    return this;
  }

  /**
   * Get or set the day of the month in the calendar system.
   * When called with an argument, sets the day and returns this for chaining.
   */
  date(value?: number): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get/set date() on invalid CalendariaMoment');
    }

    if (value === undefined) {
      return this._calendariaDate.day;
    }
    this._calendariaDate.day = value;
    return this;
  }

  /**
   * Get or set the weekday (0-indexed, where 0 is first day of week).
   * When called with an argument, sets the weekday and returns this for chaining.
   * Positive value moves to next matching day, negative moves to last matching day
   * 0 moves forward
   * Note: doesn't support going forward/back a full week or more; will 
   *    need to watch if that causes issues
   */
  weekday(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return parseInt(CalendarAdapter.formatDate(this._calendariaDate, 'e'));
    }

    if (Math.abs(value) >=7)
      console.warn(`calendariaMoment.weekday() was passed a large value: ${value}. This is an issue if weeks aren't that long`);

    // we're just going to move until we get there
    let result = this._calendariaDate;
    while (parseInt(CalendarAdapter.formatDate(result, 'e')) !== value) {
      if (value >= 0)
        result = CalendarAdapter.addDays(result, 1);
      if (value < 0)
        result = CalendarAdapter.addDays(result, -1);
    }

    this._calendariaDate = result;
    return this;
  }

  /**
   * Get or set the hour (0-23).
   * When called with an argument, sets the hour and returns this for chaining.
   */
  hours(value?: number): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get/set hours() on invalid CalendariaMoment');
    }

    if (value === undefined) {
      return this._calendariaDate.hour ?? 0;
    }

    this._calendariaDate.hour = value;

    return this;
  }

  /**
   * Get or set the minute (0-59). Runtime only - not persisted.
   * When called with an argument, sets the minute and returns this for chaining.
   */
  minutes(value?: number): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get/set minutes() on invalid CalendariaMoment');
    }

    if (value === undefined) {
      return (this._calendariaDate as any).minute ?? 0;
    }

    // Store on runtime object (not persisted to DB)
    (this._calendariaDate as any).minute = value;
    
    return this;
  }

  /**
   * Get or set the second (0-59). Runtime only - not persisted.
   * When called with an argument, sets the second and returns this for chaining.
   */
  seconds(value?: number): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get/set seconds() on invalid CalendariaMoment');
    }

    if (value === undefined) {
      return (this._calendariaDate as any).second ?? 0;
    }

    // Store on runtime object (not persisted to DB)
    (this._calendariaDate as any).second = value;
    
    return this;
  }

  /**
   * Get or set the millisecond (0-999).  But not really, since we only track date
   * When called with an argument, sets the millisecond and returns this for chaining.
   */
  milliseconds(value?: number): number | CalendariaMoment {
    if (!this._calendariaDate) {
      throw new Error('Cannot get/set milliseconds() on invalid CalendariaMoment');
    }

    if (value === undefined) {
      return 0;
    }

    // don't set anything
    
    return this;
  }

  /**
   * Get the day of year (1-indexed).
   */
  dayOfYear(): number {
    return CalendarAdapter.dayOfYear(this._calendariaDate);
  }

  // ==================== Additional Setters ====================

  /**
   * Set the year (alias for year(value)).
   */
  setYear(value: number): CalendariaMoment {
    return this.year(value) as CalendariaMoment;
  }

  /**
   * Set the month (alias for month(value)).
   */
  setMonth(value: number): CalendariaMoment {
    return this.month(value) as CalendariaMoment;
  }

  /**
   * Set the day of month (alias for date(value)).
   */
  setDate(value: number): CalendariaMoment {
    return this.date(value) as CalendariaMoment;
  }

  /**
   * Set the hour (alias for hours(value)).
   */
  setHours(value: number): CalendariaMoment {
    return this.hours(value) as CalendariaMoment;
  }

  /**
   * Set the minute (alias for minutes(value)).
   */
  setMinutes(value: number): CalendariaMoment {
    return this.minutes(value) as CalendariaMoment;
  }

  /**
   * Set the second (alias for seconds(value)).
   */
  setSeconds(value: number): CalendariaMoment {
    return this.seconds(value) as CalendariaMoment;
  }

  /**
   * Set the millisecond (alias for milliseconds(value)).
   */
  setMilliseconds(value: number): CalendariaMoment {
    return this.milliseconds(value) as CalendariaMoment;
  }

  // ==================== Math Operations ====================

  /**
   * Add time to this moment.
   */
  add(amount: number, unit: string): CalendariaMoment {
    const calendarUnit = this._toCalendarUnit(unit);

    switch (calendarUnit) {
      case 'year':
        this._calendariaDate = CalendarAdapter.addYears(this._calendariaDate, amount);
        break;
      case 'month':
        this._calendariaDate = CalendarAdapter.addMonths(this._calendariaDate, amount);
        break;
      case 'day':
        this._calendariaDate = CalendarAdapter.addDays(this._calendariaDate, amount);
        break;
      case 'hour': 
        this._calendariaDate = CalendarAdapter.addHours(this._calendariaDate, amount);
        break;      
      case 'minute':
        this._calendariaDate = CalendarAdapter.addMinutes(this._calendariaDate, amount);
        break;
      case 'second':
        this._calendariaDate = CalendarAdapter.addSeconds(this._calendariaDate, amount);
        break;
      case 'millisecond': 
      default:
        throw new Error(`Unknown unit: ${unit}`);
    }

    return this;
  }

  /**
   * Subtract time from this moment.
   */
  subtract(amount: number, unit: string): CalendariaMoment {
    return this.add(-amount, unit);
  }

  /**
   * Get the difference between this and another moment.
   */
  diff(other: CalendariaMoment, unit?: string, /*asFloat?: boolean*/): number {
    const diffMs = this.valueOf() - other.valueOf();
    
    if (!unit) {
      return diffMs;
    }
    
    const calendarUnit = this._toCalendarUnit(unit);
    const otherDate = other._calendariaDate;

    // Convert ms to the appropriate unit
    switch (calendarUnit) {
      case 'year': {
        return -CalendarAdapter.yearsBetween(this._calendariaDate, otherDate);
      }
      case 'month': {
        return -CalendarAdapter.monthsBetween(this._calendariaDate, otherDate);
      }
      case 'week': {
        throw new Error('I guess we need to support weeks')
      }
      case 'day': {
        return -CalendarAdapter.daysBetween(this._calendariaDate, otherDate);
      }
      case 'hour': {
        return -CalendarAdapter.hoursBetween(this._calendariaDate, otherDate);
      }
      case 'minute': {
        return -CalendarAdapter.minutesBetween(this._calendariaDate, otherDate);
      }
      case 'second': {
        return -CalendarAdapter.secondsBetween(this._calendariaDate, otherDate);
      }
      case 'millisecond': {
        throw new Error('I guess we need to support milliseconds')
      }
      default:
        return diffMs;
    }
  }

  // ==================== Start/End Of ====================

  /**
   * Snap to the start of a unit.
   */
  startOf(unit: string): CalendariaMoment {
    const calendarUnit = this._toCalendarUnit(unit);
    this._calendariaDate = CalendarAdapter.snapToStart(
      this._calendariaDate,
      calendarUnit
    );

    return this;
  }

  /**
   * Snap to the end of a unit.
   */
  endOf(unit: string): CalendariaMoment {
    const calendarUnit = this._toCalendarUnit(unit);
    this._calendariaDate = CalendarAdapter.snapToEnd(
      this._calendariaDate,
      calendarUnit
    );

    return this;
  }

  // ==================== Comparison ====================

  /**
   * Check if this moment is the same as another in the given unit.
   * Handles both CalendariaMoment and raw numbers (from Date.now()).
   */
  isSame(other: CalendariaMoment | number, unit?: string): boolean {
    // Handle raw number (e.g., Date.now())
    const otherMoment = typeof other === 'number' 
      ? CalendariaMoment.create(other) 
      : other;
    
    if (!unit) {
      return this.valueOf() === otherMoment.valueOf();
    }
    
    const calendarUnit = this._toCalendarUnit(unit);
    
    switch (calendarUnit) {
      case 'year':
        return this.year() === otherMoment.year();
      case 'month':
        return this.year() === otherMoment.year() && this.month() === otherMoment.month();
      case 'week': 
        return this.year() === otherMoment.year() && this.week() === otherMoment.week();
      case 'day':
        return CalendarAdapter.calendariaToAbsolute(this._calendariaDate) ===
          CalendarAdapter.calendariaToAbsolute(otherMoment._calendariaDate);
      case 'hour':
        return CalendarAdapter.calendariaToAbsolute(this._calendariaDate) ===
          CalendarAdapter.calendariaToAbsolute(otherMoment._calendariaDate) &&
          (this._calendariaDate.hour ?? 0) === (otherMoment._calendariaDate.hour ?? 0);
      case 'minute':
        return CalendarAdapter.calendariaToAbsolute(this._calendariaDate) ===
          CalendarAdapter.calendariaToAbsolute(otherMoment._calendariaDate) &&
          (this._calendariaDate.hour ?? 0) === (otherMoment._calendariaDate.hour ?? 0) &&
          (this._calendariaDate.minute ?? 0) === (otherMoment._calendariaDate.minute ?? 0);
      case 'second':
        return CalendarAdapter.calendariaToAbsolute(this._calendariaDate) ===
          CalendarAdapter.calendariaToAbsolute(otherMoment._calendariaDate) &&
          (this._calendariaDate.hour ?? 0) === (otherMoment._calendariaDate.hour ?? 0) &&
          (this._calendariaDate.minute ?? 0) === (otherMoment._calendariaDate.minute ?? 0) &&
          (this._calendariaDate.second ?? 0) === (otherMoment._calendariaDate.second ?? 0);
      default:
        return this.valueOf() === otherMoment.valueOf();
    }
  }

  /**
   * Check if this moment is before another.
   * Handles both CalendariaMoment and raw numbers.
   */
  isBefore(other: CalendariaMoment | number, unit?: string): boolean {
    const otherMoment = typeof other === 'number' 
      ? CalendariaMoment.create(other) 
      : other;
    
    if (!unit) {
      return this.valueOf() < otherMoment.valueOf();
    }
    // Clone before startOf to avoid mutating this instance
    return this.clone().startOf(unit).valueOf() < otherMoment.clone().startOf(unit).valueOf();
  }

  /**
   * Check if this moment is after another.
   * Handles both CalendariaMoment and raw numbers.
   */
  isAfter(other: CalendariaMoment | number, unit?: string): boolean {
    const otherMoment = typeof other === 'number' 
      ? CalendariaMoment.create(other) 
      : other;
    
    if (!unit) {
      return this.valueOf() > otherMoment.valueOf();
    }
    // Clone before startOf to avoid mutating this instance
    return this.clone().startOf(unit).valueOf() > otherMoment.clone().startOf(unit).valueOf();
  }

  // ==================== Formatting ====================

  /**
   * Format this moment using moment.js-style format strings.
   * Supports: whatever calendaria does... some may not match
   *    ISO - will have to watch and correct as needed
   */
  format(fmt?: string): string {
    if (!fmt) {
      return CalendarAdapter.formatDate(this._calendariaDate, 'ordinalEra');
    }
    
    return CalendarAdapter.formatDate(this._calendariaDate, fmt);
  }

  // ==================== Utility ====================

  /**
   * Convert moment.js unit string to CalendarTimeUnit.
   */
  private _toCalendarUnit(unit: string): CalendarTimeUnit {
    const unitMap: Record<string, CalendarTimeUnit> = {
      'y': 'year',
      'year': 'year',
      'years': 'year',
      'M': 'month',
      'month': 'month',
      'months': 'month',
      'w': 'week',
      'week': 'week',
      'weeks': 'week',
      'd': 'day',
      'day': 'day',
      'days': 'day',
      'h': 'hour',
      'hour': 'hour',
      'hours': 'hour',
      'm': 'minute',
      'minute': 'minute',
      'minutes': 'minute',
      's': 'second',
      'second': 'second',
      'seconds': 'second',
      'ms': 'millisecond',
      'millisecond': 'millisecond',
      'milliseconds': 'millisecond',
    };
    if (!unitMap[unit]) {
      throw new Error('Invalid unit: ' + unit);
    }
    return unitMap[unit];
  }

  // ==================== Static Methods ====================

  /**
   * Check if an object is a moment.
   * Required for vis-timeline compatibility.
   */
  static isMoment(obj: unknown): boolean {
    return obj instanceof CalendariaMoment;
  }

  /**
   * Get the minimum of two moments.
   */
  static min(a: CalendariaMoment, b: CalendariaMoment): CalendariaMoment {
    return a.valueOf() < b.valueOf() ? a : b;
  }

  /**
   * Get the maximum of two moments.
   */
  static max(a: CalendariaMoment, b: CalendariaMoment): CalendariaMoment {
    return a.valueOf() > b.valueOf() ? a : b;
  }
}

/**
 * Factory function compatible with vis-timeline's moment option.
 * Usage: options.moment = calendariaMomentFactory
 */
const calendariaMomentFactory = (input?: Date | number | string | CalendariaMoment | null): CalendariaMoment => {
  return CalendariaMoment.create(input ?? undefined);
};

// Add static methods to the factory
calendariaMomentFactory.isMoment = CalendariaMoment.isMoment;
calendariaMomentFactory.min = CalendariaMoment.min;
calendariaMomentFactory.max = CalendariaMoment.max;

export default calendariaMomentFactory;
export { CalendariaMoment };
