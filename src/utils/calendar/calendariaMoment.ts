/**
 * CalendariaMoment - A moment-like wrapper for arbitrary calendar systems.
 * 
 * This implements the minimal moment.js API surface that vis-timeline requires,
 * delegating all operations to the active calendar system via MockCalendariaService.
 * 
 * When injected via `options.moment`, vis-timeline will:
 * - Place ticks at calendar month/year boundaries (not Gregorian)
 * - Format labels with calendar month/weekday names
 * - Step by calendar-aware units
 */

import MockCalendariaService from '@/utils/mockCalendaria';
import type { CalendarDate, CalendarTimeUnit, NormalizedDate } from '@/types';

/**
 * A moment-like object backed by Calendaria calendar system.
 */
class CalendariaMoment {
  private normalized: NormalizedDate;
  private _calendarDate: CalendarDate | null = null;

  /**
   * Create a CalendariaMoment from a normalized date.
   */
  private constructor(normalized: NormalizedDate) {
    this.normalized = normalized;
  }

  /**
   * Get the calendar date (lazy-loaded).
   */
  private get calendarDate(): CalendarDate {
    if (!this._calendarDate) {
      this._calendarDate = MockCalendariaService.denormalizeDate(
        this.normalized.calendarId,
        this.normalized
      );
    }
    return this._calendarDate;
  }

  // ==================== Factory Methods ====================

  /**
   * Create a moment from a JS Date, timestamp, or string.
   * This is the main entry point used by vis-timeline.
   */
  static create(input?: Date | number | string | CalendariaMoment): CalendariaMoment {
    const calendarId = MockCalendariaService.getActiveCalendar().id;
    
    if (input == null) {
      // Current time
      const now = new Date();
      const normalized = MockCalendariaService.jsDateToNormalized(calendarId, now);
      return new CalendariaMoment(normalized);
    }
    
    if (input instanceof CalendariaMoment) {
      return input.clone();
    }
    
    if (input instanceof Date) {
      const normalized = MockCalendariaService.jsDateToNormalized(calendarId, input);
      return new CalendariaMoment(normalized);
    }
    
    if (typeof input === 'number') {
      // Timestamp in milliseconds
      const jsDate = new Date(input);
      const normalized = MockCalendariaService.jsDateToNormalized(calendarId, jsDate);
      return new CalendariaMoment(normalized);
    }
    
    if (typeof input === 'string') {
      // Parse ISO string
      const jsDate = new Date(input);
      const normalized = MockCalendariaService.jsDateToNormalized(calendarId, jsDate);
      return new CalendariaMoment(normalized);
    }
    
    // Fallback to now
    return CalendariaMoment.create(new Date());
  }

  /**
   * Create from a normalized date directly.
   */
  static fromNormalized(normalized: NormalizedDate): CalendariaMoment {
    return new CalendariaMoment({ ...normalized });
  }

  // ==================== Core Methods ====================

  /**
   * Get the millisecond timestamp value.
   */
  valueOf(): number {
    return MockCalendariaService.normalizedToJSDate(this.normalized).getTime();
  }

  /**
   * Convert to JavaScript Date.
   */
  toDate(): Date {
    return MockCalendariaService.normalizedToJSDate(this.normalized);
  }

  /**
   * Create a copy.
   */
  clone(): CalendariaMoment {
    return new CalendariaMoment({ ...this.normalized });
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
   * Get or set the year in the calendar system.
   * When called with an argument, sets the year and returns this for chaining.
   */
  year(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return this.calendarDate.year;
    }
    const cal = this.calendarDate;
    cal.year = value;
    this._renormalize(cal);
    return this;
  }

  /**
   * Get or set the month (0-indexed) in the calendar system.
   * When called with an argument, sets the month and returns this for chaining.
   */
  month(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return this.calendarDate.month;
    }
    const cal = this.calendarDate;
    cal.month = value;
    this._renormalize(cal);
    return this;
  }

  /**
   * Get or set the day of the month in the calendar system.
   * When called with an argument, sets the day and returns this for chaining.
   */
  date(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return this.calendarDate.day;
    }
    const cal = this.calendarDate;
    cal.day = value;
    this._renormalize(cal);
    return this;
  }

  /**
   * Get or set the weekday (0-indexed, where 0 is first day of week).
   * When called with an argument, sets the weekday and returns this for chaining.
   */
  weekday(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return MockCalendariaService.getWeekday(this.normalized.calendarId, this.calendarDate);
    }
    // Set weekday by adjusting the day - clone first to avoid mutation issues
    const currentWeekday = MockCalendariaService.getWeekday(this.normalized.calendarId, this.calendarDate);
    const diff = (value as number) - currentWeekday;
    // Mutate this and return (moment.js behavior)
    this.add(diff, 'day');
    return this;
  }

  /**
   * Get or set the hour (0-23).
   * When called with an argument, sets the hour and returns this for chaining.
   */
  hours(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return this.calendarDate.hour ?? 0;
    }
    const cal = this.calendarDate;
    cal.hour = value;
    this._renormalize(cal);
    return this;
  }

  /**
   * Get or set the minute (0-59).
   * When called with an argument, sets the minute and returns this for chaining.
   */
  minutes(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return this.calendarDate.minute ?? 0;
    }
    const cal = this.calendarDate;
    cal.minute = value;
    this._renormalize(cal);
    return this;
  }

  /**
   * Get or set the second (0-59).
   * When called with an argument, sets the second and returns this for chaining.
   */
  seconds(value?: number): number | CalendariaMoment {
    if (value === undefined) {
      return this.calendarDate.second ?? 0;
    }
    const cal = this.calendarDate;
    cal.second = value;
    this._renormalize(cal);
    return this;
  }

  /**
   * Get or set the millisecond (0-999).
   * When called with an argument, sets the millisecond and returns this for chaining.
   */
  milliseconds(value?: number): number | CalendariaMoment {
    const msPerDay = 86400000;
    if (value === undefined) {
      return Math.round(this.normalized.dayFraction * msPerDay) % 1000;
    }
    // Adjust dayFraction
    const currentMs = this.normalized.dayFraction * msPerDay;
    const newMs = Math.floor(currentMs / 1000) * 1000 + value;
    this.normalized.dayFraction = newMs / msPerDay;
    return this;
  }

  /**
   * Get the day of year (1-indexed).
   */
  dayOfYear(): number {
    const yearStart: CalendarDate = { year: this.calendarDate.year, month: 0, day: 1 };
    const yearStartNorm = MockCalendariaService.normalizeDate(this.normalized.calendarId, yearStart);
    return this.normalized.absoluteDay - yearStartNorm.absoluteDay + 1;
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
    const before = this.valueOf();

    const calendarUnit = this._toCalendarUnit(unit);
    const result = MockCalendariaService.addDuration(
      this.normalized.calendarId,
      this.calendarDate,
      { [calendarUnit]: amount }
    );

    const after = this.valueOf();
    if (amount > 0 && after <= before) {
      throw new Error(`Add: ${amount} ${unit}`);
    }
    if (amount < 0 && after >= before) {
      throw new Error(`Add neg: ${amount} ${unit}`);
    }
    this._renormalize(result);
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
  diff(other: CalendariaMoment, unit?: string, asFloat?: boolean): number {
    const diffMs = this.valueOf() - other.valueOf();
    
    if (!unit) {
      return diffMs;
    }
    
    const calendarUnit = this._toCalendarUnit(unit);
    const calendar = MockCalendariaService.getCalendar(this.normalized.calendarId);
    const monthsPerYear = calendar?.months.length ?? 12;
    const daysPerWeek = calendar?.week.days ?? 7;
    
    // Convert ms to the appropriate unit
    switch (calendarUnit) {
      case 'year': {
        const thisYear = this.year() as number;
        const otherYear = other.year() as number;
        const years = thisYear - otherYear;
        return asFloat ? years : Math.round(years);
      }
      case 'month': {
        const thisYear = this.year() as number;
        const otherYear = other.year() as number;
        const thisMonth = this.month() as number;
        const otherMonth = other.month() as number;
        const months = (thisYear - otherYear) * monthsPerYear + 
                       (thisMonth - otherMonth);
        return asFloat ? months : Math.round(months);
      }
      case 'week': {
        const weeks = diffMs / (daysPerWeek * 86400000);
        return asFloat ? weeks : Math.round(weeks);
      }
      case 'day': {
        const days = diffMs / 86400000;
        return asFloat ? days : Math.round(days);
      }
      case 'hour': {
        const hours = diffMs / 3600000;
        return asFloat ? hours : Math.round(hours);
      }
      case 'minute': {
        const minutes = diffMs / 60000;
        return asFloat ? minutes : Math.round(minutes);
      }
      case 'second': {
        const seconds = diffMs / 1000;
        return asFloat ? seconds : Math.round(seconds);
      }
      case 'millisecond': {
        return asFloat ? diffMs : Math.round(diffMs);
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
    const result = MockCalendariaService.snapToStart(
      this.normalized.calendarId,
      this.calendarDate,
      calendarUnit
    );
    this._renormalize(result);
    return this;
  }

  /**
   * Snap to the end of a unit.
   */
  endOf(unit: string): CalendariaMoment {
    const calendarUnit = this._toCalendarUnit(unit);
    const result = MockCalendariaService.snapToEnd(
      this.normalized.calendarId,
      this.calendarDate,
      calendarUnit
    );
    this._renormalize(result);
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
      case 'week': {
        const calendar = MockCalendariaService.getCalendar(this.normalized.calendarId);
        const daysPerWeek = calendar?.week.days ?? 7;
        const thisWeek = Math.floor(this.normalized.absoluteDay / daysPerWeek);
        const otherWeek = Math.floor(otherMoment.normalized.absoluteDay / daysPerWeek);
        return thisWeek === otherWeek;
      }
      case 'day':
        return this.normalized.absoluteDay === otherMoment.normalized.absoluteDay;
      case 'hour':
        return this.normalized.absoluteDay === otherMoment.normalized.absoluteDay &&
               this.hours() === otherMoment.hours();
      case 'minute':
        return this.normalized.absoluteDay === otherMoment.normalized.absoluteDay &&
               this.hours() === otherMoment.hours() &&
               this.minutes() === otherMoment.minutes();
      case 'second':
        return this.normalized.absoluteDay === otherMoment.normalized.absoluteDay &&
               this.hours() === otherMoment.hours() &&
               this.minutes() === otherMoment.minutes() &&
               this.seconds() === otherMoment.seconds();
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
   * Supports: YYYY, YY, MMMM, MMM, MM, M, DDDD, DDD, DD, D, dddd, ddd, dd, d,
   *           HH, H, hh, h, mm, m, ss, s, A, a
   */
  format(fmt?: string): string {
    if (!fmt) {
      return this.toDate().toISOString();
    }
    
    const calendar = MockCalendariaService.getCalendar(this.normalized.calendarId);
    const cal = this.calendarDate;
    const monthDef = calendar?.months[cal.month];
    const weekdayIdx = this.weekday();
    
    // Replace format tokens
    let result = fmt;
    
    // Year
    result = result.replace(/YYYY/g, String(cal.year));
    result = result.replace(/YY/g, String(cal.year).slice(-2));
    
    // Month
    result = result.replace(/MMMM/g, monthDef?.name ?? 'Unknown');
    result = result.replace(/MMM/g, monthDef?.shortName ?? String(cal.month + 1));
    result = result.replace(/MM/g, String(cal.month + 1).padStart(2, '0'));
    result = result.replace(/M(?=[^M]|$)/g, String(cal.month + 1));
    
    // Day of month
    const dayOfYearVal = this.dayOfYear();
    result = result.replace(/DDDD/g, String(dayOfYearVal).padStart(3, '0'));
    result = result.replace(/DDD/g, String(dayOfYearVal));
    result = result.replace(/DD/g, String(cal.day).padStart(2, '0'));
    result = result.replace(/D(?=[^D]|$)/g, String(cal.day));
    
    // Weekday
    const weekdayIdxNum = weekdayIdx as number;
    result = result.replace(/dddd/g, calendar?.week.dayNames[weekdayIdxNum] ?? 'Unknown');
    result = result.replace(/ddd/g, calendar?.week.dayShortNames[weekdayIdxNum] ?? 'Unk');
    result = result.replace(/dd/g, calendar?.week.dayShortNames[weekdayIdxNum]?.slice(0, 2) ?? 'Un');
    result = result.replace(/d(?=[^d]|$)/g, String(weekdayIdx));
    
    // Hour
    const hour24 = cal.hour ?? 0;
    const hour12 = hour24 % 12 || 12;
    result = result.replace(/HH/g, String(hour24).padStart(2, '0'));
    result = result.replace(/H(?=[^H]|$)/g, String(hour24));
    result = result.replace(/hh/g, String(hour12).padStart(2, '0'));
    result = result.replace(/h(?=[^h]|$)/g, String(hour12));
    
    // Minute
    result = result.replace(/mm/g, String(cal.minute ?? 0).padStart(2, '0'));
    result = result.replace(/m(?=[^m]|$)/g, String(cal.minute ?? 0));
    
    // Second
    result = result.replace(/ss/g, String(cal.second ?? 0).padStart(2, '0'));
    result = result.replace(/s(?=[^s]|$)/g, String(cal.second ?? 0));
    
    // AM/PM
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    result = result.replace(/A/g, ampm);
    result = result.replace(/a/g, ampm.toLowerCase());
    
    return result;
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
    return unitMap[unit] ?? 'day';
  }

  /**
   * Re-normalize after modifying calendar date.
   */
  private _renormalize(calDate: CalendarDate): void {
    this._calendarDate = null;
    this.normalized = MockCalendariaService.normalizeDate(
      this.normalized.calendarId,
      calDate
    );
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
const calendariaMomentFactory = (input?: Date | number | string | CalendariaMoment): CalendariaMoment => {
  return CalendariaMoment.create(input);
};

// Add static methods to the factory
calendariaMomentFactory.isMoment = CalendariaMoment.isMoment;
calendariaMomentFactory.min = CalendariaMoment.min;
calendariaMomentFactory.max = CalendariaMoment.max;

export default calendariaMomentFactory;
export { CalendariaMoment };
