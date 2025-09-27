import { Migration, MigrationResult, MigrationContext } from '../types';
import { SettingDoc } from '@/documents';
import { notifyError } from '@/utils/notifications';
import { ModuleSettings, SettingKey } from '@/settings';
import { RootFolder } from '@/classes';

const moduleId = 'campaign-builder';  // don't want to use from settings because maybe it changed

/**
 * Migration 1.5.0
 * Moves all setting data off of existing Setting folders and into module settings
 */
export class MigrationV1_5 implements Migration {
  public readonly targetVersion = '1.5.0';
  public readonly description = 'Moves all setting data off of existing Setting folders and into module settings';

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
      const allSettingFolders = await getAllSettings();

      let processed = 0;
      const updateProgress = (status: string) => {
        const event = new CustomEvent('migration-progress', {
          detail: { current: processed, total: allSettingFolders.length, status }
        });
        document.dispatchEvent(event);
      };

      const newSettings: Record<string, SettingDoc> = {};

      for (const folder of allSettingFolders) {
        const settingId: string = folder.getFlag(moduleId, 'compendiumId');

        // get all the setting configuration
        const settingDetails: SettingDoc = {
          name: folder.name,
          topicIds: folder.getFlag(moduleId, 'topicIds'),
          campaignNames: folder.getFlag(moduleId, 'campaignNames'),
          expandedIds: folder.getFlag(moduleId, 'expandedIds'),
          hierarchies: folder.getFlag(moduleId, 'hierarchies'),
          genre: folder.getFlag(moduleId, 'genre'),
          settingFeeling: folder.getFlag(moduleId, 'worldFeeling'), // leaving the key value for backwards compatibility
          description: folder.getFlag(moduleId, 'description'),
          img: folder.getFlag(moduleId, 'img'),   // image path for the setting
          nameStyles: folder.getFlag(moduleId, 'nameStyles'),   // array of name styles to use for name generation
          rollTableConfig: folder.getFlag(moduleId, 'rollTableConfig'),   // setting-specific roll table configuration
          nameStyleExamples: folder.getFlag(moduleId, 'nameStyleExamples'),   // stored example names for each style with their genre and setting feeling
          journals: folder.getFlag(moduleId, 'journals'),
        }
        
        // all we need to do is create the settings for it
        newSettings[settingId] = settingDetails;

        // and update the permissions to hide and unlock the compendium
        const pack = game.packs.get(settingId);
        await pack?.configure({ ownership: { 
          GAMEMASTER: 'OWNER', 
          ASSISTANT: 'LIMITED', 
          TRUSTED: 'LIMITED', 
          PLAYER: 'LIMITED' 
        }, locked: false });

        // we don't clean up the folder because there's not really any reason to

        updateProgress(`Processing setting: ${settingDetails.name}`);
        processed++;
      }

      // save them all
      await ModuleSettings.set(SettingKey.settings, newSettings);
    } catch (outer) {
      result.success = false;
      result.errors?.push(`MigrationV1_5 failed: ${outer}`);
      // eslint-disable-next-line no-console
      notifyError(`MigrationV1_5 failed: ${outer}`);
      console.error('MigrationV1_5 fatal error:', outer);

      // I don't think there's any reason to set the permissions back the way they were
      //    by keeping things hidden, we also likely make their folders hidden which will
      //    keep people from breaking things in the meantime
    }

    return result;
  }
    
}

/**
 * Get all setting folders from the root folder - the old way
 * @returns Array of setting folders
 */
async function getAllSettings(): Promise<Folder[]> {
  const rootFolder = await RootFolder.get();
  if (!rootFolder) {
    notifyError('No root folder in MigrationV1_5.getAllSettings().  Migration failed.  To avoid data loss, stop using Campaign Builder and notify the developer in Github or Discord');
    throw new Error('No root folder in MigrationV1_5.getAllSettings()');
  }

  const settings: Folder[] = [];
  
  for (const child of rootFolder.children) {
    // it had a couple different names
    if (child.folder && (child.folder.getFlag(moduleId, 'isSetting') || child.folder.getFlag(moduleId, 'isWorld'))) {
      settings.push(child.folder);
    }
  }

  return settings;
}
