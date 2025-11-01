import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { EntryBasicIndex } from '@/types';


let processed = 0;
let totalEntries= 0;
const updateProgress = (status: string) => {
  const event = new CustomEvent('migration-progress', {
    detail: { current: processed, total: totalEntries, status }
  });
  document.dispatchEvent(event);
};

/**
 * Migration 1.5.1
 * Rebuilds the topic folder entries index
 */
export class MigrationV1_5_1 implements Migration {
  public readonly targetVersion = '1.5.1';
  public readonly description = 'Rebuilds the topic folder entries index';

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

    // if we just ran the 1.5.0 then we don't need to do anything because it applies
    //   the latest model; but if we are upgrading from 1.5.0 previously migrated, then
    //   we need to do this
    if (this._context.originalVersion !== '1.5.0')
      return result;

    try {
      const settings = await useMainStore().getAllSettings();

      // get the counts
      for (const setting of settings) {
        for (const topicId in setting.topics) {   
          totalEntries += setting.topics[topicId].entries.length;
        }
      }

      // now do the conversion
      for (const setting of settings) {
        for (const topicId in setting.topics) {
          const newEntries = [] as EntryBasicIndex[];

            for (const entryId in setting.topics[topicId].entries) {
            newEntries.push(await migrateEntry(entryId));

            processed++;
            updateProgress(`Processing entry: ${newEntries[newEntries.length-1].name}`);
          }

          setting.topics[topicId].entries = newEntries;
          await setting.save();
        }
      }
    } catch (outer) {
      result.success = false;
      result.errors?.push(`MigrationV1_5_1 failed: ${outer}`);
      // eslint-disable-next-line no-console
      notifyError(`MigrationV1_5_1 failed: ${outer}`);
      console.error('MigrationV1_5_1 fatal error:', outer);
    }

    return result;
  }    
}

async function migrateEntry(uuid: string): Promise<EntryBasicIndex> {
  const entry = await fromUuid<JournalEntry>(uuid);
  
  if (!entry)
    throw new Error(`Unable to find entry for ${uuid} in migrateEntry`);

  return {
    uuid,
    name: entry.name,
    // @ts-ignore
    type: entry.system?.type || ''
  }
}

