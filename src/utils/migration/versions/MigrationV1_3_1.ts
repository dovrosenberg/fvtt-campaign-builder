import { Migration, MigrationResult, MigrationContext } from '../types';
import { useMainStore } from '@/applications/stores';
import { FCBSetting, } from '@/classes';
import { relationshipKeyReplace } from '@/documents';
import { RelatedItemDetails, ValidTopic } from '@/types';

type RelationshipFieldType = Record<ValidTopic, Record<string,RelatedItemDetails<any, any>>>; 

/**
 * Migration 1.3.1
 * One-time pass to normalize entry relationships.
 * - Decodes serialized relationship keys
 * - Flattens nested relationship structures so each leaf is keyed by its own uuid
 */
export class MigrationV1_3_1 implements Migration {
  public readonly targetVersion = '1.3.1';
  public readonly description = 'Normalize relationships for all entries (decode keys and flatten nested structures)';

  private _context: MigrationContext;

  constructor(context: MigrationContext) {
    this._context = context;
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
      const allSettings = await useMainStore().getAllSettings();

      // Count total entries for progress
      let totalEntries = 0;
      for (const setting of allSettings) {
        totalEntries += this.countEntriesInSetting(setting);
      }

      let processed = 0;
      const updateProgress = (status: string) => {
        const event = new CustomEvent('migration-progress', {
          detail: { current: processed, total: totalEntries, status }
        });
        document.dispatchEvent(event);
      };

      for (const setting of allSettings) {
        updateProgress(`Processing setting: ${setting.name}`);

        for (const topicFolder of Object.values(setting.topicFolders)) {
          const topicEntries = topicFolder.allEntries();

          for (const entry of topicEntries) {
            try {
              updateProgress(`Normalizing: ${entry.name}`);

              const decoded = relationshipKeyReplace(entry.relationships as any, false);
              const normalized = this.normalizeRelationships(decoded as any);

              // Only persist if it actually changes
              if (JSON.stringify(decoded) !== JSON.stringify(normalized)) {
                if (this._context.dryRun) {
                  // eslint-disable-next-line no-console
                  console.log(`[DRY RUN] Would normalize relationships for entry: ${entry.name}`);
                } else {
                  entry.relationships = normalized as any;
                  await entry.save();
                  result.migratedCount++;
                }
              }
            } catch (e) {
              result.failedCount++;
              result.success = false;
              result.errors?.push(`Failed to normalize relationships for entry ${entry.name} (${entry.uuid}): ${e}`);
              // eslint-disable-next-line no-console
              console.error('MigrationV1_3_1 error:', e);
            } finally {
              processed++;
            }
          }
        }
      }
    } catch (outer) {
      result.success = false;
      result.errors?.push(`MigrationV1_3_1 failed: ${outer}`);
      // eslint-disable-next-line no-console
      console.error('MigrationV1_3_1 fatal error:', outer);
    }

    return result;
  }

  private countEntriesInSetting(setting: FCBSetting): number {
    let count = 0;
    for (const topicFolder of Object.values(setting.topicFolders as Record<ValidTopic, any>)) {
      count += topicFolder.allEntries().length;
    }
    return count;
  }
  
  // Flatten any nested relationship objects into a flat map keyed by each item's uuid
  private normalizeRelationships(relationships: RelationshipFieldType): RelationshipFieldType {
    const flattened = {} as RelationshipFieldType;
  
    const collect = (node: any, out: Record<string, any>) => {
      if (!node || typeof node !== 'object') return;
  
      for (const [k, v] of Object.entries(node)) {
        if (v && typeof v === 'object') {
          // If this looks like a relationship leaf, use its own uuid as the key
          if ('uuid' in v && typeof (v as any).uuid === 'string') {
            out[(v as any).uuid] = v;
          } else {
            collect(v, out);
          }
        }
      }
    };
  
    for (const topic in relationships) {
      const out: Record<string, any> = {};
      collect(relationships[topic], out);
      // If nothing was collected (already flat), just copy as-is
      flattened[topic as unknown as ValidTopic] = Object.keys(out).length ? out : relationships[topic];
    }
  
    return flattened;
  };
  
}

