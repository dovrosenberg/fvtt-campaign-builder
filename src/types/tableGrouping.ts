/**
 * Types for table grouping settings
 */

export enum TableGroupingSetting {
  SettingJournals = 'SettingJournals',
  EntryJournals = 'EntryJournals',
  EntryCharacters = 'EntryCharacters',
  EntryLocations = 'EntryLocations',
  EntryOrganizations = 'EntryOrganizations',
  EntryPCs = 'EntryPCs',
  EntryActors = 'EntryActors',
  EntrySessions = 'EntrySessions',
  CampaignJournals = 'CampaignJournals',
  CampaignPCs = 'CampaignPCs',
  CampaignLore = 'CampaignLore',
  CampaignIdeas = 'CampaignIdeas',
  CampaignToDo = 'CampaignToDo',
  CampaignStoryWebs = 'CampaignStoryWebs',
  ArcLore = 'ArcLore',
  ArcVignettes = 'ArcVignettes',
  ArcLocations = 'ArcLocations',
  ArcParticipants = 'ArcParticipants',
  ArcMonsters = 'ArcMonsters',
  ArcIdeas = 'ArcIdeas',
  ArcStoryWebs = 'ArcStoryWebs',
  SessionLore = 'SessionLore',
  SessionVignettes = 'SessionVignettes',
  SessionLocations = 'SessionLocations',
  SessionCharacters = 'SessionCharacters',
  SessionMonsters = 'SessionMonsters',
  SessionItems = 'SessionItems',
  SessionPCs = 'SessionPCs',
  SessionStoryWebs = 'SessionStoryWebs',
  FrontCharacters = 'FrontCharacters',
  FrontLocations = 'FrontLocations',
}

export interface TableGroupingSettings {
  [TableGroupingSetting.SettingJournals]: boolean;
  [TableGroupingSetting.EntryJournals]: boolean;
  [TableGroupingSetting.EntryCharacters]: boolean;
  [TableGroupingSetting.EntryLocations]: boolean;
  [TableGroupingSetting.EntryOrganizations]: boolean;
  [TableGroupingSetting.EntryPCs]: boolean;
  [TableGroupingSetting.EntryActors]: boolean;
  [TableGroupingSetting.EntrySessions]: boolean;
  [TableGroupingSetting.CampaignJournals]: boolean;
  [TableGroupingSetting.CampaignPCs]: boolean;
  [TableGroupingSetting.CampaignLore]: boolean;
  [TableGroupingSetting.CampaignIdeas]: boolean;
  [TableGroupingSetting.CampaignToDo]: boolean;
  [TableGroupingSetting.CampaignStoryWebs]: boolean;
  [TableGroupingSetting.ArcLore]: boolean;
  [TableGroupingSetting.ArcVignettes]: boolean;
  [TableGroupingSetting.ArcLocations]: boolean;
  [TableGroupingSetting.ArcParticipants]: boolean;
  [TableGroupingSetting.ArcMonsters]: boolean;
  [TableGroupingSetting.ArcIdeas]: boolean;
  [TableGroupingSetting.ArcStoryWebs]: boolean;
  [TableGroupingSetting.SessionLore]: boolean;
  [TableGroupingSetting.SessionVignettes]: boolean;
  [TableGroupingSetting.SessionLocations]: boolean;
  [TableGroupingSetting.SessionCharacters]: boolean;
  [TableGroupingSetting.SessionMonsters]: boolean;
  [TableGroupingSetting.SessionItems]: boolean;
  [TableGroupingSetting.SessionPCs]: boolean;
  [TableGroupingSetting.SessionStoryWebs]: boolean;
  [TableGroupingSetting.FrontCharacters]: boolean;
  [TableGroupingSetting.FrontLocations]: boolean;
}
