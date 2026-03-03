/**
 * Mock Calendaria service for POC/testing.
 * Generates mock notes for timeline visualization.
 */

import CalendarAdapter from './calendarAdapter';

/** Sample data for name generation */
const CITIES = ['Paris', 'London', 'Vienna', 'Berlin', 'Rome', 'Madrid', 'Amsterdam', 'Prague', 'Warsaw', 'Stockholm', 'Copenhagen', 'Brussels', 'Lisbon', 'Budapest', 'Athens'];
const NATIONS = ['France', 'England', 'Prussia', 'Austria', 'Spain', 'Netherlands', 'Poland', 'Sweden', 'Denmark', 'Portugal', 'Hungary', 'Greece', 'Russia', 'Ottoman Empire'];
const PEOPLE = ['Napoleon', 'Wellington', 'Bismarck', 'Metternich', 'Victoria', 'Garibaldi', 'Lincoln', 'Darwin', 'Marx', 'Dickens', 'Tolstoy', 'Curie', 'Pasteur', 'Edison', 'Tesla'];
const WORKS = ['Symphony No. 5', 'The Novel', 'The Painting', 'The Opera', 'The Poem', 'The Manifesto', 'The Theory', 'The Discovery', 'The Invention', 'The Treatise'];
const THINGS = ['Steam Engine', 'Telegraph', 'Photography', 'Electricity', 'Vaccination', 'Railway', 'Ironclad', 'Dynamite', 'Telephone', 'Light Bulb'];

/** Event name templates - keyed by category ID (will be dynamically selected) */
const EVENT_TEMPLATES = [
  'Treaty of {city}',
  'Battle of {city}',
  'Coronation of {person}',
  '{city} Uprising',
  'Premiere of "{work}"',
  '{person} Discovers {thing}',
  'Market Crash of {year}',
  'Earthquake near {city}',
  '{person} Born',
  'Council of {city}',
  'Siege of {city}',
  '{person} Publishes "{work}"',
  'Trade Agreement with {nation}',
  'Flood of {year}',
  '{person} Dies',
  'Temple Dedicated at {city}',
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
 * Pick a random element from an array.
 * @param arr - Array to pick from
 * @returns Random element
 */
const pick = <T>(arr: T[]): T => {
  return arr[randomInt(0, arr.length - 1)];
};

/**
 * Generate a random event name.
 * @param year - Year for substitution
 * @returns Generated event name
 */
const generateEventName = (year: number): string => {
  let name = pick(EVENT_TEMPLATES);

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
const generateRandomDate = (minYear: number, maxYear: number): { year: number; month: number; day: number } => {
  return {
    year: randomInt(minYear, maxYear),
    month: randomInt(0, 11),
    day: randomInt(1, 28),
  };
};

/**
 * Generate mock notes and create them in Calendaria.
 * Stores the function in global for manual invocation.
 * 
 * @param startYear - Minimum year for random dates
 * @param endYear - Maximum year for random dates
 * @param notesPerCategory - Number of notes to generate per category (default: 6)
 * @returns Promise resolving to array of created note IDs
 */
export const generateCalendariaNotes = async (
  startYear: number,
  endYear: number,
  notesPerCategory: number = 6
): Promise<string[]> => {
  const categories = CalendarAdapter.getCategories();
  if (!categories || categories.length === 0) {
    console.error('No categories available from Calendaria');
    return [];
  }

  const createdIds: string[] = [];

  for (const category of categories) {
    for (let i = 0; i < notesPerCategory; i++) {
      const startDate = generateRandomDate(startYear, endYear);
      const hasEndDate = Math.random() > 0.6;

      // Generate end date 1-30 days after start (for range events)
      let endDate: { year: number; month: number; day: number } | undefined;
      if (hasEndDate) {
        let endDay = startDate.day + randomInt(1, 30);
        let endMonth = startDate.month;
        let endYear = startDate.year;

        // Handle month/year overflow
        if (endDay > 31) {
          endDay -= 31;
          endMonth += 1;
        }
        if (endMonth > 11) {
          endMonth = 0;
          endYear += 1;
        }

        endDate = { year: endYear, month: endMonth, day: endDay };
      }

      const name = generateEventName(startDate.year);

      try {
        const note = await CALENDARIA.api.createNote({
          name,
          content: `<p>Details about ${name}.</p>`,
          startDate: { ...startDate, hour: randomInt(8, 18), minute: 0 },
          endDate: endDate ? { ...endDate, hour: randomInt(8, 18), minute: 0 } : undefined,
          allDay: !hasEndDate,
          repeat: 'never',
          categories: [category.id],
          icon: category.icon,
          color: category.color,
          gmOnly: Math.random() > 0.85,
          openSheet: false,
        });

        createdIds.push(note.id);
        console.log(`Created note: ${name} (${category.id})`);
      } catch (error) {
        console.error(`Failed to create note: ${name}`, error);
      }
    }
  }

  console.log(`Created ${createdIds.length} notes in Calendaria`);
  return createdIds;
};


// Store the generate function in global for manual invocation
(globalThis as Record<string, unknown>).generateCalendariaNotes = generateCalendariaNotes;
