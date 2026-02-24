import { Migration, MigrationResult, MigrationContext } from '../types';
import { ModuleSettings, SettingKey, moduleId } from '@/settings';
import { useMainStore } from '@/applications/stores';
import { DOCUMENT_TYPES } from '@/documents';

/**
 * Migration v1.9.0
 *
 * Wraps existing tab data from WindowTab[] (flat array) to [WindowTab[]] (2D array)
 * for multi-panel support. Each user's tabs flag per setting is migrated.
 */
export class MigrationV1_9 implements Migration {
  public readonly targetVersion = '1.9.0';
  public readonly description = 'Wraps tab data into panel arrays and normalizes campaign to-do field casing';

  private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    this._context = _context;
  }

  /**
   * Migrates tab flags from flat arrays to 2D arrays for all users and settings,
   * then updates campaign documents to include system.toDoItems from system.todoItems.
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
    };

    const allSettings = ModuleSettings.get(SettingKey.settingIndex) || [];

    // wrap the current window tabs settings in [] to convert to new structure
    for (const user of game.users!) {
      for (const settingIdx of allSettings) {
        try {
          // @ts-ignore
          const rawTabs = user.getFlag(moduleId, `tabs.${settingIdx.settingId}`) as any;
          if (!rawTabs || !Array.isArray(rawTabs) || rawTabs.length === 0)
            continue;

          // Skip if already migrated (first element is an array)
          if (Array.isArray(rawTabs[0]))
            continue;

          // Wrap in outer array to create single-panel 2D structure
          // @ts-ignore
          await user.setFlag(moduleId, `tabs.${settingIdx.settingId}`, [rawTabs]);
          result.migratedCount++;
        } catch (error) {
          result.failedCount++;
          console.error(`Migration v1.9.0: failed to migrate tabs for user ${user.name}, setting ${settingIdx.settingId}:`, error);
        }
      }
    }

    const settings = await useMainStore().getAllSettings();
    for (const setting of settings) {
      const allDocumentsIndex = await setting.compendium.getIndex({
        fields: [
          'uuid',
          `flags.${moduleId}.campaignBuilderType`,
        ]
      });

      const campaignDocs = allDocumentsIndex.filter((d: any) => (
        d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Campaign
      ));

      // migrate todo items to proper capitalization
      for (const campaignDoc of campaignDocs) {
        try {
          const journalEntry = await fromUuid<JournalEntry>(campaignDoc.uuid);
          if (!journalEntry || !journalEntry.pages || journalEntry.pages.contents.length !== 1)
            continue;

          const page = journalEntry.pages.contents[0];
          const existingToDoItems = (page.system as Record<string, unknown>)?.todoItems;

          await page.update({
            // @ts-ignore
            'system.toDoItems': Array.isArray(existingToDoItems) ? existingToDoItems : []
          });
          result.migratedCount++;
        } catch (error) {
          result.failedCount++;
          console.error(`Migration v1.9.0: failed to migrate toDoItems for campaign ${campaignDoc.uuid}:`, error);
        }
      }
    }

    return result;
  }
}
