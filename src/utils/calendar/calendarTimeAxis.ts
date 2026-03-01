/**
 * Calendar-aware time axis utilities for vis-timeline.
 * 
 * Since vis-timeline doesn't support custom time axis scales, this module provides:
 * 1. Background items to visually mark calendar month/year boundaries
 * 2. Custom format functions for axis labels
 * 3. Calendar-aware tick position data for custom rendering
 */

import CalendarAdapter from './calendarAdapter';
import MockCalendariaService from '@/utils/mockCalendaria';
import type { CalendarDate, CalendarDefinition, CalendarTimeUnit, NormalizedDate } from '@/types';

/**
 * Represents a tick mark on the time axis.
 */
interface TimeAxisTick {
  /** JavaScript Date for the tick position */
  date: Date;
  /** Label to display for this tick */
  label: string;
  /** Whether this is a major tick (larger unit boundary) */
  isMajor: boolean;
  /** The calendar unit this tick represents */
  unit: CalendarTimeUnit;
}

/**
 * Configuration for generating time axis ticks.
 */
interface TimeAxisConfig {
  /** Start of visible range */
  start: Date;
  /** End of visible range */
  end: Date;
  /** Minimum pixels between ticks */
  minTickSpacing: number;
  /** Width of the timeline container in pixels */
  width: number;
}

/**
 * Background item for marking calendar boundaries.
 */
interface CalendarBackgroundItem {
  id: string;
  content: string;
  start: Date;
  end?: Date;
  type: 'background';
  className: string;
}

/**
 * Calendar-aware time axis utilities.
 */
const CalendarTimeAxis = {
  /**
   * Generate background items to mark calendar month boundaries.
   * These create visual vertical lines or shaded regions at each month start.
   * @param start - Start of visible range
   * @param end - End of visible range
   * @returns Array of background items for vis-timeline
   */
  generateMonthBackgroundItems: (start: Date, end: Date): CalendarBackgroundItem[] => {
    const calendar = CalendarAdapter.getActiveCalendarDefinition();
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const items: CalendarBackgroundItem[] = [];
    
    const startCalDate = CalendarAdapter.jsDateToCalendarDate(start);
    const endCalDate = CalendarAdapter.jsDateToCalendarDate(end);
    
    const monthCount = calendar.months.length;
    let itemIndex = 0;
    
    for (let year = startCalDate.year; year <= endCalDate.year; year++) {
      const startMonth = year === startCalDate.year ? startCalDate.month : 0;
      const endMonth = year === endCalDate.year ? endCalDate.month : monthCount - 1;
      
      for (let month = startMonth; month <= endMonth; month++) {
        // Check for leap year adjustments if applicable
        const actualDays = CalendarTimeAxis.getDaysInMonth(calendarId, year, month);
        
        const monthStart: CalendarDate = { year, month, day: 1 };
        const monthEnd: CalendarDate = { year, month, day: actualDays };
        
        const jsStart = MockCalendariaService.normalizedToJSDate(
          MockCalendariaService.normalizeDate(calendarId, monthStart)
        );
        const jsEnd = MockCalendariaService.normalizedToJSDate(
          MockCalendariaService.normalizeDate(calendarId, monthEnd)
        );
        
        // Alternate background colors for visual distinction
        const isEvenMonth = month % 2 === 0;
        
        items.push({
          id: `calendar-month-${itemIndex++}`,
          content: '',
          start: jsStart,
          end: jsEnd,
          type: 'background',
          className: isEvenMonth ? 'calendar-month-even' : 'calendar-month-odd',
        });
      }
    }
    
    return items;
  },

  /**
   * Generate background items to mark year boundaries.
   * @param start - Start of visible range
   * @param end - End of visible range
   * @returns Array of background items for vis-timeline
   */
  generateYearBackgroundItems: (start: Date, end: Date): CalendarBackgroundItem[] => {
    const calendar = CalendarAdapter.getActiveCalendarDefinition();
    const calendarId = CalendarAdapter.getActiveCalendarId();
    const items: CalendarBackgroundItem[] = [];
    
    const startCalDate = CalendarAdapter.jsDateToCalendarDate(start);
    const endCalDate = CalendarAdapter.jsDateToCalendarDate(end);
    
    let itemIndex = 0;
    
    for (let year = startCalDate.year; year <= endCalDate.year; year++) {
      const yearStart: CalendarDate = { year, month: 0, day: 1 };
      const yearEnd: CalendarDate = { year, month: calendar.months.length - 1, day: 31 };
      
      const jsStart = MockCalendariaService.normalizedToJSDate(
        MockCalendariaService.normalizeDate(calendarId, yearStart)
      );
      const jsEnd = MockCalendariaService.normalizedToJSDate(
        MockCalendariaService.normalizeDate(calendarId, yearEnd)
      );
      
      const isEvenYear = year % 2 === 0;
      
      items.push({
        id: `calendar-year-${itemIndex++}`,
        content: '',
        start: jsStart,
        end: jsEnd,
        type: 'background',
        className: isEvenYear ? 'calendar-year-even' : 'calendar-year-odd',
      });
    }
    
    return items;
  },

  /**
   * Get the number of days in a specific month.
   * @param calendarId - Calendar ID
   * @param _year - Year (unused but kept for future leap year support)
   * @param month - Month index
   * @returns Number of days in the month
   */
  getDaysInMonth: (calendarId: string, _year: number, month: number): number => {
    const calendar = MockCalendariaService.getCalendar(calendarId);
    if (!calendar) {
      return 30;
    }
    
    const monthDef = calendar.months[month];
    if (!monthDef) {
      return 30;
    }
    
    return monthDef.days;
  },

  /**
   * Generate ticks for the timeline axis based on the active calendar.
   * @param config - Configuration for tick generation
   * @returns Array of major and minor ticks
   */
  generateTicks: (config: TimeAxisConfig): TimeAxisTick[] => {
    const calendar = CalendarAdapter.getActiveCalendarDefinition();
    const calendarId = CalendarAdapter.getActiveCalendarId();
    
    // Determine the best zoom level based on the visible range
    const zoomLevel = CalendarAdapter.getBestZoomLevel(config.start, config.end);
    const majorUnit = zoomLevel.unit;
    const minorUnit = zoomLevel.snapUnit;
    
    // Calculate approximate days visible
    const daysVisible = CalendarAdapter.getDaysBetween(config.start, config.end);
    const pixelsPerDay = config.width / daysVisible;
    
    // Generate ticks based on the zoom level
    const ticks: TimeAxisTick[] = [];
    
    // Get calendar-aware start and end dates
    const startCalDate = CalendarAdapter.jsDateToCalendarDate(config.start);
    const endCalDate = CalendarAdapter.jsDateToCalendarDate(config.end);
    
    // Generate minor ticks
    const minorTicks = CalendarTimeAxis.generateMinorTicks(
      calendar,
      calendarId,
      startCalDate,
      endCalDate,
      minorUnit,
      pixelsPerDay,
      config.minTickSpacing
    );
    
    // Generate major ticks
    const majorTicks = CalendarTimeAxis.generateMajorTicks(
      calendar,
      calendarId,
      startCalDate,
      endCalDate,
      majorUnit,
      pixelsPerDay,
      config.minTickSpacing * 2
    );
    
    // Combine and mark ticks
    for (const tick of minorTicks) {
      ticks.push({
        ...tick,
        isMajor: false,
      });
    }
    
    for (const tick of majorTicks) {
      ticks.push({
        ...tick,
        isMajor: true,
      });
    }
    
    // Sort ticks by date
    ticks.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return ticks;
  },

  /**
   * Generate minor ticks at the appropriate calendar boundaries.
   */
  generateMinorTicks: (
    calendar: CalendarDefinition,
    calendarId: string,
    startCalDate: CalendarDate,
    endCalDate: CalendarDate,
    unit: CalendarTimeUnit,
    pixelsPerDay: number,
    minTickSpacing: number
  ): Omit<TimeAxisTick, 'isMajor'>[] => {
    const ticks: Omit<TimeAxisTick, 'isMajor'>[] = [];
    
    switch (unit) {
      case 'year':
        CalendarTimeAxis.generateYearTicks(calendar, calendarId, startCalDate, endCalDate, ticks);
        break;
        
      case 'month':
        CalendarTimeAxis.generateMonthTicks(
          calendar, calendarId, startCalDate, endCalDate, ticks, 'month', false
        );
        break;
        
      case 'week':
        CalendarTimeAxis.generateWeekTicks(
          calendar, calendarId, startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
        );
        break;
        
      case 'day':
        CalendarTimeAxis.generateDayTicks(
          calendar, calendarId, startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
        );
        break;
        
      default:
        CalendarTimeAxis.generateDayTicks(
          calendar, calendarId, startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
        );
    }
    
    return ticks;
  },

  /**
   * Generate major ticks at larger calendar boundaries.
   */
  generateMajorTicks: (
    calendar: CalendarDefinition,
    calendarId: string,
    startCalDate: CalendarDate,
    endCalDate: CalendarDate,
    unit: CalendarTimeUnit,
    pixelsPerDay: number,
    minTickSpacing: number
  ): Omit<TimeAxisTick, 'isMajor'>[] => {
    const ticks: Omit<TimeAxisTick, 'isMajor'>[] = [];
    
    switch (unit) {
      case 'year':
        for (let year = startCalDate.year; year <= endCalDate.year; year++) {
          const tickDate: CalendarDate = { year, month: 0, day: 1 };
          const jsDate = MockCalendariaService.normalizedToJSDate(
            MockCalendariaService.normalizeDate(calendarId, tickDate)
          );
          ticks.push({
            date: jsDate,
            label: calendar.epochDescription ?? String(year),
            unit: 'year',
          });
        }
        break;
        
      case 'month':
        for (let year = startCalDate.year; year <= endCalDate.year; year++) {
          const tickDate: CalendarDate = { year, month: 0, day: 1 };
          const jsDate = MockCalendariaService.normalizedToJSDate(
            MockCalendariaService.normalizeDate(calendarId, tickDate)
          );
          ticks.push({
            date: jsDate,
            label: String(year),
            unit: 'year',
          });
        }
        break;
        
      case 'week':
      case 'day':
        CalendarTimeAxis.generateMonthTicks(
          calendar, calendarId, startCalDate, endCalDate, ticks, 'month', true
        );
        break;
        
      default:
        CalendarTimeAxis.generateDayTicks(
          calendar, calendarId, startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
        );
    }
    
    return ticks;
  },

  /**
   * Generate ticks at year boundaries.
   */
  generateYearTicks: (
    _calendar: CalendarDefinition,
    calendarId: string,
    startCalDate: CalendarDate,
    endCalDate: CalendarDate,
    ticks: Omit<TimeAxisTick, 'isMajor'>[]
  ): void => {
    for (let year = startCalDate.year; year <= endCalDate.year; year++) {
      const tickDate: CalendarDate = { year, month: 0, day: 1 };
      const jsDate = MockCalendariaService.normalizedToJSDate(
        MockCalendariaService.normalizeDate(calendarId, tickDate)
      );
      ticks.push({
        date: jsDate,
        label: String(year),
        unit: 'year',
      });
    }
  },

  /**
   * Generate ticks at each month boundary in the calendar.
   */
  generateMonthTicks: (
    calendar: CalendarDefinition,
    calendarId: string,
    startCalDate: CalendarDate,
    endCalDate: CalendarDate,
    ticks: Omit<TimeAxisTick, 'isMajor'>[],
    unit: CalendarTimeUnit,
    isMajor: boolean
  ): void => {
    const monthCount = calendar.months.length;
    
    for (let year = startCalDate.year; year <= endCalDate.year; year++) {
      const startMonth = year === startCalDate.year ? startCalDate.month : 0;
      const endMonth = year === endCalDate.year ? endCalDate.month : monthCount - 1;
      
      for (let month = startMonth; month <= endMonth; month++) {
        const tickDate: CalendarDate = { year, month, day: 1 };
        const jsDate = MockCalendariaService.normalizedToJSDate(
          MockCalendariaService.normalizeDate(calendarId, tickDate)
        );
        
        const monthDef = calendar.months[month];
        const label = isMajor 
          ? `${monthDef?.name ?? 'Unknown'} ${year}`
          : (monthDef?.shortName ?? String(month + 1));
        
        ticks.push({
          date: jsDate,
          label,
          unit,
        });
      }
    }
  },

  /**
   * Generate ticks at week boundaries.
   */
  generateWeekTicks: (
    calendar: CalendarDefinition,
    calendarId: string,
    startCalDate: CalendarDate,
    endCalDate: CalendarDate,
    ticks: Omit<TimeAxisTick, 'isMajor'>[],
    pixelsPerDay: number,
    minTickSpacing: number
  ): void => {
    const weekLength = calendar.week.days;
    const daysPerTick = Math.max(1, Math.floor(minTickSpacing / pixelsPerDay));
    
    const startNorm = MockCalendariaService.normalizeDate(calendarId, startCalDate);
    const weekStart = Math.floor(startNorm.absoluteDay / weekLength) * weekLength;
    
    const endNorm = MockCalendariaService.normalizeDate(calendarId, endCalDate);
    
    for (let day = weekStart; day <= endNorm.absoluteDay; day += daysPerTick) {
      const normDate: NormalizedDate = { absoluteDay: day, dayFraction: 0, calendarId };
      const jsDate = MockCalendariaService.normalizedToJSDate(normDate);
      
      const weekNumber = Math.floor(day / weekLength) + 1;
      ticks.push({
        date: jsDate,
        label: `W${weekNumber}`,
        unit: 'week',
      });
    }
  },

  /**
   * Generate ticks at day boundaries.
   */
  generateDayTicks: (
    calendar: CalendarDefinition,
    calendarId: string,
    startCalDate: CalendarDate,
    endCalDate: CalendarDate,
    ticks: Omit<TimeAxisTick, 'isMajor'>[],
    pixelsPerDay: number,
    minTickSpacing: number
  ): void => {
    const daysPerTick = Math.max(1, Math.floor(minTickSpacing / pixelsPerDay));
    
    const startNorm = MockCalendariaService.normalizeDate(calendarId, startCalDate);
    const endNorm = MockCalendariaService.normalizeDate(calendarId, endCalDate);
    
    for (let day = startNorm.absoluteDay; day <= endNorm.absoluteDay; day += daysPerTick) {
      const normDate: NormalizedDate = { absoluteDay: day, dayFraction: 0, calendarId };
      const jsDate = MockCalendariaService.normalizedToJSDate(normDate);
      const calDate = MockCalendariaService.denormalizeDate(calendarId, normDate);
      
      const weekdayIndex = MockCalendariaService.getWeekday(calendarId, calDate);
      const weekdayName = calendar.week.dayShortNames[weekdayIndex] ?? String(calDate.day);
      
      ticks.push({
        date: jsDate,
        label: `${weekdayName} ${calDate.day}`,
        unit: 'day',
      });
    }
  },
};

export default CalendarTimeAxis;
