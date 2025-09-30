import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { ModuleSettings, SettingKey, UserFlagKey, UserFlags } from '@/settings';
import { RootFolder, FCBSetting } from '@/classes';
import { SettingDataModel, SettingDoc } from 'src/documents';

const moduleId = 'campaign-builder';  // don't want to use from settings because maybe it changed

/**
 * Migration 1.5.0
 * Moves all setting data off of existing FCBSetting folders and into module settings
 */
export class MigrationV1_5 implements Migration {
  public readonly targetVersion = '1.5.0';
  public readonly description = 'Moves all setting data off of existing FCBSetting folders and into module settings';

  // private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    // this._context = context;
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

      // map ids to names
      const newSettings: Record<string, string> = {};
      const mapSettingIds: Record<string, string> = {};   // map old folder Ids to new ids

      for (const folder of allSettingFolders) {
        const setting = await migrateSetting(folder);

        // we then just need to save the index info to the module
        newSettings[setting.uuid] = folder.name;
        mapSettingIds[folder.uuid] = setting.uuid;

        // we don't clean up the folder because there's not really any reason to

        updateProgress(`Processing setting: ${folder.name}`);
        processed++;
      }

      // save them all
      await ModuleSettings.set(SettingKey.settings, newSettings);

      // remap the current settings to the updated ids 
      const currentSettingId = UserFlags.get(UserFlagKey.currentSetting);
      if (currentSettingId) {
        UserFlags.set(UserFlagKey.currentSetting, mapSettingIds[currentSettingId]);
      }

      const currentEmailId = ModuleSettings.get(SettingKey.emailDefaultSetting);
      if (currentEmailId) {
        ModuleSettings.set(SettingKey.emailDefaultSetting, mapSettingIds[currentEmailId]);
      }
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

/** returns the settingId (uuid of the journal entry) */
async function migrateSetting(folder: Folder): Promise<FCBSetting> {
  const compendiumId = folder.getFlag(moduleId, 'compendiumId') as string | undefined;

  if (!compendiumId)
    throw new Error('Invalid settingId in MigrationV1_5.migrate()');

  // and update the permissions to hide and unlock the compendium
  const pack = game.packs.get(compendiumId);
  await pack?.configure({ ownership: { 
    GAMEMASTER: 'OWNER', 
    ASSISTANT: 'LIMITED', 
    TRUSTED: 'LIMITED', 
    PLAYER: 'LIMITED' 
  }, locked: false });

  const newSetting = await FCBSetting.create(false, folder.name, compendiumId, true);

  if (!newSetting)
    throw new Error('Failed to create setting in MigrationV1_5.migrate()');
  
  // get all the setting configuration
  const updateData: FCBSetting.UpdateData = {
    text: {
      // @ts-ignore
      content: folder.getFlag(moduleId, 'description'),
    },
    system: {
      // @ts-ignore
      topicIds: folder.getFlag(moduleId, 'topicIds'),
      // @ts-ignore
      campaignNames: folder.getFlag(moduleId, 'campaignNames'),
      // @ts-ignore
      expandedIds: folder.getFlag(moduleId, 'expandedIds'),
      // @ts-ignore
      hierarchies: folder.getFlag(moduleId, 'hierarchies'),
      // @ts-ignore
      genre: folder.getFlag(moduleId, 'genre'),
      // @ts-ignore
      settingFeeling: folder.getFlag(moduleId, 'worldFeeling'), // leaving the key value for backwards compatibility
      // @ts-ignore
      img: folder.getFlag(moduleId, 'img'),   // image path for the setting
      // @ts-ignore
      nameStyles: folder.getFlag(moduleId, 'nameStyles'),   // array of name styles to use for name generation
      // @ts-ignore
      rollTableConfig: folder.getFlag(moduleId, 'rollTableConfig'),   // setting-specific roll table configuration
      // @ts-ignore
      nameStyleExamples: folder.getFlag(moduleId, 'nameStyleExamples'),   // stored example names for each style with their genre and setting feeling
      // @ts-ignore
      journals: folder.getFlag(moduleId, 'journals'),
    }
  };

  await newSetting.update(updateData);

  return newSetting;
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
  
  for (const child of (rootFolder.raw as Folder)?.children || []) {
    // it had a couple different names
    if (child.folder && (child.folder.getFlag(moduleId, 'isSetting') || child.folder.getFlag(moduleId, 'isWorld'))) {
      settings.push(child.folder);
    }
  }

  return settings;
}

