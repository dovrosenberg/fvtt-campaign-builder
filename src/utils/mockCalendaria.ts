/**
 * Mock Calendaria API service for POC testing.
 * Generates 50 test notes with various attributes for testing timeline filtering.
 */

import { CalendariaNote, } from '@/types';

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
      // repeat: recurrence,
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
      id: 'mock-calendar-1',
      name: 'Default Calendar',
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
   * Returns all notes, filtering by date range is done by the caller.
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
};

export default MockCalendariaService;
