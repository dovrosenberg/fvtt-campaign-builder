import { Migration, MigrationResult, MigrationContext } from '../types';
import { SettingDoc } from '@/documents';
import { useMainStore, } from '@/applications/stores';
import { Setting, Entry } from '@/classes';
import { Hierarchy, Topics } from '@/types';

/**
 * Migration for upgrading from versions <1.2 to >=1.2
 * 
 * This migration handles the transition from PC journal entries (using PCDataModel)
 * to Entry journal entries with topic=PC (using EntryDataModel).
 */
export class MigrationV1_2 implements Migration {
  public readonly targetVersion = '1.2.0';
  public readonly description = 'Migrate PC journal entries from PCDataModel to EntryDataModel with topic=PC';

  private _context: MigrationContext;

  constructor(context: MigrationContext) {
    this._context = context;
  }

  /**
   * Perform the migration
   */
  async migrate(): Promise<MigrationResult> {
    const oldPCEntries = await this.findOldPCEntries();
    
    let anyTodo = false;
    let totalCount = 0;
    for (const settingId in oldPCEntries) {
      if (oldPCEntries[settingId].length > 0) {
        anyTodo = true;
        totalCount += oldPCEntries[settingId].length;
      }
    }

    if (!anyTodo) {
      return {
        success: true,
        migratedCount: 0,
        failedCount: 0,
        warnings: ['No old PC entries found to migrate']
      };
    }

    const result = await this.migrateAllEntries(oldPCEntries, totalCount);

    if (result.failedCount === 0) {
      await this.cleanupOldEntries();
    }

    return result;
  }

  /**
   * Find all old PC journal entries
   * Return a map from settingId to the list of PCs in it
   */
  private async findOldPCEntries(): Promise<Record<string, JournalEntryPage[]>> {
    const entries: Record<string, JournalEntryPage[]> = {};

    // get the root folder
    const allSettings = await useMainStore().getAllSettings();
    
    // loop over all the settings (the subfolders)
    for (const setting of allSettings) {
      if (!entries[setting.uuid])
        entries[setting.uuid] = [];
      
      // go through all the campaigns
      for (const campaignId of Object.keys(setting.campaigns)) {
        // each campaign wraps a journal entry; some of the pages are PCs
        const campaignJE = setting.campaigns[campaignId].raw;

        for (const page of campaignJE.pages) {
          // @ts-ignore
          if (page.type === 'campaign-builder.pc') {
            entries[setting.uuid].push(page);
          }
        }
      }
    }
    return entries;
  }

  private async migrateAllEntries(oldPCEntries: Record<string, JournalEntryPage[]>, totalCount: number): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: []
    };
    
    let processedCount = 0;

    // Show progress updates
    const updateProgress = (status: string) => {
      // Emit progress event for MigrationManager to pick up
      const event = new CustomEvent('migration-progress', {
        detail: {
          current: processedCount,
          total: totalCount,
          status: status
        }
      });
      document.dispatchEvent(event);
    };

    for (const settingId in oldPCEntries) {
      if (oldPCEntries[settingId].length === 0)
        continue;
      
      updateProgress(`Processing setting ${settingId}...`);
      
      const setting = new Setting(settingId);
      await setting.validate();

      if (!setting) {
        console.log('Skipping invalid setting id in MigrationV1_2.migrateAllEntries(): ' + settingId);
        continue;
      }

      for (const page of oldPCEntries[settingId]) {
        updateProgress(`Migrating PC: ${page.name}...`);
        await this.migrateSingleEntry(setting, page, result);
        processedCount++;
        updateProgress(`Completed ${page.name}`);
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Migrate a single PC journal entry
   * Updates result
   */
  private async migrateSingleEntry(setting: Setting, page: JournalEntryPage, result: MigrationResult): Promise<void> {
    if (this._context.dryRun) {
      console.log(`[DRY RUN] Would migrate PC: ${page.name}`);
      return;
    }

    try {
      // Extract old PC data
      const oldData = page.system as any;
      const pcData = {
        playerName: oldData.playerName || '',
        actorId: oldData.actorId || '',
        name: '<Link to Actor>',
        background: oldData.background || '',
        plotPoints: oldData.plotPoints || '',
        magicItems: oldData.magicItems || '',
        tags: [],
        relationships: [],
        scenes: [],
        actors: [],
        journals: [],
        img: page.img || '',
        rolePlayingNotes: '',
      };

      // get the actor name
      if (pcData.actorId) {
        const actor = await fromUuid(pcData.actorId);
        if (actor)
          pcData.name = actor.name;
      }

      // find the PC folder for the setting
      const pcFolder = setting.topicFolders[Topics.PC];
      
      // we can't do useSettingDirectoryStore().createEntry() because we don't have a current setting
      const newEntry = await Entry.create(pcFolder, { name: pcData.name });
      
      if (!newEntry)
        throw new Error('Failed to create new Entry journal entry');
      
      newEntry.playerName = pcData.playerName || 'Unknown';
      newEntry.actorId = pcData.actorId;
      newEntry.background = pcData.background;
      newEntry.plotPoints = pcData.plotPoints;
      newEntry.magicItems = pcData.magicItems;
      newEntry.img = pcData.img;
      newEntry.name = pcData.name;
      await newEntry.save();

      const uuid = newEntry.uuid;

      // we always add a hierarchy, because we use it for filtering
      setting.setEntryHierarchy(uuid, 
        {
          parentId: '',
          ancestors: [],
          children: [],
          type: '',
        } as Hierarchy
      );
      await setting.save();

      // no parent - set as a top node
      const topNodes = pcFolder.topNodes;
      pcFolder.topNodes = topNodes.concat([uuid]);
      await pcFolder.save();

      console.log(`Migrated PC "${pcData.name}" to new Entry format`);
      result.migratedCount++;
    } catch (error) {
      result.failedCount++;
      result.errors?.push(`Failed to migrate PC "${page.name}": ${error}`);
      console.error(`Migration error for PC "${page.name}":`, error);
    }
  }

  /**
   * Cleanup old PC journal entries after migration
   */
  async cleanupOldEntries(): Promise<void> {
    const oldPCEntries = await this.findOldPCEntries();
    
    for (const settingId in oldPCEntries) {
      if (oldPCEntries[settingId].length === 0)
        continue;

      try {
        const setting = new Setting(settingId);
        await setting.validate();

        if (!setting) {
          console.log('Skipping invalid setting id in MigrationV1_2.cleanupOldEntries(): ' + settingId);
          continue;
        }

        for (const oldPage of oldPCEntries[settingId]) {
          if (this._context.dryRun) {
            console.log(`[DRY RUN] Would delete old PC entry: ${oldPage.name}`);
            continue;
          }

          await setting.executeUnlocked(async () => {
            await oldPage.delete();
          });
          
          console.log(`Deleted old PC entry: ${oldPage.name}`);
        }
      } catch (error) {
        console.error(`Cleanup error for PC:`, error);
      }
    }
  }
}
