import { Migration, MigrationResult, MigrationContext } from '../types';
import { Campaign, Session, Arc } from '@/classes';
import { useMainStore } from '@/applications/stores';

/**
 * Migration v1.8.6
 * 
 * Removes the journal columns from the lore tables in Campaign, Arc, and Session views.
 * The journals tab on entries remains intact.
 * 
 * Migrates existing journal references from lore records to the description text.
 */
export class MigrationV1_8_6 implements Migration {
  public readonly targetVersion = '1.8.6';
  public readonly description = 'Removes the journal columns from the lore tables and migrates journal references to description text';

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
}
