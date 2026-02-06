import { Migration, MigrationResult, MigrationContext } from '../types';
import { Campaign, Session, Arc, Entry } from '@/classes';
import { useMainStore } from '@/applications/stores';
import { moduleId } from '@/settings';
import { DOCUMENT_TYPES } from '@/documents';
import { Topics } from '@/types';

/**
 * Migration v1.8.6
 *
 * 1. Removes the journal columns from the lore tables in Campaign, Arc, and Session views.
 *    The journals tab on entries remains intact.
 *    Migrates existing journal references from lore records to the description text.
 *
 * 2. Renames 'role' to 'relationship' in entry-to-entry relationship extraFields.
 */
export class MigrationV1_8_6 implements Migration {
  public readonly targetVersion = '1.8.6';
  public readonly description = 'Removes journal columns from lore tables and renames role to relationship in entry extraFields';

  private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    this._context = _context;
  }

  /**
   * Migrates journal references from lore records to description text
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0
    };

    try {
      const settings = await useMainStore().getAllSettings();
      
      for (const setting of settings) {
        console.log(`Migrating setting: ${setting.name}`);
        
        // Migrate Campaign lore
        for (const campaign of Object.values(setting.campaigns)) {
          await this.migrateCampaignLore(campaign);
          result.migratedCount++;

        // Migrate Arc lore
        for (const arcIdx of campaign.arcIndex) {
          const arc = await Arc.fromUuid(arcIdx.uuid);
          if (!arc)
            continue;

          await this.migrateArcLore(arc);
          result.migratedCount++;
        }
        
        // Migrate Session lore
        const sessions = await campaign.allSessions();
        for (const session of sessions) {
          await this.migrateSessionLore(session);
          result.migratedCount++;
        }
        }        
      }
      // Migrate entry relationship extraFields: rename 'role' key to 'relationship'
      for (const setting of settings) {
        const allDocumentsIndex = await setting.compendium.getIndex({
          fields: [
            'uuid',
            `flags.fvtt-campaign-builder.campaignBuilderType`,
          ]
        });

        const entryDocs = allDocumentsIndex.filter((d: any) =>
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Entry
        );

        for (const doc of entryDocs) {
          try {
            const journalEntry = await fromUuid<JournalEntry>(doc.uuid);
            if (!journalEntry || !journalEntry.pages || journalEntry.pages.contents.length !== 1)
              continue;

            const entry = new Entry(journalEntry);
            const changed = this.migrateEntryExtraFields(entry);

            if (changed) {
              await entry.save();
              result.migratedCount++;
            }
          } catch (inner) {
            result.failedCount++;
            console.error(`Failed to migrate extraFields for ${doc.uuid}:`, inner);
          }
        }
      }
    } catch (error) {
      console.error('Migration v1.8.6 failed:', error);
      result.success = false;
      result.failedCount = 1;
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }

    return result;
  }

  /**
   * Migrates journal references in campaign lore
   */
  private async migrateCampaignLore(campaign: Campaign): Promise<void> {
    let hasChanges = false;
    
    for (const lore of campaign.lore) {
      // @ts-ignore - still on the data structure for now
      if (lore.journalEntryPageId) {
        // Add the journal reference to the description
        // @ts-ignore - still on the data structure for now
        const journalRef = `@UUID[${lore.journalEntryPageId}]`;
        if (lore.description && !lore.description.includes(journalRef)) {
          lore.description = lore.description + '\n' + journalRef;
        } else if (!lore.description) {
          lore.description = journalRef;
        }
        
        // Remove the journalEntryPageId field
        // @ts-ignore - still on the data structure for now
        delete lore.journalEntryPageId;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      await campaign.save();
    }
  }

  /**
   * Migrates journal references in arc lore
   */
  private async migrateArcLore(arc: Arc): Promise<void> {
    let hasChanges = false;
    
    for (const lore of arc.lore) {
      // @ts-ignore - still on the data structure for now
      if (lore.journalEntryPageId) {
        // Add the journal reference to the description
        // @ts-ignore - still on the data structure for now
        const journalRef = `@UUID[${lore.journalEntryPageId}]`;
        if (lore.description && !lore.description.includes(journalRef)) {
          lore.description = lore.description + '\n' + journalRef;
        } else if (!lore.description) {
          lore.description = journalRef;
        }
        
        // Remove the journalEntryPageId field
        // @ts-ignore - still on the data structure for now
        delete lore.journalEntryPageId;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      await arc.save();
    }
  }

  /**
   * Migrates journal references in session lore
   */
  private async migrateSessionLore(session: Session): Promise<void> {
    let hasChanges = false;

    for (const lore of session.lore) {
      // @ts-ignore - still on the data structure for now
      if (lore.journalEntryPageId) {
        // Add the journal reference to the description
        // @ts-ignore - still on the data structure for now
        const journalRef = `@UUID[${lore.journalEntryPageId}]`;
        if (lore.description && !lore.description.includes(journalRef)) {
          lore.description = lore.description + '\n' + journalRef;
        } else if (!lore.description) {
          lore.description = journalRef;
        }

        // Remove the journalEntryPageId field
        // @ts-ignore - still on the data structure for now
        delete lore.journalEntryPageId;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await session.save();
    }
  }

  /**
   * Renames 'role' to 'relationship' in entry-to-entry relationship extraFields
   * @returns true if any changes were made
   */
  private migrateEntryExtraFields(entry: Entry): boolean {
    let hasChanges = false;
    const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];

    for (const topic of topics) {
      const relatedEntries = entry.relationships[topic];
      if (!relatedEntries)
        continue;

      for (const relatedId in relatedEntries) {
        const related = relatedEntries[relatedId];
        if (!related?.extraFields)
          continue;

        // Rename 'role' key to 'relationship'
        if ('role' in related.extraFields && !('relationship' in related.extraFields)) {
          (related.extraFields as Record<string, unknown>).relationship = (related.extraFields as Record<string, unknown>).role;
          delete (related.extraFields as Record<string, unknown>).role;
          hasChanges = true;
        }
      }
    }

    return hasChanges;
  }
}
