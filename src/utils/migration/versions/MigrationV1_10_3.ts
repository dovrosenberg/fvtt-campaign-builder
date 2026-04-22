import { Migration, MigrationResult, MigrationContext } from '../types';
import { useMainStore } from '@/applications/stores';
import { Topics } from '@/types';

/**
 * Migration v1.10.3
 *
 * Backfills the `isBranch` flag on entry index rows. Earlier versions lacked this
 * field in the EntryBasicIndex schema, so Foundry dropped it whenever the setting
 * was persisted. Branches can be identified via their hierarchy: any entry whose
 * hierarchy has a non-null `locationParentId` is a branch.
 */
export class MigrationV1_10_3 implements Migration {
  public readonly targetVersion = '1.10.3';
  public readonly description = 'Restores isBranch flag on entry index rows for existing branches';

  constructor(_context: MigrationContext) {
    // no context state needed
  }

  /**
   * Walk each setting's hierarchies; for every entry with a non-null locationParentId,
   * set isBranch=true on its matching Organization entryIndex row. Save the setting
   * only when something actually changed.
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
    };

    const settings = await useMainStore().getAllSettings();

    for (const setting of settings) {
      try {
        const hierarchies = setting.hierarchies;
        const orgFolder = setting.topicFolders[Topics.Organization];

        if (!orgFolder)
          continue;

        // branches live in the Organization topic, identified by locationParentId in the hierarchy
        let changed = false;
        for (const [uuid, hierarchy] of Object.entries(hierarchies)) {
          if (!hierarchy || hierarchy.locationParentId == null)
            continue;

          const entryItem = orgFolder.entryIndex.find((e) => e.uuid === uuid);
          if (entryItem && !entryItem.isBranch) {
            entryItem.isBranch = true;
            changed = true;
            result.migratedCount++;
          }
        }

        if (changed)
          await setting.save();
      } catch (error) {
        result.failedCount++;
        console.error(`Migration v1.10.3: failed to repair setting ${setting.uuid}:`, error);
      }
    }

    return result;
  }
}
