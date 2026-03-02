/**
 * Mock Calendaria service for POC/testing.
 * Generates mock notes for timeline visualization.
 */

import { CalendariaNote, CalendariaDate } from '@/types';
import CalendarAdapter from './calendarAdapter';

/** Categories for mock notes */
const CATEGORIES = [
  { id: 'political', label: 'Political Events', color: '#e74c3c', icon: 'fas fa-landmark' },
  { id: 'military', label: 'Military Conflicts', color: '#c0392b', icon: 'fas fa-shield-halved' },
  { id: 'cultural', label: 'Cultural Events', color: '#9b59b6', icon: 'fas fa-masks-theater' },
  { id: 'scientific', label: 'Scientific Discoveries', color: '#3498db', icon: 'fas fa-flask' },
  { id: 'economic', label: 'Economic Events', color: '#27ae60', icon: 'fas fa-coins' },
  { id: 'natural', label: 'Natural Disasters', color: '#e67e22', icon: 'fas fa-volcano' },
  { id: 'personal', label: 'Personal Milestones', color: '#f39c12', icon: 'fas fa-user' },
  { id: 'religious', label: 'Religious Events', color: '#1abc9c', icon: 'fas fa-place-of-worship' },
];

/** Event name templates by category */
const EVENT_NAMES: Record<string, string[]> = {
  political: [
    'Treaty of {city}',
    'Coronation of {person}',
    '{city} Uprising',
    'Parliament Convenes in {city}',
    'Assassination of {person}',
    'Reform Act of {year}',
    'Diplomatic Summit at {city}',
    'Constitutional Crisis in {nation}',
    '{person} Seizes Power',
    'Election of {year}',
  ],
  military: [
    'Battle of {city}',
    'Siege of {city}',
    '{nation} Invades {nation2}',
    'Naval Engagement near {city}',
    'Armistice Signed at {city}',
    'Fort {city} Falls',
    'Rebellion in {nation}',
    '{person}\'s Campaign',
    'War of {year}',
    'Defense of {city}',
  ],
  cultural: [
    'Premiere of "{work}"',
    '{person} Publishes "{work}"',
    'Opening of {city} Theater',
    'Art Exhibition in {city}',
    '{person}\'s First Performance',
    'Festival of {year}',
    'Foundation of {city} Academy',
    'Invention of {thing}',
    '{work} Completed',
    'Cultural Exchange with {nation}',
  ],
  scientific: [
    '{person} Discovers {thing}',
    'Observatory Opens in {city}',
    'First {thing} Demonstration',
    '{person}\'s Theory Published',
    'Medical Breakthrough: {thing}',
    'Expedition to {city}',
    '{thing} Invented',
    'Scientific Society Founded',
    'Laboratory Opens at {city}',
    'Patent Filed for {thing}',
  ],
  economic: [
    'Market Crash of {year}',
    'Trade Agreement with {nation}',
    'Bank of {city} Founded',
    'Railway Reaches {city}',
    'Gold Rush in {city}',
    'Tariff Act of {year}',
    'Factory Opens in {city}',
    'Strike at {city}',
    'Currency Reform',
    'Harbor Expansion at {city}',
  ],
  natural: [
    'Earthquake near {city}',
    'Flood of {year}',
    'Famine in {nation}',
    'Volcanic Eruption',
    'Hurricane Strikes {city}',
    'Drought of {year}',
    'Fire Destroys {city}',
    'Plague Outbreak',
    'Cold Winter of {year}',
    'Landslide at {city}',
  ],
  personal: [
    '{person} Born',
    '{person} Dies',
    '{person} Marries',
    '{person}\'s Journey Begins',
    '{person} Returns Home',
    'Birth of {person}\'s Child',
    '{person}\'s Graduation',
    '{person} Writes First Letter',
    '{person}\'s Illness',
    '{person}\'s Achievement',
  ],
  religious: [
    'Council of {city}',
    '{person}\'s Vision',
    'Temple Dedicated at {city}',
    'Religious Reform of {year}',
    'Pilgrimage to {city}',
    'Schism in the Church',
    'Monastery Founded at {city}',
    'Holy Day Proclaimed',
    'Mission to {nation}',
    'Consecration of {city}',
  ],
};

/** Sample data for name generation */
const CITIES = ['Paris', 'London', 'Vienna', 'Berlin', 'Rome', 'Madrid', 'Amsterdam', 'Prague', 'Warsaw', 'Stockholm', 'Copenhagen', 'Brussels', 'Lisbon', 'Budapest', 'Athens'];
const NATIONS = ['France', 'England', 'Prussia', 'Austria', 'Spain', 'Netherlands', 'Poland', 'Sweden', 'Denmark', 'Portugal', 'Hungary', 'Greece', 'Russia', 'Ottoman Empire'];
const PEOPLE = ['Napoleon', 'Wellington', 'Bismarck', 'Metternich', 'Victoria', 'Garibaldi', 'Lincoln', 'Darwin', 'Marx', 'Dickens', 'Tolstoy', 'Curie', 'Pasteur', 'Edison', 'Tesla'];
const WORKS = ['Symphony No. 5', 'The Novel', 'The Painting', 'The Opera', 'The Poem', 'The Manifesto', 'The Theory', 'The Discovery', 'The Invention', 'The Treatise'];
const THINGS = ['Steam Engine', 'Telegraph', 'Photography', 'Electricity', 'Vaccination', 'Railway', 'Ironclad', 'Dynamite', 'Telephone', 'Light Bulb'];

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
 * Pick a random element from an array.
 * @param arr - Array to pick from
 * @returns Random element
 */
const pick = <T>(arr: T[]): T => {
  return arr[randomInt(0, arr.length - 1)];
};

/**
 * Generate a random event name based on category.
 * @param categoryId - Category ID
 * @param year - Year for substitution
 * @returns Generated event name
 */
const generateEventName = (categoryId: string, year: number): string => {
  const templates = EVENT_NAMES[categoryId] || EVENT_NAMES['political'];
  let name = pick(templates);

  // Replace placeholders
  name = name.replace('{year}', year.toString());
  name = name.replace('{city}', pick(CITIES));
  name = name.replace('{nation}', pick(NATIONS));
  name = name.replace('{nation2}', pick(NATIONS.filter(n => n !== name.match(/\{nation\}/)?.[0])));
  name = name.replace('{person}', pick(PEOPLE));
  name = name.replace('{work}', pick(WORKS));
  name = name.replace('{thing}', pick(THINGS));

  return name;
};

/**
 * Generate a random CalendariaDate between year ranges.
 * @param minYear - Minimum year
 * @param maxYear - Maximum year
 * @returns Random date
 */
const generateRandomDate = (minYear: number, maxYear: number): CalendariaDate => {
  return {
    year: randomInt(minYear, maxYear),
    month: randomInt(0, 11), // 0-11 for Gregorian
    dayOfMonth: randomInt(0, 27), // 0-indexed day (0-27 for 28-day months)
  };
};


/**
 * Generate mock notes for the timeline.
 * Creates approximately 50 notes with dates centered around the current game date.
 * @returns Array of mock CalendariaNote objects
 */
export const generateMockNotes = (): CalendariaNote[] => {
  const notes: CalendariaNote[] = [];
  let noteId = 1;

  // Get current game date to center notes around it
  const currentDate = CalendarAdapter.getCurrentDate();
  const currentYear = currentDate.year;

  // Generate ~50 notes spread across categories, within ±50 years of current date
  const notesPerCategory = 6; // 8 categories * 6 = 48 notes

  for (const category of CATEGORIES) {
    for (let i = 0; i < notesPerCategory; i++) {
      // Generate dates within ±50 years of current game date
      const startDate = generateRandomDate(currentYear - 50, currentYear + 50);
      const hasEndDate = Math.random() > 0.6; // ~40% have end dates

      // Generate end date 1-30 days after start (for range events)
      let endDate: CalendariaDate | undefined;
      if (hasEndDate) {
        const startYear = startDate.year;
        const startMonth = startDate.month;
        const startDay = startDate.dayOfMonth;

        // Simple end date calculation (add 1-30 days)
        // dayOfMonth is 0-indexed, so valid range is 0-30 for 31-day months
        let endDay = startDay + randomInt(1, 30);
        let endMonth = startMonth;
        let endYear = startYear;

        // Handle month/year overflow (simplified)
        // For 0-indexed days, max valid value is 30 (for 31-day month)
        const maxDayInMonth = 30; // 0-indexed max (31 days = 0-30)
        if (endDay > maxDayInMonth) {
          endDay -= (maxDayInMonth + 1); // Subtract 31 days (0-30 range)
          endMonth += 1;
        }
        if (endMonth > 11) {
          endMonth = 0;
          endYear += 1;
        }

        endDate = {
          year: endYear,
          month: endMonth,
          dayOfMonth: endDay,
        };
      }

      const name = generateEventName(category.id, startDate.year);

      notes.push({
        id: `mock-note-${noteId++}`,
        name,
        content: `<p>Details about ${name}.</p>`,
        startDate,
        endDate,
        category: category.id,
        icon: category.icon,
        color: category.color,
        gmOnly: Math.random() > 0.85, // ~15% GM-only
      });
    }
  }

  // Sort by start date
  notes.sort((a, b) => {
    if (a.startDate.year !== b.startDate.year) {
      return a.startDate.year - b.startDate.year;
    }
    if (a.startDate.month !== b.startDate.month) {
      return a.startDate.month - b.startDate.month;
    }
    return a.startDate.dayOfMonth - b.startDate.dayOfMonth;
  });

  return notes;
};

/** Cached mock notes */
let cachedNotes: CalendariaNote[] | null = null;

/**
 * Get mock notes in a date range (ignores range for now, returns all).
 * @param _start - Start date (ignored)
 * @param _end - End date (ignored)
 * @returns Array of mock notes
 */
export const getRecurrentNotesInRange = (
  _start: CalendariaDate,
  _end: CalendariaDate
): CalendariaNote[] => {
  if (!cachedNotes) {
    cachedNotes = generateMockNotes();
  }
  return cachedNotes;
};

/**
 * Get available categories for filtering.
 * @returns Array of category objects
 */
export const getCategories = (): { id: string; label: string; color: string; icon: string }[] => {
  return CATEGORIES;
};

export default {
  generateMockNotes,
  getRecurrentNotesInRange,
  getCategories,
};
