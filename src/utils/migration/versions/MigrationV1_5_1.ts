import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { EntryBasicIndex, Hierarchy, SessionBasicIndex, Topics, ValidTopic } from '@/types';
import { DOCUMENT_TYPES } from '@/documents';
import { Campaign } from '@/classes';


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

    try {
      const settings = await useMainStore().getAllSettings();

      // get the counts
      for (const setting of settings) {
        for (const topicId in setting.topics) {   
          totalEntries += setting.topics[topicId].entries.length;
        }
      }

      // double it for hierarchies plus actual entries (unless we're going to skip the actual ones)
      if (this._context.originalVersion === '1.5.0')
        totalEntries *= 2;

      const getAncestors = (hierarchies: Record<string, Hierarchy>, entryId: string): string[] => {
        const entry = hierarchies[entryId];
        if (!entry)
          return [];

        if (entry.parentId) {
          return [entry.parentId, ...getAncestors(hierarchies, entry.parentId)];
        } else {
          return [];
        }
      };

      // rebuild the hierarchies... the parents are right but the ancestors aren't
      for (const setting of settings) {
        const updatedHierarchies = {};

        const hierarchies = setting.hierarchies;

        // for every element, do a recursive search for parents to fix the ancestor list
        for (const entryId in hierarchies) {
          const entry = hierarchies[entryId];

          if (!entry)
            continue;

          updatedHierarchies[entryId] = {
            ...entry,
            ancestors: getAncestors(hierarchies, entryId)
          };

          processed++;
          updateProgress(`Processing hierarchy`);
        }

        setting.hierarchies = updatedHierarchies;
        await setting.save();
      }

      // if we just ran the 1.5.0 then we don't need to update the entry structure because it applies
      //   the latest model; but if we are upgrading from 1.5.0 previously migrated, then
      //   we need to do this
      if (this._context.originalVersion !== '1.5.0')
        return result;

      // now do the conversion
      for (const setting of settings) {
        const newEntries = {
          [Topics.Character]: [] as EntryBasicIndex[],
          [Topics.Location]: [] as EntryBasicIndex[],
          [Topics.Organization]: [] as EntryBasicIndex[],
          [Topics.PC]: [] as EntryBasicIndex[],
        } as Record<ValidTopic, EntryBasicIndex[]>;

        const entries = await setting.allEntries();

        for (const entry of entries) {
          newEntries[entry.topic].push({
            uuid: entry.uuid,
            name: entry.name,
            type: entry.type
          });
          processed++;
          updateProgress(`Processing entry: ${entry.name}`);
        }

        for (const topicId in setting.topics) {
          setting.topics[topicId].entries = newEntries[topicId];
        }

        // ignore the sessions in the count for simplicity

        // Build a temporary flat index of all sessions in this setting, keyed by campaignId
        const tempIndex = [] as (SessionBasicIndex & { campaignId: string })[];
        for (const session of await setting.allSessions()) {
          tempIndex.push({
            campaignId: session.campaignId,
            uuid: session.uuid,
            name: session.name,
            number: session.number,
            date: session.date?.toLocaleDateString() || null,
          });
        }

        // Find all campaign journal entries in this setting's compendium directly
        const pack = setting.compendium;
        const campaignIndexEntries = await pack.getIndex({
          fields: [
            'name',
            'uuid',
            'flags.campaign-builder.campaignBuilderType',
          ],
        });

        const campaignEntries = campaignIndexEntries.filter((idx: any) =>
          idx.flags?.['campaign-builder']?.campaignBuilderType === DOCUMENT_TYPES.Campaign
        );

        // For each campaign, rebuild its sessionIndex 
        for (const idx of campaignEntries) {
          const campaign = await Campaign.fromUuid(idx.uuid);
          if (!campaign)
            continue;

          const newIndex = tempIndex.filter((s) => s.campaignId === campaign.uuid);

          // Overwrite the sessionIndex with the rebuilt list
          campaign.sessionIndex = newIndex.map((s: SessionBasicIndex) => ({
            uuid: s.uuid,
            name: s.name,
            number: s.number,
            date: s.date,
          }));

          await campaign.save();
          updateProgress(`Processing campaign: ${campaign.name}`);
        }

        // After updating campaign pages, force a full compendium index rebuild so that
        // @ts-ignore - pack.indexFields is provided by Foundry at runtime
        await pack.getIndex({ fields: [foundry.utils.randomID()]});
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
