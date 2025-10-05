import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { ModuleSettings, SettingKey, UserFlagKey, UserFlags } from '@/settings';
import { RootFolder, FCBSetting, Session, Campaign } from '@/classes';
import { Idea, RelatedJournal, RelatedPCDetails, SettingIndex, TagInfo, ToDoItem } from '@/types';
import { CampaignLore, SessionItem, SessionLocation, SessionLore, SessionMonster, SessionNPC, SessionVignette } from '@/documents';

const moduleId = 'campaign-builder';  // don't want to use from settings because maybe it changed

// map old id to new id
const globalUuidMap: Record<string, string> = {};

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

      for (const folder of allSettingFolders) {
        await migrateSetting(folder);

        // we don't clean up the folder because there's not really any reason to

        updateProgress(`Processing setting: ${folder.name}`);
        processed++;
      }

      // remap the current settings to the updated ids 
      const currentSettingId = UserFlags.get(UserFlagKey.currentSetting);
      if (currentSettingId) {
        UserFlags.set(UserFlagKey.currentSetting, globalUuidMap[currentSettingId]);
      }

      const currentEmailId = ModuleSettings.get(SettingKey.emailDefaultSetting);
      if (currentEmailId) {
        ModuleSettings.set(SettingKey.emailDefaultSetting, globalUuidMap[currentEmailId]);
      }

      // clean up all the user settings
      for (const user of game.users.filter(()=>true)) {
        const oldSettingId = user.getFlag(moduleId, UserFlagKey.currentSetting) as string;
        if (oldSettingId) {
          user.setFlag(moduleId, UserFlagKey.currentSetting, globalUuidMap[oldSettingId]);
        }
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
  // @ts-ignore
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

  // add it to the index
  await addToSettingIndex(newSetting.uuid, folder.name, compendiumId);
  
  globalUuidMap[folder.uuid] = newSetting.uuid;

  // get all the setting configuration
  // @ts-ignore
  newSetting.description = folder.getFlag(moduleId, 'description');
  
  // @ts-ignore
  newSetting.topicIds = folder.getFlag(moduleId, 'topicIds');
  
  // @ts-ignore
  newSetting.campaignNames = folder.getFlag(moduleId, 'campaignNames');
  
  // @ts-ignore
  newSetting.expandedIds = folder.getFlag(moduleId, 'expandedIds');
  
  // @ts-ignore
  newSetting.hierarchies = folder.getFlag(moduleId, 'hierarchies');
  
  // @ts-ignore
  newSetting.genre = folder.getFlag(moduleId, 'genre');
  
  // @ts-ignore
  newSetting.settingFeeling = folder.getFlag(moduleId, 'worldFeeling'); // leaving the key value for backwards compatibility
  
  // @ts-ignore
  newSetting.img = folder.getFlag(moduleId, 'img');   // image path for the setting
  
  // @ts-ignore
  newSetting.nameStyles = folder.getFlag(moduleId, 'nameStyles');   // array of name styles to use for name generation
  
  // @ts-ignore
  newSetting.rollTableConfig = folder.getFlag(moduleId, 'rollTableConfig');   // setting-specific roll table configuration
  
  // @ts-ignore
  newSetting.nameStyleExamples = folder.getFlag(moduleId, 'nameStyleExamples');   // stored example names for each style with their genre and setting feeling
  
  // @ts-ignore
  newSetting.journals = folder.getFlag(moduleId, 'journals');

  await newSetting.save();

  // now migrate all the campaigns
  for (const id in newSetting.campaignNames) {
    const campaign = await fromUuid<JournalEntry>(id);

    // NOTE! This may generate a bunch of console warnings because the old stuff wasn't 
    //    compatible with the new schema

    // if it's not a campaign, clean up
    if (!campaign || !campaign.getFlag(moduleId, 'isCampaign')) {
      delete newSetting.campaignNames[id];
      await newSetting.save();
      continue;
    }

    await migrateCampaign(campaign, newSetting);
  }

  // now that the campaigns are migrated, we need to update our keys
  newSetting.campaignNames = Object.keys(newSetting.campaignNames).reduce((retval, id) => {
    if (globalUuidMap[id]) {
      retval[globalUuidMap[id]] = newSetting.campaignNames[id];
    }

    return retval;
  }, {} as Record<string, string>);

  await newSetting.save();

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
  
  // @ts-ignore
  for (const child of ((rootFolder.raw as Folder)?.children || [])) {
    // it had a couple different names
    if (child.folder && (child.folder.getFlag(moduleId, 'isSetting') || child.folder.getFlag(moduleId, 'isWorld'))) {
      settings.push(child.folder);
    }
  }

  return settings;
}

async function migrateCampaign(oldCampaign: JournalEntry, setting: FCBSetting): Promise<void> {
  // first create the campaign
  const newCampaign = await Campaign.create(setting, oldCampaign.name);

  if (!newCampaign)
    throw new Error('Failed to create campaign in MigrationV1_5.migrateCampaign()');

  newCampaign.description = oldCampaign.getFlag(moduleId, 'description') as string || '';
  newCampaign.houseRules = oldCampaign.getFlag(moduleId, 'houseRules') as string || '';
  newCampaign.img = oldCampaign.getFlag(moduleId, 'img') as string || '';
  newCampaign.lore = oldCampaign.getFlag(moduleId, 'lore') as CampaignLore[] || [];
  newCampaign.todoItems = oldCampaign.getFlag(moduleId, 'todoItems') as ToDoItem[] || [];
  newCampaign.ideas = oldCampaign.getFlag(moduleId, 'ideas') as Idea[] || [];
  newCampaign.journals = oldCampaign.getFlag(moduleId, 'journals') as RelatedJournal[] || [];
  newCampaign.pcs = oldCampaign.getFlag(moduleId, 'pcs') as RelatedPCDetails[] || [];

  // some old lore don't have sort orders
  if (newCampaign.lore.find((lore)=>lore.sortOrder == null)) {
    // if any don't the probably all don't, so just reset them all
    newCampaign.lore = newCampaign.lore.map((lore, index)=>({
      ...lore,
      sortOrder: index,
    }));
  }

  await newCampaign.save();

  globalUuidMap[oldCampaign.uuid] = newCampaign.uuid;

  // now migrate all the sessions
  for (const session of oldCampaign.pages) {
    await migrateSession(newCampaign, session);
  }

  // rename the old one so we don't get confused prior to deleting
  // this will probably throw an error because the journal entry has a bad format; but it will stll change the name
  try {
    await oldCampaign.update({ name: 'ARCHIVE - ' + oldCampaign.name });
  }
  catch (e) {
    // @ts-ignore
    const fail = e?.getFailure();

    if (!fail || fail.message !== 'SessionDataModel validation errors:')
      throw new Error('Failed to rename old campaign in MigrationV1_5.migrateCampaign()', e);
  }
}

// returns the new uuid
async function migrateSession(campaign: Campaign, oldSession: JournalEntryPage): Promise<string> {
  // sessions are easy because the format stayed almost the same - we mostly just need to 
  //    wrap them in journal entries and put them in the right folder 
  // and we need to map the uuids so we can handle relationships
  const newSession = await Session.create(campaign, oldSession.name);

  if (!newSession)
    throw new Error('Failed to create session in MigrationV1_5.migrateSession()');

  newSession.notes = oldSession.text.content || '';
  newSession.number = oldSession.system.number || 0;
  newSession.date = oldSession.system.date ? new Date(oldSession.system.date) : null;
  newSession.strongStart = oldSession.system.strongStart || '';
  newSession.img = oldSession.system.img || '';
  newSession.locations = oldSession.system.locations as SessionLocation[] || [];
  newSession.items = oldSession.system.items as SessionItem[] || [];
  newSession.npcs = oldSession.system.npcs as SessionNPC[] || [];
  newSession.monsters = oldSession.system.monsters as SessionMonster[] || [];
  newSession.vignettes = oldSession.system.vignettes as SessionVignette[] || [];
  newSession.lore = oldSession.system.lore as SessionLore[] || [];
  newSession.tags = oldSession.system.tags as unknown as TagInfo[] || [];

  // some old lore don't have sort orders
  if (newSession.lore.find((lore)=>lore.sortOrder == null)) {
    // if any don't the probably all don't, so just reset them all
    newSession.lore = newSession.lore.map((lore, index)=>({
      ...lore,
      sortOrder: index,
    }));
  }

  await newSession.save();

  globalUuidMap[oldSession.uuid] = newSession.uuid;
  return newSession.uuid;
}
  
async function addToSettingIndex(settingId: string, name: string, packId: string): Promise<void> {
  const index = ModuleSettings.get(SettingKey.settingIndex) as SettingIndex[];

  index.push({
    settingId,
    name,
    packId,
  });
  
  await ModuleSettings.set(SettingKey.settingIndex, index);
}

