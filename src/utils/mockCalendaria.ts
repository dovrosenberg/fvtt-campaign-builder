/**
 * Mock Calendaria API service for POC testing.
 * Generates 50 test notes with various attributes for testing timeline filtering.
 * Also provides mock calendar metadata for arbitrary calendar systems.
 */

import { 
  CalendariaNote,
  CalendarDefinition,
  CalendarDate,
  CalendarZoomLevel,
  CalendarTimeUnit,
  CalendarDuration,
  NormalizedDate,
} from '@/types';

/** Categories for mock notes */
const CATEGORIES = [
  'Quest',
  'Meeting',
  'Battle',
  'Travel',
  'Discovery',
  'Social',
  'Mystery',
  'Danger',
];

/** Colors for mock notes */
const COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e67e22', // dark orange
  '#34495e', // dark gray
];

/** Icons for mock notes */
const ICONS = [
  'fas fa-sword',
  'fas fa-users',
  'fas fa-map-marker-alt',
  'fas fa-compass',
  'fas fa-book',
  'fas fa-skull',
  'fas fa-gem',
  'fas fa-scroll',
];

/** Sample UUIDs for reference testing */
const SAMPLE_UUIDS = [
  'Compendium.world.campaign.JournalEntry.abc123.JournalEntryPage.entry1',
  'Compendium.world.campaign.JournalEntry.def456.JournalEntryPage.entry2',
  'Compendium.world.campaign.JournalEntry.ghi789.JournalEntryPage.entry3',
  'Compendium.world.campaign.JournalEntry.jkl012.JournalEntryPage.entry4',
  'Compendium.world.campaign.JournalEntry.mno345.JournalEntryPage.entry5',
];

/** Sample names for events */
const EVENT_NAMES = [
  'The Battle of Shadowfell',
  'Council of Elders',
  'Journey to the North',
  'Discovery of the Ancient Temple',
  'Meeting with the King',
  'Ambush at River Crossing',
  'The Great Feast',
  'Investigation of the Murders',
  'Dragon Sighting',
  'Trade Negotiations',
  'Festival of Lights',
  'Secret Alliance Formed',
  'The Missing Artifact',
  'Siege of Castle Blackmoor',
  'Diplomatic Mission',
  'The Prophecy Revealed',
  'Assassination Attempt',
  'Rescue Mission',
  'The Tournament',
  'Dark Ritual Discovered',
  'Alliance with the Elves',
  'The Betrayal',
  'Exploration of the Caves',
  'The Trial',
  'Coronation Ceremony',
  'Monster Hunt',
  'The Plague Outbreak',
  'Pirate Attack',
  'The Wedding',
  'Summoning of the Demon',
  'Peace Treaty Signed',
  'The Heist',
  'Invasion Warning',
  'The Execution',
  'Founding of the Guild',
  'The Miracle',
  'Assassination of the Duke',
  'The Expedition',
  'Conspiracy Uncovered',
  'The Earthquake',
  'Magical Phenomenon',
  'The Election',
  'Bandit Raid',
  'The Curse',
  'Trade Route Opened',
  'The Vision',
  'Kidnapping Rescue',
  'The Storm',
  'Ancient Ritual',
  'The Reunion',
];

/**
 * Generate a random integer between min and max (inclusive).
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a random date within a range.
 * @param startYear - Start year
 * @param endYear - End year
 * @returns Date components
 */
const randomDate = (startYear: number, endYear: number): { year: number; month: number; dayOfMonth: number; hour: number; minute: number } => {
  return {
    year: randomInt(startYear, endYear),
    month: randomInt(0, 11),
    dayOfMonth: randomInt(1, 28),
    hour: randomInt(0, 23),
    minute: randomInt(0, 59),
  };
};

/**
 * Generate mock notes for testing.
 * @param count - Number of notes to generate (default: 50)
 * @returns Array of mock Calendaria notes
 */
const generateMockNotes = (count: number = 50): CalendariaNote[] => {
  const notes: CalendariaNote[] = [];

  for (let i = 0; i < count; i++) {
    const startDate = randomDate(1490, 1495);
    const hasEndDate = Math.random() > 0.7; // 30% chance of being a range event
    const endDate = hasEndDate
      ? {
          year: startDate.year + randomInt(0, 1),
          month: hasEndDate && startDate.month === 11 ? randomInt(0, 5) : randomInt(startDate.month, 11),
          dayOfMonth: randomInt(1, 28),
          hour: randomInt(0, 23),
          minute: randomInt(0, 59),
        }
      : undefined;

    // Pick 1-3 categories
    const numCategories = randomInt(1, 3);
    const shuffledCategories = [...CATEGORIES].sort(() => Math.random() - 0.5);
    const categories = shuffledCategories.slice(0, numCategories);

    // Determine GM-only status
    const gmOnly = Math.random() > 0.8; // 20% chance

    // Build content with optional UUID references
    let content = `<p>Details about ${EVENT_NAMES[i % EVENT_NAMES.length]}.</p>`;
    
    // 40% chance to include a UUID reference
    if (Math.random() > 0.6) {
      const uuid = SAMPLE_UUIDS[randomInt(0, SAMPLE_UUIDS.length - 1)];
      content += `<p>Related to @UUID[${uuid}]{Important Entity}.</p>`;
    }

    // Add some additional content for text search testing
    content += `<p>This event involves dragons, magic, and ancient secrets.</p>`;

    notes.push({
      id: `note-${i + 1}`,
      name: EVENT_NAMES[i % EVENT_NAMES.length],
      content,
      startDate,
      endDate,
      categories,
      color: COLORS[i % COLORS.length],
      icon: ICONS[i % ICONS.length],
      gmOnly,
    });
  }

  return notes;
};

/** Cached mock notes */
let cachedNotes: CalendariaNote[] | null = null;

/**
 * Get mock notes (cached after first generation).
 * @returns Array of mock Calendaria notes
 */
const getMockNotes = (): CalendariaNote[] => {
  if (!cachedNotes) {
    cachedNotes = generateMockNotes(50);
  }
  return cachedNotes;
};

///////////////////////////////////////////////
// Mock Calendar Definitions
///////////////////////////////////////////////

/**
 * Check if a year is a Gregorian leap year.
 * @param year - Year to check
 * @returns True if leap year
 */
function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Check if a year is an Eldorian leap year (every 4 years).
 * @param year - Year to check
 * @returns True if leap year
 */
function isEldorianLeapYear(year: number): boolean {
  return year % 4 === 0;
}

/**
 * Mock Gregorian calendar (standard Earth calendar).
 */
const GREGORIAN_CALENDAR: CalendarDefinition = {
  id: 'gregorian',
  name: 'Gregorian Calendar',
  description: 'Standard Earth calendar with 12 months',
  months: [
    { index: 0, name: 'January', shortName: 'Jan', days: 31 },
    { index: 1, name: 'February', shortName: 'Feb', days: 28 },
    { index: 2, name: 'March', shortName: 'Mar', days: 31 },
    { index: 3, name: 'April', shortName: 'Apr', days: 30 },
    { index: 4, name: 'May', shortName: 'May', days: 31 },
    { index: 5, name: 'June', shortName: 'Jun', days: 30 },
    { index: 6, name: 'July', shortName: 'Jul', days: 31 },
    { index: 7, name: 'August', shortName: 'Aug', days: 31 },
    { index: 8, name: 'September', shortName: 'Sep', days: 30 },
    { index: 9, name: 'October', shortName: 'Oct', days: 31 },
    { index: 10, name: 'November', shortName: 'Nov', days: 30 },
    { index: 11, name: 'December', shortName: 'Dec', days: 31 },
  ],
  week: {
    days: 7,
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayShortNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  zoomLevels: [
    { id: 'year', name: 'Years', unit: 'year', visibleUnits: 10, snapUnit: 'month', scale: 365 },
    { id: 'month', name: 'Months', unit: 'month', visibleUnits: 12, snapUnit: 'day', scale: 30 },
    { id: 'week', name: 'Weeks', unit: 'week', visibleUnits: 8, snapUnit: 'day', scale: 7 },
    { id: 'day', name: 'Days', unit: 'day', visibleUnits: 30, snapUnit: 'day', scale: 1 },
    { id: 'hour', name: 'Hours', unit: 'hour', visibleUnits: 24, snapUnit: 'hour', scale: 1/24 },
  ],
  epochDescription: 'AD/CE era',
  // Gregorian year 0 maps to Jan 1, 1 AD (Unix timestamp for year 1)
  epochOffset: -62135596800000, // new Date(1, 0, 1).getTime() approximated
  daysInYear: (year: number) => isGregorianLeapYear(year) ? 366 : 365,
  hasLeapYears: true,
  isLeapYear: isGregorianLeapYear,
  leapDays: 1,
};

/**
 * Mock fantasy calendar with 14 months (example of arbitrary calendar).
 */
const FANTASY_14_MONTH_CALENDAR: CalendarDefinition = {
  id: 'fantasy-14',
  name: 'Eldoria Calendar',
  description: 'Fantasy calendar with 14 months, 8-day weeks, and leap years every 4 years',
  months: [
    { index: 0, name: 'Frostfall', shortName: 'Fro', days: 28 },
    { index: 1, name: 'Deepwinter', shortName: 'Dee', days: 28 },
    { index: 2, name: 'Snowmelt', shortName: 'Sno', days: 28 },
    { index: 3, name: 'Springrise', shortName: 'Spr', days: 28 },
    { index: 4, name: 'Blossomtide', shortName: 'Blo', days: 28 },
    { index: 5, name: 'Sunpeak', shortName: 'Sun', days: 28 },
    { index: 6, name: 'Highsummer', shortName: 'Hig', days: 28 },
    { index: 7, name: 'Goldleaf', shortName: 'Gol', days: 28 },
    { index: 8, name: 'Harvestmoon', shortName: 'Har', days: 28 },
    { index: 9, name: 'Autumnfall', shortName: 'Aut', days: 28 },
    { index: 10, name: 'Frostreturn', shortName: 'Frr', days: 28 },
    { index: 11, name: 'Darknight', shortName: 'Dar', days: 28 },
    { index: 12, name: 'Starfall', shortName: 'Sta', days: 28 },
    { index: 13, name: 'Yearsend', shortName: 'Yea', days: 28 },
  ],
  week: {
    days: 8,
    dayNames: ['SunDay', 'MoonDay', 'EarthDay', 'FireDay', 'WaterDay', 'WindDay', 'StarDay', 'SpiritDay'],
    dayShortNames: ['Sun', 'Mon', 'Ear', 'Fir', 'Wat', 'Win', 'Sta', 'Spi'],
  },
  zoomLevels: [
    { id: 'year', name: 'Years', unit: 'year', visibleUnits: 10, snapUnit: 'month', scale: 392 },
    { id: 'month', name: 'Months', unit: 'month', visibleUnits: 14, snapUnit: 'day', scale: 28 },
    { id: 'week', name: 'Weeks', unit: 'week', visibleUnits: 8, snapUnit: 'day', scale: 8 },
    { id: 'day', name: 'Days', unit: 'day', visibleUnits: 28, snapUnit: 'day', scale: 1 },
    { id: 'hour', name: 'Hours', unit: 'hour', visibleUnits: 24, snapUnit: 'hour', scale: 1/24 },
  ],
  epochDescription: 'Founding of the Eldorian Empire',
  // Eldoria year 1500 maps to Jan 1, 2024 (Unix timestamp)
  // 1500 * 392 days/year * 86400000 ms/day = offset from year 0 to year 1500
  // Jan 1, 2024 = 1704067200000 ms
  // epochOffset = 1704067200000 - (1500 * 392 * 86400000) = -49090636800000
  epochOffset: -49090636800000,
  daysInYear: (year: number) => isEldorianLeapYear(year) ? 393 : 392,
  hasLeapYears: true,
  isLeapYear: isEldorianLeapYear,
  leapDays: 1,
};

/**
 * Mock calendar with variable month lengths.
 */
const VARIABLE_MONTH_CALENDAR: CalendarDefinition = {
  id: 'variable-months',
  name: 'Lunar Calendar',
  description: 'Calendar with variable month lengths based on lunar cycles',
  months: [
    { index: 0, name: 'New Moon', shortName: 'New', days: 29 },
    { index: 1, name: 'Waxing Crescent', shortName: 'Wax', days: 30 },
    { index: 2, name: 'First Quarter', shortName: 'Fir', days: 29 },
    { index: 3, name: 'Waxing Gibbous', shortName: 'WGb', days: 30 },
    { index: 4, name: 'Full Moon', shortName: 'Ful', days: 29 },
    { index: 5, name: 'Waning Gibbous', shortName: 'WnG', days: 30 },
    { index: 6, name: 'Last Quarter', shortName: 'Las', days: 29 },
    { index: 7, name: 'Waning Crescent', shortName: 'WnC', days: 30 },
    { index: 8, name: 'Dark Moon', shortName: 'Dar', days: 29 },
    { index: 9, name: 'Silver Light', shortName: 'Sil', days: 30 },
    { index: 10, name: 'Golden Crescent', shortName: 'Gol', days: 29 },
    { index: 11, name: 'Harvest Moon', shortName: 'Har', days: 30 },
  ],
  week: {
    days: 10,
    dayNames: ['MoonDay', 'TideDay', 'WaveDay', 'CurrentDay', 'StormDay', 'CalmDay', 'BreezeDay', 'MistDay', 'RainDay', 'ShineDay'],
    dayShortNames: ['Moo', 'Tid', 'Wav', 'Cur', 'Sto', 'Cal', 'Bre', 'Mis', 'Rai', 'Shi'],
  },
  zoomLevels: [
    { id: 'year', name: 'Years', unit: 'year', visibleUnits: 10, snapUnit: 'month', scale: 354 },
    { id: 'month', name: 'Months', unit: 'month', visibleUnits: 12, snapUnit: 'day', scale: 30 },
    { id: 'week', name: 'Weeks', unit: 'week', visibleUnits: 6, snapUnit: 'day', scale: 10 },
    { id: 'day', name: 'Days', unit: 'day', visibleUnits: 30, snapUnit: 'day', scale: 1 },
    { id: 'hour', name: 'Hours', unit: 'hour', visibleUnits: 24, snapUnit: 'hour', scale: 1/24 },
  ],
  epochDescription: 'The Great Conjunction',
  // Lunar year 1500 maps to Jan 1, 2024
  // 1500 * 354 days/year * 86400000 ms/day
  // epochOffset = 1704067200000 - (1500 * 354 * 86400000) = -45780940800000
  epochOffset: -45780940800000,
  daysInYear: 354,
  hasLeapYears: true,
  isLeapYear: (year: number) => year % 3 === 0,
  leapDays: 11, // Adds a leap month every 3 years
};

/** All available mock calendars */
const MOCK_CALENDARS: Record<string, CalendarDefinition> = {
  'gregorian': GREGORIAN_CALENDAR,
  'fantasy-14': FANTASY_14_MONTH_CALENDAR,
  'variable-months': VARIABLE_MONTH_CALENDAR,
};

///////////////////////////////////////////////
// Internal Helper Functions (standalone)
///////////////////////////////////////////////

/**
 * Get the number of days in a specific month for a specific year.
 * @param calendar - Calendar definition
 * @param year - Year
 * @param month - Month index (0-based)
 * @returns Number of days in the month
 */
function getDaysInMonth(calendar: CalendarDefinition, year: number, month: number): number {
  const monthDef = calendar.months[month];
  if (!monthDef) {
    return 0;
  }
  
  // For February in Gregorian calendar, handle leap year
  if (calendar.id === 'gregorian' && month === 1) {
    return calendar.isLeapYear?.(year) ? 29 : 28;
  }
  
  // For leap year calendars with leap days at end of year
  if (calendar.hasLeapYears && calendar.isLeapYear?.(year) && month === calendar.months.length - 1) {
    return monthDef.days + (calendar.leapDays ?? 0);
  }
  
  return monthDef.days;
}

/**
 * Get the total number of days in a year.
 * @param calendar - Calendar definition
 * @param year - Year
 * @returns Total days in the year
 */
function getDaysInYear(calendar: CalendarDefinition, year: number): number {
  if (typeof calendar.daysInYear === 'function') {
    return calendar.daysInYear(year);
  }
  return calendar.daysInYear;
}

/**
 * Get calendar definition by ID, with fallback to Gregorian.
 * @param calendarId - Calendar ID
 * @returns Calendar definition
 */
function getCalendarById(calendarId: string): CalendarDefinition {
  return MOCK_CALENDARS[calendarId] ?? GREGORIAN_CALENDAR;
}

///////////////////////////////////////////////
// Core Calendar Functions (standalone)
/////////////////////////////////////////////

/**
 * Convert a calendar date to a normalized absolute day count.
 * @param calendarId - Calendar ID
 * @param date - Calendar date
 * @returns Normalized date with absolute day count
 */
function normalizeDate(calendarId: string, date: CalendarDate): NormalizedDate {
  const calendar = getCalendarById(calendarId);
  
  let absoluteDay = 0;
  
  // Add days for complete years
  for (let y = 0; y < date.year; y++) {
    absoluteDay += getDaysInYear(calendar, y);
  }
  
  // Add days for complete months in current year
  for (let m = 0; m < date.month; m++) {
    absoluteDay += getDaysInMonth(calendar, date.year, m);
  }
  
  // Add remaining days (day is 1-based, so subtract 1)
  absoluteDay += date.day - 1;
  
  // Add time fraction
  const dayFraction = ((date.hour ?? 0) * 3600 + (date.minute ?? 0) * 60 + (date.second ?? 0)) / 86400;
  
  return {
    absoluteDay,
    dayFraction,
    calendarId,
  };
}

/**
 * Convert a normalized date back to a calendar date.
 * @param calendarId - Calendar ID
 * @param normalized - Normalized date
 * @returns Calendar date
 */
function denormalizeDate(calendarId: string, normalized: NormalizedDate): CalendarDate {
  const calendar = getCalendarById(calendarId);
  
  let remainingDays = normalized.absoluteDay;
  let year = 0;
  let month = 0;
  
  // Calculate year
  while (remainingDays >= getDaysInYear(calendar, year)) {
    remainingDays -= getDaysInYear(calendar, year);
    year++;
  }
  
  // Calculate month
  while (remainingDays >= getDaysInMonth(calendar, year, month)) {
    remainingDays -= getDaysInMonth(calendar, year, month);
    month++;
  }
  
  // Calculate day (1-based)
  const day = remainingDays + 1;
  
  // Calculate time from fraction
  const totalSeconds = Math.floor(normalized.dayFraction * 86400);
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;
  
  return { year, month, day, hour, minute, second };
}

/**
 * Add a duration to a calendar date.
 * @param calendarId - Calendar ID
 * @param date - Starting date
 * @param duration - Duration to add
 * @returns Resulting calendar date
 */
function addDuration(calendarId: string, date: CalendarDate, duration: CalendarDuration): CalendarDate {
  const calendar = getCalendarById(calendarId);
  let result = { ...date };
  
  // Add years
  if (duration.years) {
    result.year += duration.years;
  }
  
  // Add months
  if (duration.months) {
    result.month += duration.months;
    while (result.month >= calendar.months.length) {
      result.month -= calendar.months.length;
      result.year++;
    }
    while (result.month < 0) {
      result.month += calendar.months.length;
      result.year--;
    }
  }
  
  // Add weeks
  if (duration.weeks) {
    const daysToAdd = duration.weeks * calendar.week.days;
    result = addDuration(calendarId, result, { days: daysToAdd });
  }
  
  // Add days
  if (duration.days) {
    let remainingDays = duration.days;
    
    while (remainingDays !== 0) {
      const daysInCurrentMonth = getDaysInMonth(calendar, result.year, result.month);
      const daysLeftInMonth = daysInCurrentMonth - result.day;
      
      if (remainingDays > 0) {
        if (remainingDays <= daysLeftInMonth) {
          result.day += remainingDays;
          remainingDays = 0;
        } else {
          remainingDays -= (daysLeftInMonth + 1);
          result.day = 1;
          result.month++;
          if (result.month >= calendar.months.length) {
            result.month = 0;
            result.year++;
          }
        }
      } else {
        // Negative days (subtracting)
        if (result.day > Math.abs(remainingDays)) {
          result.day += remainingDays;
          remainingDays = 0;
        } else {
          remainingDays += result.day;
          result.month--;
          if (result.month < 0) {
            result.month = calendar.months.length - 1;
            result.year--;
          }
          result.day = getDaysInMonth(calendar, result.year, result.month);
        }
      }
    }
  }
  
  // Add hours, minutes, seconds
  if (duration.hours || duration.minutes || duration.seconds) {
    const totalSeconds = (duration.hours ?? 0) * 3600 + (duration.minutes ?? 0) * 60 + (duration.seconds ?? 0);
    let currentSeconds = (result.hour ?? 0) * 3600 + (result.minute ?? 0) * 60 + (result.second ?? 0);
    currentSeconds += totalSeconds;
    
    // Handle day overflow from time
    if (currentSeconds >= 86400) {
      const extraDays = Math.floor(currentSeconds / 86400);
      currentSeconds = currentSeconds % 86400;
      result = addDuration(calendarId, result, { days: extraDays });
    } else if (currentSeconds < 0) {
      const extraDays = Math.floor(currentSeconds / 86400) - 1;
      currentSeconds = currentSeconds % 86400 + 86400;
      result = addDuration(calendarId, result, { days: extraDays });
    }
    
    result.hour = Math.floor(currentSeconds / 3600);
    result.minute = Math.floor((currentSeconds % 3600) / 60);
    result.second = currentSeconds % 60;
  }
  
  return result;
}

/**
 * Get the weekday index for a date.
 * @param calendarId - Calendar ID
 * @param date - Calendar date
 * @returns Weekday index (0-based, where 0 is first day of week)
 */
function getWeekday(calendarId: string, date: CalendarDate): number {
  const calendar = getCalendarById(calendarId);
  const normalized = normalizeDate(calendarId, date);
  return normalized.absoluteDay % calendar.week.days;
}

/**
 * Format a calendar date for display.
 * @param calendarId - Calendar ID
 * @param date - Calendar date
 * @param format - Format string
 * @returns Formatted date string
 */
function formatDate(calendarId: string, date: CalendarDate, format: string): string {
  const calendar = getCalendarById(calendarId);
  const month = calendar.months[date.month];
  const weekdayIndex = getWeekday(calendarId, date);
  
  return format
    .replace('YYYY', String(date.year))
    .replace('YY', String(date.year).slice(-2))
    .replace('MMMM', month?.name ?? 'Unknown')
    .replace('MMM', month?.shortName ?? 'Unk')
    .replace('MM', String(date.month + 1).padStart(2, '0'))
    .replace('DD', String(date.day).padStart(2, '0'))
    .replace('D', String(date.day))
    .replace('dddd', calendar.week.dayNames[weekdayIndex] ?? '')
    .replace('ddd', calendar.week.dayShortNames[weekdayIndex] ?? '')
    .replace('HH', String(date.hour ?? 0).padStart(2, '0'))
    .replace('H', String(date.hour ?? 0))
    .replace('mm', String(date.minute ?? 0).padStart(2, '0'))
    .replace('m', String(date.minute ?? 0));
}

/**
 * Snap a date to the start of a calendar unit.
 * @param calendarId - Calendar ID
 * @param date - Date to snap
 * @param unit - Unit to snap to
 * @returns Snapped date at start of unit
 */
function snapToStart(calendarId: string, date: CalendarDate, unit: CalendarTimeUnit): CalendarDate {
  switch (unit) {
    case 'year':
      return { year: date.year, month: 0, day: 1, hour: 0, minute: 0, second: 0 };
    case 'month':
      return { year: date.year, month: date.month, day: 1, hour: 0, minute: 0, second: 0 };
    case 'week': {
      const weekday = getWeekday(calendarId, date);
      return addDuration(calendarId, date, { days: -weekday });
    }
    case 'day':
      return { year: date.year, month: date.month, day: date.day, hour: 0, minute: 0, second: 0 };
    case 'hour':
      return { year: date.year, month: date.month, day: date.day, hour: date.hour ?? 0, minute: 0, second: 0 };
    case 'minute':
      return { year: date.year, month: date.month, day: date.day, hour: date.hour ?? 0, minute: date.minute ?? 0, second: 0 };
    default:
      return { ...date };
  }
}

/**
 * Snap a date to the end of a calendar unit.
 * @param calendarId - Calendar ID
 * @param date - Date to snap
 * @param unit - Unit to snap to
 * @returns Snapped date at end of unit
 */
function snapToEnd(calendarId: string, date: CalendarDate, unit: CalendarTimeUnit): CalendarDate {
  const calendar = getCalendarById(calendarId);
  
  switch (unit) {
    case 'year':
      return { year: date.year, month: calendar.months.length - 1, day: getDaysInMonth(calendar, date.year, calendar.months.length - 1), hour: 23, minute: 59, second: 59 };
    case 'month': {
      const daysInMonth = getDaysInMonth(calendar, date.year, date.month);
      return { year: date.year, month: date.month, day: daysInMonth, hour: 23, minute: 59, second: 59 };
    }
    case 'week': {
      const weekday = getWeekday(calendarId, date);
      const daysToEndOfWeek = calendar.week.days - weekday - 1;
      return addDuration(calendarId, date, { days: daysToEndOfWeek, hours: 23 - (date.hour ?? 0), minutes: 59 - (date.minute ?? 0), seconds: 59 - (date.second ?? 0) });
    }
    case 'day':
      return { year: date.year, month: date.month, day: date.day, hour: 23, minute: 59, second: 59 };
    case 'hour':
      return { year: date.year, month: date.month, day: date.day, hour: date.hour ?? 0, minute: 59, second: 59 };
    case 'minute':
      return { year: date.year, month: date.month, day: date.day, hour: date.hour ?? 0, minute: date.minute ?? 0, second: 59 };
    default:
      return { ...date };
  }
}

///////////////////////////////////////////////
// MockCalendariaService
///////////////////////////////////////////////

/**
 * Mock Calendaria API service.
 */
const MockCalendariaService = {
  /**
   * Get the active calendar (mock).
   * @returns Mock calendar object
   */
  getActiveCalendar: (): { id: string; name: string } => {
    return {
      id: 'gregorian',
      name: 'Gregorian Calendar',
    };
  },

  /**
   * Get all categories (mock).
   * @returns Array of category names
   */
  getCategories: (): string[] => {
    return CATEGORIES;
  },

  /**
   * Get notes in a date range (mock).
   * @param _startDate - Start date (ignored in mock)
   * @param _endDate - End date (ignored in mock)
   * @returns Array of mock Calendaria notes
   */
  getRecurrentNotesInRange: (
    _startDate: { year: number; month: number; dayOfMonth: number },
    _endDate: { year: number; month: number; dayOfMonth: number }
  ): CalendariaNote[] => {
    return getMockNotes();
  },

  /**
   * Check if Calendaria is available (mock always returns true for POC).
   * @returns True
   */
  isAvailable: (): boolean => {
    return true;
  },

  ///////////////////////////////////////////////
  // Calendar Metadata API (Mock)
  ///////////////////////////////////////////////

  /**
   * Get all available calendars.
   * @returns Array of calendar definitions
   */
  getCalendars: (): CalendarDefinition[] => {
    return Object.values(MOCK_CALENDARS);
  },

  /**
   * Get a specific calendar by ID.
   * @param calendarId - Calendar ID
   * @returns Calendar definition or null if not found
   */
  getCalendar: (calendarId: string): CalendarDefinition | null => {
    return MOCK_CALENDARS[calendarId] ?? null;
  },

  /**
   * Get the currently active calendar definition.
   * @returns Active calendar definition
   */
  getActiveCalendarDefinition: (): CalendarDefinition => {
    const activeId = MockCalendariaService.getActiveCalendar().id;
    return MOCK_CALENDARS[activeId] ?? GREGORIAN_CALENDAR;
  },

  /**
   * Get zoom levels for a calendar.
   * @param calendarId - Calendar ID
   * @returns Array of zoom levels
   */
  getZoomLevels: (calendarId: string): CalendarZoomLevel[] => {
    const calendar = MOCK_CALENDARS[calendarId];
    return calendar?.zoomLevels ?? GREGORIAN_CALENDAR.zoomLevels;
  },

  /**
   * Get the appropriate zoom level for a given time range.
   * @param calendarId - Calendar ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Best matching zoom level
   */
  getBestZoomLevel: (calendarId: string, startDate: CalendarDate, endDate: CalendarDate): CalendarZoomLevel => {
    const calendar = getCalendarById(calendarId);
    const daysInRange = MockCalendariaService.getDaysBetween(calendarId, startDate, endDate);
    
    for (const level of calendar.zoomLevels) {
      const levelDays = level.visibleUnits * level.scale;
      if (daysInRange <= levelDays * 2) {
        return level;
      }
    }
    
    return calendar.zoomLevels[0];
  },

  ///////////////////////////////////////////////
  // Date Normalization API
  ///////////////////////////////////////////////

  normalizeDate,
  denormalizeDate,

  /**
   * Get the epoch offset for a calendar from the Calendaria API.
   * Returns the Unix timestamp (ms) for calendar year 0, day 1.
   * Falls back to mapping year 1500 to Jan 1, 2024 if not defined.
   * @param calendarId - Calendar ID
   * @returns Unix timestamp (ms) for calendar year 0, day 1
   */
  getEpochOffset: (calendarId: string): number => {
    const calendar = getCalendarById(calendarId);
    
    // If calendar defines epochOffset, use it directly
    if (calendar.epochOffset !== undefined) {
      return calendar.epochOffset;
    }
    
    // Fallback: map year 1500 to Jan 1, 2024
    const daysPerYear = typeof calendar.daysInYear === 'function' 
      ? calendar.daysInYear(1500) 
      : calendar.daysInYear;
    const msPerDay = 86400000;
    const jan1_2024_ms = 1704067200000; // new Date(2024, 0, 1).getTime()
    const year1500_ms = 1500 * daysPerYear * msPerDay;
    
    return jan1_2024_ms - year1500_ms;
  },

  /**
   * Convert a normalized date to a JavaScript Date.
   * Applies epoch offset to map fantasy calendar dates to real-world Unix timestamps.
   * @param normalized - Normalized date
   * @returns JavaScript Date
   */
  normalizedToJSDate: (normalized: NormalizedDate): Date => {
    const msPerDay = 86400000;
    const epochOffsetMs = MockCalendariaService.getEpochOffset(normalized.calendarId);
    
    // Calculate fantasy calendar ms from year 0
    const fantasyMs = (normalized.absoluteDay + normalized.dayFraction) * msPerDay;
    
    // Add epoch offset to get Unix timestamp
    const unixMs = fantasyMs + epochOffsetMs;
    
    return new Date(unixMs);
  },

  /**
   * Convert a JavaScript Date to a normalized date for a specific calendar.
   * Applies epoch offset to map real-world dates back to fantasy calendar dates.
   * @param calendarId - Calendar ID
   * @param jsDate - JavaScript Date
   * @returns Normalized date
   */
  jsDateToNormalized: (calendarId: string, jsDate: Date): NormalizedDate => {
    const msPerDay = 86400000;
    const epochOffsetMs = MockCalendariaService.getEpochOffset(calendarId);
    
    // Convert Unix timestamp to fantasy calendar ms
    const unixMs = jsDate.getTime();
    const fantasyMs = unixMs - epochOffsetMs;
    
    // Convert to absolute day and fraction
    const absoluteDay = Math.floor(fantasyMs / msPerDay);
    const dayFraction = (fantasyMs % msPerDay) / msPerDay;
    
    return { absoluteDay, dayFraction, calendarId };
  },

  ///////////////////////////////////////////////
  // Date Arithmetic API
  ///////////////////////////////////////////////

  addDuration,

  /**
   * Calculate the number of days between two dates.
   * @param calendarId - Calendar ID
   * @param start - Start date
   * @param end - End date
   * @returns Number of days (can be negative if end < start)
   */
  getDaysBetween: (calendarId: string, start: CalendarDate, end: CalendarDate): number => {
    const startNorm = normalizeDate(calendarId, start);
    const endNorm = normalizeDate(calendarId, end);
    return endNorm.absoluteDay - startNorm.absoluteDay;
  },

  getWeekday,

  ///////////////////////////////////////////////
  // Date Formatting API
  ///////////////////////////////////////////////

  formatDate,

  /**
   * Format a date for timeline axis minor label.
   * @param calendarId - Calendar ID
   * @param date - Calendar date
   * @param unit - Current zoom unit
   * @returns Formatted string for minor axis label
   */
  formatAxisMinorLabel: (calendarId: string, date: CalendarDate, unit: CalendarTimeUnit): string => {
    const calendar = getCalendarById(calendarId);
    const month = calendar.months[date.month];
    const weekdayIndex = getWeekday(calendarId, date);
    
    switch (unit) {
      case 'year':
        return String(date.year);
      case 'month':
        return month?.shortName ?? 'Unk';
      case 'week':
        return `W${Math.floor(normalizeDate(calendarId, date).absoluteDay / calendar.week.days)}`;
      case 'day':
        return `${calendar.week.dayShortNames[weekdayIndex]} ${date.day}`;
      case 'hour':
        return `${String(date.hour ?? 0).padStart(2, '0')}:00`;
      case 'minute':
        return `${String(date.hour ?? 0).padStart(2, '0')}:${String(date.minute ?? 0).padStart(2, '0')}`;
      case 'second':
        return `${String(date.minute ?? 0).padStart(2, '0')}:${String(date.second ?? 0).padStart(2, '0')}`;
      default:
        return String(date.day);
    }
  },

  /**
   * Format a date for timeline axis major label.
   * @param calendarId - Calendar ID
   * @param date - Calendar date
   * @param unit - Current zoom unit
   * @returns Formatted string for major axis label
   */
  formatAxisMajorLabel: (calendarId: string, date: CalendarDate, unit: CalendarTimeUnit): string => {
    const calendar = getCalendarById(calendarId);
    const month = calendar.months[date.month];
    
    switch (unit) {
      case 'year':
        return calendar.epochDescription ?? '';
      case 'month':
        return String(date.year);
      case 'week':
      case 'day':
        return `${month?.name ?? 'Unknown'} ${date.year}`;
      case 'hour':
        return `${month?.shortName ?? 'Unk'} ${date.day}, ${date.year}`;
      case 'minute':
      case 'second':
        return `${String(date.hour ?? 0).padStart(2, '0')}:00`;
      default:
        return String(date.year);
    }
  },

  ///////////////////////////////////////////////
  // Snap-to-Unit API
  ///////////////////////////////////////////////

  snapToStart,
  snapToEnd,
};

export default MockCalendariaService;
