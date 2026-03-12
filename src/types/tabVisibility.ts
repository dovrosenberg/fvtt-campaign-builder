/**
 * Enum for all tabs that can have their visibility configured.
 * Each item represents a specific tab within a content type.
 * Entry tabs are separated by topic to allow per-topic configuration.
 */
export enum TabVisibilityItem {
  // Setting
  SettingJournals = 'settingJournals',
  SettingTimeline = 'settingTimeline',

  // Campaign
  CampaignJournals = 'campaignJournals',
  CampaignPCs = 'campaignPCs',
  CampaignLore = 'campaignLore',
  CampaignIdeas = 'campaignIdeas',
  CampaignToDo = 'campaignToDo',
  CampaignStoryWebs = 'campaignStoryWebs',
  CampaignTimeline = 'campaignTimeline',

  // Arc
  ArcJournals = 'arcJournals',
  ArcLore = 'arcLore',
  ArcVignettes = 'arcVignettes',
  ArcLocations = 'arcLocations',
  ArcParticipants = 'arcParticipants',
  ArcMonsters = 'arcMonsters',
  ArcItems = 'arcItems',
  ArcIdeas = 'arcIdeas',
  ArcStoryWebs = 'arcStoryWebs',
  ArcTimeline = 'arcTimeline',

  // Session
  SessionLore = 'sessionLore',
  SessionVignettes = 'sessionVignettes',
  SessionLocations = 'sessionLocations',
  SessionNPCs = 'sessionNPCs',
  SessionMonsters = 'sessionMonsters',
  SessionMagic = 'sessionMagic',
  SessionPCs = 'sessionPCs',
  SessionStoryWebs = 'sessionStoryWebs',
  SessionTimeline = 'sessionTimeline',

  // Entry - Character topic
  EntryCharacterJournals = 'entryCharacterJournals',
  EntryCharacterCharacters = 'entryCharacterCharacters',
  EntryCharacterLocations = 'entryCharacterLocations',
  EntryCharacterOrganizations = 'entryCharacterOrganizations',
  EntryCharacterPCs = 'entryCharacterPCs',
  EntryCharacterSessions = 'entryCharacterSessions',
  EntryCharacterFoundry = 'entryCharacterFoundry',
  EntryCharacterActors = 'entryCharacterActors',
  EntryCharacterTimeline = 'entryCharacterTimeline',

  // Entry - Location topic
  EntryLocationJournals = 'entryLocationJournals',
  EntryLocationCharacters = 'entryLocationCharacters',
  EntryLocationLocations = 'entryLocationLocations',
  EntryLocationOrganizations = 'entryLocationOrganizations',
  EntryLocationPCs = 'entryLocationPCs',
  EntryLocationSessions = 'entryLocationSessions',
  EntryLocationFoundry = 'entryLocationFoundry',
  EntryLocationScenes = 'entryLocationScenes',
  EntryLocationTimeline = 'entryLocationTimeline',

  // Entry - Organization topic
  EntryOrganizationJournals = 'entryOrganizationJournals',
  EntryOrganizationCharacters = 'entryOrganizationCharacters',
  EntryOrganizationLocations = 'entryOrganizationLocations',
  EntryOrganizationOrganizations = 'entryOrganizationOrganizations',
  EntryOrganizationPCs = 'entryOrganizationPCs',
  EntryOrganizationSessions = 'entryOrganizationSessions',
  EntryOrganizationFoundry = 'entryOrganizationFoundry',
  EntryOrganizationTimeline = 'entryOrganizationTimeline',

  // Entry - PC topic
  EntryPCJournals = 'entryPCJournals',
  EntryPCCharacters = 'entryPCCharacters',
  EntryPCLocations = 'entryPCLocation',
  EntryPCOrganizations = 'entryPCOrganizations',
  EntryPCFoundry = 'entryPCFoundry',
  EntryPCTimeline = 'entryPCTimeline',
}

/**
 * Type for a valid tab visibility item
 */
export type TabVisibilityItemType = `${TabVisibilityItem}`;

/**
 * Type for the tab visibility settings structure
 */
export type TabVisibilitySettings = Partial<Record<TabVisibilityItem, boolean>>;
