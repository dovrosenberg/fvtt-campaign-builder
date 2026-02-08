import { Migration, MigrationResult, MigrationContext } from '../types';
import { ModuleSettings, SettingKey, moduleId } from '@/settings';

/**
 * Migration v1.9.0
 *
 * Wraps existing tab data from WindowTab[] (flat array) to [WindowTab[]] (2D array)
 * for multi-panel support. Each user's tabs flag per setting is migrated.
 */
export class MigrationV1_9 implements Migration {
  public readonly targetVersion = '1.9.0';
  public readonly description = 'Wraps tab data into panel arrays for multi-panel support';

  private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    this._context = _context;
  }

  /**
   * Migrates tab flags from flat arrays to 2D arrays for all users and settings
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
    };

    const allSettings = ModuleSettings.get(SettingKey.settingIndex) || [];

    for (const user of game.users!) {
      for (const settingIdx of allSettings) {
        try {
          const rawTabs = user.getFlag(moduleId, `tabs.${settingIdx.settingId}`) as any;
          if (!rawTabs || !Array.isArray(rawTabs) || rawTabs.length === 0)
            continue;

          // Skip if already migrated (first element is an array)
          if (Array.isArray(rawTabs[0]))
            continue;

          // Wrap in outer array to create single-panel 2D structure
          await user.setFlag(moduleId, `tabs.${settingIdx.settingId}`, [rawTabs]);
          result.migratedCount++;
        } catch (error) {
          result.failedCount++;
          console.error(`Migration v1.9.0: failed to migrate tabs for user ${user.name}, setting ${settingIdx.settingId}:`, error);
        }
      }
    }

    return result;
  }
}
