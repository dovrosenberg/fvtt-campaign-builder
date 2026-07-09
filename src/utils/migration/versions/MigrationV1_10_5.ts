import { Migration, MigrationResult, MigrationContext } from '../types';
import { useMainStore } from '@/applications/stores';
import { Entry } from '@/classes';
import { Topics } from '@/types';

/**
 * Migration v1.10.5
 *
 * Repairs entry index rows that were incorrectly flagged as branches by the v1.10.3
 * migration. That migration treated any hierarchy with a non-null `locationParentId`
 * as a branch, but some older hierarchies stored `''` (empty string) instead of null,
 * so regular organizations got flagged `isBranch=true` and disappeared from the
 * directory tree.
 *
 * The entry documents themselves were never corrupted (`system.isBranch` is only set
 * by the branch-creation flow), so they are the source of truth: any flagged index row
 * whose document is not actually a branch gets its flag cleared. Also normalizes
 * `locationParentId: ''` to null in hierarchies so string coercion can't cause this again.
 */
export class MigrationV1_10_5 implements Migration {
  public readonly targetVersion = '1.10.5';
  public readonly description = 'Clears isBranch flags wrongly set on organization index rows and normalizes empty locationParentId values';

  constructor(_context: MigrationContext) {
    // no context state needed
  }

  /**
   * Walk each setting; resync `isBranch` on flagged Organization index rows from the
   * entry documents, and convert `locationParentId: ''` to null in all hierarchies.
   * Save the setting only when something actually changed.
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
        let changed = false;

        // resync flagged org index rows from the entry documents (the source of truth)
        const orgFolder = setting.topicFolders[Topics.Organization];
        if (orgFolder) {
          for (const entryItem of orgFolder.entryIndex) {
            if (!entryItem.isBranch)
              continue;

            // only clear the flag when the document is confirmed to not be a branch;
            //   unresolvable uuids are left alone rather than guessed at
            const entry = await Entry.fromUuid(entryItem.uuid);
            if (entry && !entry.isBranch) {
              entryItem.isBranch = false;
              changed = true;
              result.migratedCount++;
            }
          }
        }

        // normalize empty-string locationParentId to null so `== null` checks behave
        for (const hierarchy of Object.values(setting.hierarchies)) {
          if (hierarchy && (hierarchy.locationParentId as string | null) === '') {
            hierarchy.locationParentId = null;
            changed = true;
            result.migratedCount++;
          }
        }

        if (changed)
          await setting.save();
      } catch (error) {
        result.failedCount++;
        console.error(`Migration v1.10.5: failed to repair setting ${setting.uuid}:`, error);
      }
    }

    return result;
  }
}
