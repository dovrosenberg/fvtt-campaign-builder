import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { moduleId } from '@/settings';

let processed = 0;
let totalEntries= 0;
const updateProgress = (status: string) => {
  const event = new CustomEvent('migration-progress', {
    detail: { current: processed, total: totalEntries, status }
  });
  document.dispatchEvent(event);
};

/**
 * Migration 1.7.0
 * Deletes any invalid documents (ones that were deleted incorrectly previously)
 */
export class MigrationV1_7 implements Migration {
  public readonly targetVersion = '1.7.0';
  public readonly description = 'Deletes any invalid documents (ones that were deleted incorrectly previously)';

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

    try {
      const settings = await useMainStore().getAllSettings();

      // these will be fast - so just count by setting
      totalEntries = settings.length;

      // load all the docs in the setting and find ones missing pages
      for (const setting of settings) {
        // we have to load the campaigns manually b/c setting.campaignNames isn't valid any more
        const allDocumentsIndex = await setting.compendium.getIndex({
          fields: [
            'name', 
            // @ts-ignore
            'uuid', 
            // @ts-ignore
            'flags.campaign-builder.campaignBuilderType',
            // @ts-ignore
            'pages.system',
          ]
        });
        
        for (const doc of allDocumentsIndex) {
          // see if there's no page - these were deleted poorly in a prior release
          if (!doc.pages || doc.pages.length===0) {
            // delete it properly 
            const fullDoc = await fromUuid<JournalEntry>(doc.uuid);
            if (fullDoc)
              await fullDoc.delete();
          }
        }

        // @ts-ignore
        await game.modules.get(moduleId)?.repairAllIndexes(setting.uuid);

        processed++;
        updateProgress(`Processed setting: ${setting.name}`);  
      }
    } catch (outer) {
      result.success = false;
      result.errors?.push(`MigrationV1_7 failed: ${outer}`);
      // eslint-disable-next-line no-console
      notifyError(`MigrationV1_7 failed: ${outer}`);
      console.error('MigrationV1_7 fatal error:', outer);
    }

    return result;
  }    
}
