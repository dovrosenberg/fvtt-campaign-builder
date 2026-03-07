/**
 * Enum for all tabs that can have their visibility configured.
 * Each item represents a specific tab within a content type.
 * Entry tabs are separated by topic to allow per-topic configuration.
 */
export enum TabVisibilityItem {
  // Setting
  SettingJournals = 'settingJournals',

  // Campaign
  CampaignJournals = 'campaignJournals',
  CampaignPCs = 'campaignPCs',
  CampaignLore = 'campaignLore',
  CampaignIdeas = 'campaignIdeas',
  CampaignToDo = 'campaignToDo',
  CampaignStoryWebs = 'campaignStoryWebs',

  // Arc
  ArcJournals = 'arcJournals',
  ArcLore = 'arcLore',
  ArcVignettes = 'arcVignettes',
  ArcLocations = 'arcLocations',
  ArcParticipants = 'arcParticipants',
  ArcMonsters = 'arcMonsters',
  ArcIdeas = 'arcIdeas',
  ArcStoryWebs = 'arcStoryWebs',

  // Session
  SessionLore = 'sessionLore',
  SessionVignettes = 'sessionVignettes',
  SessionLocations = 'sessionLocations',
  SessionNPCs = 'sessionNPCs',
  SessionMonsters = 'sessionMonsters',
  SessionMagic = 'sessionMagic',
  SessionPCs = 'sessionPCs',
  SessionStoryWebs = 'sessionStoryWebs',

  // Entry - Character topic
  EntryCharacterJournals = 'entryCharacterJournals',
  EntryCharacterLocations = 'entryCharacterLocations',
  EntryCharacterOrganizations = 'entryCharacterOrganizations',
  EntryCharacterPCs = 'entryCharacterPCs',
  EntryCharacterSessions = 'entryCharacterSessions',
  EntryCharacterFoundry = 'entryCharacterFoundry',
  EntryCharacterActors = 'entryCharacterActors',

  // Entry - Location topic
  EntryLocationJournals = 'entryLocationJournals',
  EntryLocationCharacters = 'entryLocationCharacters',
  EntryLocationOrganizations = 'entryLocationOrganizations',
  EntryLocationPCs = 'entryLocationPCs',
  EntryLocationSessions = 'entryLocationSessions',
  EntryLocationFoundry = 'entryLocationFoundry',
  EntryLocationScenes = 'entryLocationScenes',

  // Entry - Organization topic
  EntryOrganizationJournals = 'entryOrganizationJournals',
  EntryOrganizationCharacters = 'entryOrganizationCharacters',
  EntryOrganizationLocations = 'entryOrganizationLocations',
  EntryOrganizationPCs = 'entryOrganizationPCs',
  EntryOrganizationSessions = 'entryOrganizationSessions',
  EntryOrganizationFoundry = 'entryOrganizationFoundry',

  // Entry - PC topic
  EntryPCJournals = 'entryPCJournals',
  EntryPCCharacters = 'entryPCCharacters',
  EntryPCLocations = 'entryPCLocation',
  EntryPCOrganizations = 'entryPCOrganizations',
  EntryPCFoundry = 'entryPCFoundry',
}

/**
 * Type for a valid tab visibility item
 */
export type TabVisibilityItemType = `${TabVisibilityItem}`;

/**
 * Type for the tab visibility settings structure
 */
export type TabVisibilitySettings = Partial<Record<TabVisibilityItem, boolean>>;
