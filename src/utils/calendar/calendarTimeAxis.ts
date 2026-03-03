/**
 * Calendar-aware time axis utilities for vis-timeline.
 * 
 * Since vis-timeline doesn't support custom time axis scales, this module provides:
 * 1. Background items to visually mark calendar month/year boundaries
 * 2. Custom format functions for axis labels
 * 3. Calendar-aware tick position data for custom rendering
 */

import CalendarAdapter from './calendarAdapter';
import type { CalendariaDate, CalendarTimeUnit, } from '@/types';

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
// interface CalendarBackgroundItem {
//   id: string;
//   content: string;
//   start: Date;
//   end?: Date;
//   type: 'background';
//   className: string;
// }

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
  // generateMonthBackgroundItems: (start: Date, end: Date): CalendarBackgroundItem[] => {
  //   const cal = CalendarAdapter.getActiveCalendar();

  //   const items: CalendarBackgroundItem[] = [];
    
  //   const startCalDate = CalendarAdapter.jsToCalendaria(start);
  //   const endCalDate = CalendarAdapter.jsToCalendaria(end);
    
  //   const monthCount = cal.months.length;
  //   let itemIndex = 0;
    
  //   for (let year = startCalDate.year; year <= endCalDate.year; year++) {
  //     const startMonth = year === startCalDate.year ? startCalDate.month : 0;
  //     const endMonth = year === endCalDate.year ? endCalDate.month : monthCount - 1;
      
  //     for (let month = startMonth; month <= endMonth; month++) {
  //       // Check for leap year adjustments if applicable
  //       const actualDays = CalendarAdapter.daysInMonth(year, month);
        
  //       const monthStart: CalendariaDate = { year, month, day: 1 };
  //       const monthEnd: CalendariaDate = { year, month, day: actualDays };
        
  //       const jsStart = CalendarAdapter.calendariaToJS(monthStart);
  //       const jsEnd = CalendarAdapter.calendariaToJS(monthEnd);
        
  //       // Alternate background colors for visual distinction
  //       const isEvenMonth = month % 2 === 0;
        
  //       items.push({
  //         id: `calendar-month-${itemIndex++}`,
  //         content: '',
  //         start: jsStart,
  //         end: jsEnd,
  //         type: 'background',
  //         className: isEvenMonth ? 'calendar-month-even' : 'calendar-month-odd',
  //       });
  //     }
  //   }
    
  //   return items;
  // },

  /**
   * Generate background items to mark year boundaries.
   * @param start - Start of visible range
   * @param end - End of visible range
   * @returns Array of background items for vis-timeline
   */
  // generateYearBackgroundItems: (start: Date, end: Date): CalendarBackgroundItem[] => {
  //   const items: CalendarBackgroundItem[] = [];
    
  //   const startCalDate = CalendarAdapter.jsToCalendaria(start);
  //   const endCalDate = CalendarAdapter.jsToCalendaria(end);
    
  //   let itemIndex = 0;
    
  //   for (let year = startCalDate.year; year <= endCalDate.year; year++) {
  //     const yearStart: CalendariaDate = { year, month: 0, day: 1 };
  //     const yearEnd: CalendariaDate = CalendarAdapter.snapToEnd(yearStart, 'year');
      
  //     const jsStart = CalendarAdapter.calendariaToJS(yearStart);
  //     const jsEnd = CalendarAdapter.calendariaToJS(yearEnd);
      
  //     const isEvenYear = year % 2 === 0;
      
  //     items.push({
  //       id: `calendar-year-${itemIndex++}`,
  //       content: '',
  //       start: jsStart,
  //       end: jsEnd,
  //       type: 'background',
  //       className: isEvenYear ? 'calendar-year-even' : 'calendar-year-odd',
  //     });
  //   }
    
  //   return items;
  // },


  /**
   * Generate ticks for the timeline axis based on the active calendar.
   * @param config - Configuration for tick generation
   * @returns Array of major and minor ticks
   */
  // generateTicks: (config: TimeAxisConfig): TimeAxisTick[] => {
  //   const start = CalendarAdapter.jsToCalendaria(config.start);
  //   const end = CalendarAdapter.jsToCalendaria(config.end); 
    
  //   // Determine the best zoom level based on the visible range
  //   const zoomLevel = CalendarAdapter.getBestZoomLevel(start, end);
  //   const majorUnit = zoomLevel.unit;
  //   const minorUnit = zoomLevel.snapUnit;
    
  //   // Calculate approximate days visible
  //   const daysVisible = CalendarAdapter.daysBetween(CalendarAdapter.jsToCalendaria(config.start), CalendarAdapter.jsToCalendaria(config.end));
  //   const pixelsPerDay = config.width / daysVisible;
    
  //   // Generate ticks based on the zoom level
  //   const ticks: TimeAxisTick[] = [];
    
  //   // Get calendar-aware start and end dates
  //   const startCalDate = CalendarAdapter.jsToCalendaria(config.start);
  //   const endCalDate = CalendarAdapter.jsToCalendaria(config.end);
    
  //   // Generate minor ticks
  //   const minorTicks = CalendarTimeAxis.generateMinorTicks(
  //     startCalDate,
  //     endCalDate,
  //     minorUnit,
  //     pixelsPerDay,
  //     config.minTickSpacing
  //   );
    
  //   // Generate major ticks
  //   const majorTicks = CalendarTimeAxis.generateMajorTicks(
  //     startCalDate,
  //     endCalDate,
  //     majorUnit,
  //     pixelsPerDay,
  //     config.minTickSpacing * 2
  //   );
    
  //   // Combine and mark ticks
  //   for (const tick of minorTicks) {
  //     ticks.push({
  //       ...tick,
  //       isMajor: false,
  //     });
  //   }
    
  //   for (const tick of majorTicks) {
  //     ticks.push({
  //       ...tick,
  //       isMajor: true,
  //     });
  //   }
    
  //   // Sort ticks by date
  //   ticks.sort((a, b) => a.date.getTime() - b.date.getTime());
    
  //   return ticks;
  // },

  /**
   * Generate minor ticks at the appropriate calendar boundaries.
   */
  // generateMinorTicks: (
  //   startCalDate: CalendariaDate,
  //   endCalDate: CalendariaDate,
  //   unit: CalendarTimeUnit,
  //   pixelsPerDay: number,
  //   minTickSpacing: number
  // ): Omit<TimeAxisTick, 'isMajor'>[] => {
  //   const ticks: Omit<TimeAxisTick, 'isMajor'>[] = [];
    
  //   switch (unit) {
  //     case 'year':
  //       CalendarTimeAxis.generateYearTicks(startCalDate, endCalDate, ticks);
  //       break;
        
  //     case 'month':
  //       CalendarTimeAxis.generateMonthTicks(
  //         startCalDate, endCalDate, ticks, 'month', false
  //       );
  //       break;
        
  //     case 'week':
  //       CalendarTimeAxis.generateWeekTicks(
  //         startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
  //       );
  //       break;
        
  //     case 'day':
  //       CalendarTimeAxis.generateDayTicks(
  //         startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
  //       );
  //       break;
        
  //     default:
  //       CalendarTimeAxis.generateDayTicks(
  //         startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
  //       );
  //   }
    
  //   return ticks;
  // },

  /**
   * Generate major ticks at larger calendar boundaries.
   */
  // generateMajorTicks: (
  //   startCalDate: CalendariaDate,
  //   endCalDate: CalendariaDate,
  //   unit: CalendarTimeUnit,
  //   pixelsPerDay: number,
  //   minTickSpacing: number
  // ): Omit<TimeAxisTick, 'isMajor'>[] => {
  //   const ticks: Omit<TimeAxisTick, 'isMajor'>[] = [];
    
  //   switch (unit) {
  //     case 'year':
  //       for (let year = startCalDate.year; year <= endCalDate.year; year++) {
  //         const tickDate: CalendariaDate = { year, month: 0, day: 1 };
  //         const jsDate = CalendarAdapter.calendariaToJS(tickDate);
  //         ticks.push({
  //           date: jsDate,
  //           label: CalendarAdapter.formatDate(tickDate, 'era') || CalendarAdapter.formatDate(tickDate, 'y'),
  //           unit: 'year',
  //         });
  //       }
  //       break;
        
  //     case 'month':
  //       for (let year = startCalDate.year; year <= endCalDate.year; year++) {
  //         const tickDate: CalendariaDate = { year, month: 0, day: 1 };
  //         const jsDate = CalendarAdapter.calendariaToJS(tickDate);
  //         ticks.push({
  //           date: jsDate,
  //           label: String(year),
  //           unit: 'year',
  //         });
  //       }
  //       break;
        
  //     case 'week':
  //     case 'day':
  //       CalendarTimeAxis.generateMonthTicks(
  //         startCalDate, endCalDate, ticks, 'month', true
  //       );
  //       break;
        
  //     default:
  //       CalendarTimeAxis.generateDayTicks(
  //         startCalDate, endCalDate, ticks, pixelsPerDay, minTickSpacing
  //       );
  //   }
    
  //   return ticks;
  // },

  /**
   * Generate ticks at year boundaries.
   */
  // generateYearTicks: (
  //   startCalDate: CalendariaDate,
  //   endCalDate: CalendariaDate,
  //   ticks: Omit<TimeAxisTick, 'isMajor'>[]
  // ): void => {
  //   for (let year = startCalDate.year; year <= endCalDate.year; year++) {
  //     const tickDate: CalendariaDate = { year, month: 0, day: 1 };
  //     const jsDate = CalendarAdapter.calendariaToJS(tickDate);
  //     ticks.push({
  //       date: jsDate,
  //       label: String(year),
  //       unit: 'year',
  //     });
  //   }
  // },

  /**
   * Generate ticks at each month boundary in the calendar.
   */
  // generateMonthTicks: (
  //   startCalDate: CalendariaDate,
  //   endCalDate: CalendariaDate,
  //   ticks: Omit<TimeAxisTick, 'isMajor'>[],
  //   unit: CalendarTimeUnit,
  //   isMajor: boolean
  // ): void => {
  //   const monthCount = CalendarAdapter.monthsInYear();
    
  //   for (let year = startCalDate.year; year <= endCalDate.year; year++) {
  //     const startMonth = year === startCalDate.year ? startCalDate.month : 0;
  //     const endMonth = year === endCalDate.year ? endCalDate.month : monthCount - 1;
      
  //     for (let month = startMonth; month <= endMonth; month++) {
  //       const tickDate: CalendariaDate = { year, month, day: 1 };
  //       const jsDate = CalendarAdapter.calendariaToJS(tickDate);
        
  //       const label = isMajor 
  //         ? CalendarAdapter.formatDate(tickDate, 'MMMM y')
  //         : CalendarAdapter.formatDate(tickDate, 'MMM');
        
  //       ticks.push({
  //         date: jsDate,
  //         label,
  //         unit,
  //       });
  //     }
  //   }
  // },

  /**
   * Generate ticks at week boundaries.
   */
  // generateWeekTicks: (
  //   startCalDate: CalendariaDate,
  //   endCalDate: CalendariaDate,
  //   ticks: Omit<TimeAxisTick, 'isMajor'>[],
  //   pixelsPerDay: number,
  //   minTickSpacing: number
  // ): void => {
  //   const daysPerTick = Math.max(1, Math.floor(minTickSpacing / pixelsPerDay));
    
  //   const weekDayIdx = parseInt(CalendarAdapter.formatDate(startCalDate, 'e'));
  //   const weekStart = CalendarAdapter.calendariaToAbsolute(startCalDate) - weekDayIdx;
    
  //   for (let day = weekStart; day <= CalendarAdapter.calendariaToAbsolute(endCalDate); day += daysPerTick) {
  //     const calDate: CalendariaDate = CalendarAdapter.absoluteToCalendaria(day);
  //     const jsDate = CalendarAdapter.calendariaToJS(calDate);
  //     const weekNumber = CalendarAdapter.formatDate(calDate, 'w');
  //     ticks.push({
  //       date: jsDate,
  //       label: `W${weekNumber}`,
  //       unit: 'week',
  //     });
  //   }
  // },

  /**
   * Generate ticks at day boundaries.
   */
//   generateDayTicks: (
//     startCalDate: CalendariaDate,
//     endCalDate: CalendariaDate,
//     ticks: Omit<TimeAxisTick, 'isMajor'>[],
//     pixelsPerDay: number,
//     minTickSpacing: number
//   ): void => {
//     const daysPerTick = Math.max(1, Math.floor(minTickSpacing / pixelsPerDay));
    
//     for (let day = CalendarAdapter.calendariaToAbsolute(startCalDate); day <= CalendarAdapter.calendariaToAbsolute(endCalDate); day += daysPerTick) {
//       const calDate = CalendarAdapter.absoluteToCalendaria(day);
//       const jsDate = CalendarAdapter.calendariaToJS(calDate);
      
//       const weekdayName = CalendarAdapter.formatDate(calDate, 'EEEE');
//       ticks.push({
//         date: jsDate,
//         label: `${weekdayName} ${calDate.day}`,
//         unit: 'day',
//       });
//     }
//   },
};

export default CalendarTimeAxis;
