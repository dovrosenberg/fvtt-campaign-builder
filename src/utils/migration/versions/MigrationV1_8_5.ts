import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { Campaign, Entry, FCBSetting } from '@/classes';
import { localize } from '@/utils/game';
import { RelatedJournal } from '@/types';
import { moduleId } from '@/settings';
import { DOCUMENT_TYPES } from '@/documents';

let processed = 0;
let totalEntries = 0;
const updateProgress = (status: string) => {
  const event = new CustomEvent('migration-progress', {
    detail: { current: processed, total: totalEntries, status }
  });
  document.dispatchEvent(event);
};

export class MigrationV1_8_5 implements Migration {
  public readonly targetVersion = '1.8.5';
  public readonly description = 'Updates all related journals to use the new composite UUID format (journalUuid|pageUuid|anchor-slug) by ensuring exactly two trailing pipes';

  private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    this._context = _context;
  }

  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: []
    };

    // We don't support dry run for this migration
    if (this._context.dryRun)
      throw new Error('Dry run not supported in 1.9');

    try {
      const settings = await useMainStore().getAllSettings();

      // Count total entries to migrate
      for (const setting of settings) {
        const allDocumentsIndex = await setting.compendium.getIndex({
          fields: [
            'name',
            'uuid',
            `flags.fvtt-campaign-builder.campaignBuilderType`,
          ]
        });

        totalEntries += allDocumentsIndex.filter((d: any) => (
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Campaign ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Entry ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Setting
        )).length;
      }

      // Migrate each document
      for (const setting of settings) {
        const allDocumentsIndex = await setting.compendium.getIndex({
          fields: [
            'uuid',
            `flags.fvtt-campaign-builder.campaignBuilderType`,
          ]
        });

        const relevantDocs = allDocumentsIndex.filter((d: any) => (
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Campaign ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Entry ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Setting
        ));

        for (const doc of relevantDocs) {
          try {
            const journalEntry = await foundry.utils.fromUuid<JournalEntry>(doc.uuid);
            if (!journalEntry || !journalEntry.pages || journalEntry.pages.contents.length !== 1) {
              continue;
            }

            // Get the appropriate document instance based on type
            const docType = doc.flags?.[moduleId]?.campaignBuilderType;
            let document: Campaign | Entry | FCBSetting | null = null;

            switch (docType) {
              case DOCUMENT_TYPES.Campaign:
                document = new Campaign(journalEntry);
                break;
              case DOCUMENT_TYPES.Entry:
                document = new Entry(journalEntry);
                break;
              case DOCUMENT_TYPES.Setting:
                document = new FCBSetting(journalEntry);
                break;
              default:
                continue;
            }

            // Update related journals
            if (document && document.journals && document.journals.length > 0) {
              const updatedJournals: RelatedJournal[] = document.journals.map(journal => {
                let uuid = journal.uuid;
                
                // Ensure UUID has exactly two trailing pipes for the new composite format
                // Format: journalUuid|pageUuid|anchor-slug
                if (!uuid.endsWith('||')) {
                  if (uuid.endsWith('|')) {
                    // Already has one pipe (entry-level links from previous versions)
                    // Add one more to make it two pipes
                    uuid = `${uuid}|`;
                  } else {
                    // No trailing pipes, add two
                    uuid = `${uuid}||`;
                  }
                }
                
                return {
                  ...journal,
                  uuid: uuid,
                  // Set anchor to null if it doesn't exist
                  anchor: journal.anchor ?? null
                };
              });

              document.journals = updatedJournals;
              await document.save();
              result.migratedCount++;
            }

          } catch (inner) {
            result.failedCount++;
            result.errors?.push(`Failed to migrate document for ${doc.uuid}: ${inner}`);
          }

          processed++;
          updateProgress(localize('dialogs.migrationProgress.status.migratedDocumentsProgress', { migrated: processed.toString(), total: totalEntries.toString() }));
        }
      }

    } catch (outer) {
      result.success = false;
      result.errors?.push(`MigrationV1_9 failed: ${outer}`);
      notifyError(`MigrationV1_9 failed: ${outer}`);
      console.error('MigrationV1_9 fatal error:', outer);
    }

    return result;
  }
}
