import { Migration, MigrationResult, MigrationContext } from '../types';
import { ModuleSettings, SettingKey } from '@/settings';
import { TabVisibilityItem, TabVisibilitySettings } from '@/types';

/**
 * Migration v1.10
 *
 * Migrates old individual tab visibility settings (enableToDoList, useStoryWebs, genericFoundryTab)
 * to the new unified tabVisibilitySettings.
 */
export class MigrationV1_10 implements Migration {
  public readonly targetVersion = '1.10.0';
  public readonly description = 'Migrates old tab visibility settings to unified tab visibility settings';

  // private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    // this._context = _context;
  }

  /**
   * Migrates the old settings to the new unified format.
   * - enableToDoList -> TabVisibilityItem.CampaignToDo
   * - useStoryWebs -> CampaignStoryWebs, ArcStoryWebs, SessionStoryWebs
   * - genericFoundryTab -> EntryCharacterFoundry, EntryLocationFoundry, EntryOrganizationFoundry, EntryPCFoundry
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
    };

    const newSettings: TabVisibilitySettings = {
      [TabVisibilityItem.SettingJournals]: true,
      [TabVisibilityItem.SettingTimeline]: true,
      [TabVisibilityItem.CampaignJournals]: true,
      [TabVisibilityItem.CampaignPCs]: true,
      [TabVisibilityItem.CampaignLore]: true,
      [TabVisibilityItem.CampaignIdeas]: true,
      [TabVisibilityItem.CampaignToDo]: true,
      [TabVisibilityItem.CampaignStoryWebs]: true,
      [TabVisibilityItem.CampaignTimeline]: true,
      [TabVisibilityItem.ArcJournals]: true,
      [TabVisibilityItem.ArcLore]: true,
      [TabVisibilityItem.ArcVignettes]: true,
      [TabVisibilityItem.ArcLocations]: true,
      [TabVisibilityItem.ArcParticipants]: true,
      [TabVisibilityItem.ArcMonsters]: true,
      [TabVisibilityItem.ArcItems]: true,
      [TabVisibilityItem.ArcIdeas]: true,
      [TabVisibilityItem.ArcStoryWebs]: true,
      [TabVisibilityItem.SessionLore]: true,
      [TabVisibilityItem.SessionVignettes]: true,
      [TabVisibilityItem.SessionLocations]: true,
      [TabVisibilityItem.SessionNPCs]: true,
      [TabVisibilityItem.SessionMonsters]: true,
      [TabVisibilityItem.SessionMagic]: true,
      [TabVisibilityItem.SessionPCs]: true,
      [TabVisibilityItem.SessionStoryWebs]: true,
      [TabVisibilityItem.SessionTimeline]: true,
      [TabVisibilityItem.EntryCharacterJournals]: true,
      [TabVisibilityItem.EntryCharacterCharacters]: true,
      [TabVisibilityItem.EntryCharacterLocations]: true,
      [TabVisibilityItem.EntryCharacterOrganizations]: true,
      [TabVisibilityItem.EntryCharacterPCs]: true,
      [TabVisibilityItem.EntryCharacterSessions]: true,
      [TabVisibilityItem.EntryCharacterFoundry]: true,
      [TabVisibilityItem.EntryCharacterActors]: true,
      [TabVisibilityItem.EntryCharacterTimeline]: true,
      [TabVisibilityItem.EntryLocationJournals]: true,
      [TabVisibilityItem.EntryLocationCharacters]: true,
      [TabVisibilityItem.EntryLocationLocations]: true,
      [TabVisibilityItem.EntryLocationOrganizations]: true,
      [TabVisibilityItem.EntryLocationPCs]: true,
      [TabVisibilityItem.EntryLocationSessions]: true,
      [TabVisibilityItem.EntryLocationFoundry]: true,
      [TabVisibilityItem.EntryLocationScenes]: true,
      [TabVisibilityItem.EntryLocationTimeline]: true,
      [TabVisibilityItem.EntryOrganizationJournals]: true,
      [TabVisibilityItem.EntryOrganizationCharacters]: true,
      [TabVisibilityItem.EntryOrganizationLocations]: true,
      [TabVisibilityItem.EntryOrganizationOrganizations]: true,
      [TabVisibilityItem.EntryOrganizationPCs]: true,
      [TabVisibilityItem.EntryOrganizationSessions]: true,
      [TabVisibilityItem.EntryOrganizationFoundry]: true,
      [TabVisibilityItem.EntryOrganizationTimeline]: true,
      [TabVisibilityItem.EntryPCJournals]: true,
      [TabVisibilityItem.EntryPCCharacters]: true,
      [TabVisibilityItem.EntryPCLocations]: true,
      [TabVisibilityItem.EntryPCOrganizations]: true,
      [TabVisibilityItem.EntryPCFoundry]: true,
      [TabVisibilityItem.EntryPCTimeline]: true,
    };

    // Migrate enableToDoList -> CampaignToDo
    const enableToDoList = ModuleSettings.get(SettingKey.enableToDoList);
    if (enableToDoList === false) {
      newSettings[TabVisibilityItem.CampaignToDo] = false;
      result.migratedCount++;
    }

    // Migrate useStoryWebs -> CampaignStoryWebs, ArcStoryWebs, SessionStoryWebs
    const useStoryWebs = ModuleSettings.get(SettingKey.useStoryWebs);
    if (useStoryWebs === false) {
      newSettings[TabVisibilityItem.CampaignStoryWebs] = false;
      newSettings[TabVisibilityItem.ArcStoryWebs] = false;
      newSettings[TabVisibilityItem.SessionStoryWebs] = false;
      result.migratedCount++;
    }

    // Migrate genericFoundryTab -> Entry foundry tabs for all topics
    const genericFoundryTab = ModuleSettings.get(SettingKey.genericFoundryTab);

    // if genericFoundryTab was false, hide the foundry tabs
    if (genericFoundryTab === false) {
      newSettings[TabVisibilityItem.EntryCharacterFoundry] = false;
      newSettings[TabVisibilityItem.EntryLocationFoundry] = false;
      newSettings[TabVisibilityItem.EntryOrganizationFoundry] = false;
      newSettings[TabVisibilityItem.EntryPCFoundry] = false;
      result.migratedCount++;
    }

    // Save the new settings if any migrations occurred
    await ModuleSettings.set(SettingKey.tabVisibilitySettings, newSettings);

    return result;
  }
}
