import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { ModuleSettings, SettingKey, UserFlagKey, } from '@/settings';
import { RootFolder, FCBSetting, Session, Campaign, Entry, TopicFolder, WindowTab } from '@/classes';
import { Bookmark, defaultCustomFields, Hierarchy, Idea, RelatedItemDetails, RelatedJournal, RelatedPCDetails, SettingIndex, TabHeader, TagInfo, ToDoItem, Topics, ValidTopic } from '@/types';
import { CampaignLore, SessionItem, SessionLocation, SessionLore, SessionMonster, SessionNPC, SessionVignette, } from '@/documents';

const moduleId = 'campaign-builder';  // don't want to use from settings because maybe it changed

// map old id to new id
const globalUuidMap: Record<string, string> = {};

// maps old settings to new settings - just the id part
const settingIdMap: Record<string, string> = {};

// track the compendiums
const compendiumsToClean: string[] = [];

let processed = 0;
let totalEntries= 0;
const updateProgress = (status: string) => {
  const event = new CustomEvent('migration-progress', {
    detail: { current: processed, total: totalEntries, status }
  });
  document.dispatchEvent(event);
};

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
      // setup the default custom fields
      await ModuleSettings.set(SettingKey.customFields, defaultCustomFields);

      const allSettingFolders = await getAllSettings();

      // entries are the bulk of the data, so we use them to estimate progress
      for (const folder of allSettingFolders) {
        const topicIds = folder.getFlag(moduleId, 'topicIds') as string[] | undefined;
        if (!topicIds)
          continue;

        for (const topicId of Object.values(topicIds)) {
          const topic = await fromUuid(topicId) as JournalEntry | null;
          if (topic) {
            totalEntries += await topic?.pages?.contents?.length;
          }
        }
      }

      // double totalEntries because we have to hit every entry twice (once to create and once to 
      //    remap links)
      totalEntries *= 2;

      for (const folder of allSettingFolders) {
        await migrateSetting(folder);

        // we don't clean up the folder because there's not really any reason to
        updateProgress(`Processing setting: ${folder.name}`);
      }

      // all the old entries should be deleted so now we can remap all the relationships
      for (const idx of ModuleSettings.get(SettingKey.settingIndex)) {
        await cleanCompendiumIds(idx.settingId);
      }

      const currentEmailId = ModuleSettings.get(SettingKey.emailDefaultSetting);
      if (currentEmailId) {
        ModuleSettings.set(SettingKey.emailDefaultSetting, globalUuidMap[currentEmailId]);
      }

      // clean up all the user settings
      for (const user of game.users.filter(()=>true)) {
        // current settings
        const oldSettingId = user.getFlag(moduleId, UserFlagKey.currentSetting) as Record<string, string> || undefined;
        if (oldSettingId) {
          // it was encoded in a reall odd way
          user.setFlag(moduleId, UserFlagKey.currentSetting, globalUuidMap[oldSettingId['']]);
        }

        // bookmarks, tabs, and recently viewed are indexed by setting id (not uuid)
        // bookmarks - object keyed by setting id (not uuid) 
        const oldBookmarks = user.getFlag(moduleId, UserFlagKey.bookmarks) as Record<string, Bookmark[]> | undefined;
        const newBookmarks = {} as Record<string, Bookmark[]>
        if (oldBookmarks) {
          for (const oldSettingId in oldBookmarks) {
            if (!settingIdMap[oldSettingId]) {
              // probably a corrupt old one
              continue;
            }
            const newSettingBookmarks = oldBookmarks[oldSettingId].map((b)=>({
              ...b,
              id: globalUuidMap[b.id]
            }));

            newBookmarks[settingIdMap[oldSettingId]] = newSettingBookmarks;
          }
        }
        await user.setFlag(moduleId, UserFlagKey.bookmarks, newBookmarks);

        // tabs
        const oldTabs = user.getFlag(moduleId, UserFlagKey.tabs) as Record<string, WindowTab[]> | undefined;
        const newTabs = {} as Record<string, WindowTab[]>
        if (oldTabs) {
          for (const oldSettingId in oldTabs) {
            if (!settingIdMap[oldSettingId]) {
              // probably a corrupt old one
              continue;
            }

            const newSettingTabs = oldTabs[oldSettingId].map((t)=>({
              ...t,
              history: t.history.map((h)=>({
                ...h,
                contentId: h.contentId ? globalUuidMap[h.contentId] : h.contentId
              }))
            }));

            // the tabs are set as a class, so have to adjust
            // @ts-ignore - we're not using the class, but it's ok because we're not really getting a class out anyway
            newTabs[settingIdMap[oldSettingId]] = newSettingTabs;
          }
          await user.setFlag(moduleId, UserFlagKey.tabs, newTabs);
        }

        // recent viewed
        const oldRecentViewed = user.getFlag(moduleId, UserFlagKey.recentlyViewed) as Record<string, TabHeader[]> | undefined;
        const newRecentViewed = {} as Record<string, TabHeader[]>;
        if (oldRecentViewed) {
          for (const oldSettingId in oldRecentViewed) {
            if (!settingIdMap[oldSettingId]) {
              // probably a corrupt old one
              continue;
            }

            const newSettingRecentViewed = oldRecentViewed[oldSettingId].map((t)=>({
              ...t,
              uuid: t.uuid ? globalUuidMap[t.uuid] : t.uuid
            }));

            newRecentViewed[settingIdMap[oldSettingId]] = newSettingRecentViewed;
          }
          await user.setFlag(moduleId, UserFlagKey.recentlyViewed, newRecentViewed);
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

  compendiumsToClean.push(compendiumId);

  // and update the permissions to hide and unlock the compendium
  const pack = game.packs.get(compendiumId);
  await pack?.configure({ ownership: { 
    GAMEMASTER: 'OWNER', 
    ASSISTANT: 'LIMITED', 
    TRUSTED: 'LIMITED', 
    PLAYER: 'LIMITED' 
  }, locked: false });

  const newSetting = await FCBSetting.create(false, folder.name, compendiumId, true);
  let topicIds = [] as string[];

  if (!newSetting)
    throw new Error('Failed to create setting in MigrationV1_5.migrate()');

  // add it to the index
  await addToSettingIndex(newSetting.uuid, folder.name, compendiumId);
  
  globalUuidMap[folder.uuid] = newSetting.uuid;
  settingIdMap[foundry.utils.parseUuid(folder.uuid).id] = foundry.utils.parseUuid(newSetting.uuid).id;

  // get all the setting configuration
  // @ts-ignore
  newSetting.description = folder.getFlag(moduleId, 'description');
  
  // @ts-ignore
  topicIds = folder.getFlag(moduleId, 'topicIds');
  
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

  // migrate all the topicfolders 
  for (const topicId of Object.values(topicIds)) {
    // topic ids are JournalEntry
    const topic = await fromUuid<JournalEntry>(topicId);
    if (topic) {
      await migrateTopicFolder(newSetting, topic);
    }
  }

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

  // delete the old campaign (and all the sessions)
  await oldCampaign.delete();
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
  
async function migrateTopicFolder(setting: FCBSetting, oldTopicFolder: JournalEntry): Promise<void> {
  const topic = oldTopicFolder.getFlag(moduleId, 'topic') as unknown as ValidTopic;

  const topicFolder = new TopicFolder(topic, setting);

  // topic folders now are just an object on the setting
  topicFolder.types = oldTopicFolder.getFlag(moduleId, 'types') as string[];
  topicFolder.topNodes = oldTopicFolder.getFlag(moduleId, 'topNodes') as string[];
  topicFolder.entries = {} as Record<string, string>;  // will populate as we create the entries
  await topicFolder.save();

  // migrate all the entries
  for (const entry of oldTopicFolder.pages.contents) {
    await migrateEntry(topicFolder, entry);

    if (topicFolder.topNodes.includes(entry.uuid)) {
      // adjust topnodes if needed
      const newTopNodes = topicFolder.topNodes.filter((node)=>node !== entry.uuid);
      newTopNodes.push(globalUuidMap[entry.uuid]);
      topicFolder.topNodes = newTopNodes;
      
      await topicFolder.save();
    }

    processed++;
    updateProgress(`Processed entry: ${entry.name}`);  
  }

  setting.topicFolders[topicFolder.topic] = topicFolder;
  await setting.save();

  // delete the old one (and all the entries)
  await oldTopicFolder.delete();
}

async function migrateEntry(topicFolder: TopicFolder, entry: JournalEntryPage): Promise<void> {
  const newEntry = await Entry.create(topicFolder, { name: entry.name });

  if (!newEntry)
    throw new Error(`Unable to create entry for ${entry.uuid} in migrateEntry`);

  const system = entry.system;

  newEntry.type = system.type || '';
  newEntry.tags = system.tags as unknown as TagInfo[]|| [];
  newEntry.rolePlayingNotes = system.rolePlayingNotes || '';

  // relationships used to use _ in keys
  const newRelationships = {} as Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>;

  for (const topic in system.relationships) {
    const newTopicBlock = {} as Record<string, RelatedItemDetails<any, any>>;
    for (const entryId in system.relationships[topic]) {
      newTopicBlock[entryId.replaceAll('_', '.')] = system.relationships[topic][entryId];
    }
    newRelationships[topic] = newTopicBlock;
  }
  newEntry.relationships = newRelationships;

  if (topicFolder.topic === Topics.Character) {
    newEntry.speciesId = system.speciesId || undefined;
  }

  if (topicFolder.topic === Topics.PC) {
    newEntry.playerName = system.playerName || null;
    newEntry.actorId = system.actorId || null;
    newEntry.background = system.background || null;
    newEntry.plotPoints = system.plotPoints || null;
    newEntry.magicItems = system.magicItems || null;
  }
 
  newEntry.img = system.img || '';
  newEntry.scenes = system.scenes as string[] || [];
  newEntry.actors = system.actors as string[] || [];
  newEntry.journals = system.journals || [];
  
  await newEntry.save();  

  // add to the mapping
  globalUuidMap[entry.uuid] = newEntry.uuid;
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

// remap all of the uuids in the full setting
const cleanCompendiumIds = async (settingId: string) => {
  const setting = await FCBSetting.fromUuid(settingId);

  if (!setting)
    throw new Error(`Couldn't find setting ${setting} when cleaning ids in cleanCompendiumIds()`);

  // expanded ids
  const newExpandedIds = {} as Record<string, boolean>;
  for (const expandedId in setting.expandedIds) {
    // only copy the true ones
    if (setting.expandedIds[expandedId])
      newExpandedIds[globalUuidMap[expandedId]] = true;
  }  
  setting.expandedIds = newExpandedIds;

  // hierarchies
  const newHierarchies = {} as Record<string, Hierarchy>;
  for (const hierarchyId in setting.hierarchies) {
    const oldHierarchy = setting.hierarchies[hierarchyId];
    const updatedHierarchy = {
      ...oldHierarchy,
      parentId: globalUuidMap[hierarchyId],
      ancestors: oldHierarchy.ancestors.map((id)=>globalUuidMap[id]),
      children: oldHierarchy.children.map((id)=>globalUuidMap[id]),
    };

    newHierarchies[globalUuidMap[hierarchyId]] = updatedHierarchy;
  }

  setting.hierarchies = newHierarchies;
  await setting.save();


  // topicfolders
  for (const topicFolder of Object.values(setting.topicFolders)) {
    // topNodes
    // did it when we created the entry
    // topicFolder.topNodes = topicFolder.topNodes.map((id)=>globalUuidMap[id]);

    // entries object - should already be correct because they're added when they're created
    // const entries = {}
    // for (const entryId in topicFolder.entries) {
    //   if (globalUuidMap[entryId])
    //     entries[globalUuidMap[entryId]] = topicFolder.entries[entryId];
    // }
    // topicFolder.entries = entries;
    // await topicFolder.save();

    // entries
    for (const entry of await topicFolder.allEntries(true)) {
      // relationships
      const newRelationships = {} as Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>;
      
      for (const topic in entry.relationships) {
        const relationships = entry.relationships[topic];
        const updatedRelationships = {} as Record<string, RelatedItemDetails<any, any>>;

        for (const relationshipId in relationships) {
          if (!globalUuidMap[relationshipId] || !globalUuidMap[relationships[relationshipId].uuid]) {
            console.warn(`Failed to lookup relationship on ${entry.name}, ${topic}, ${relationshipId}, ${relationships[relationshipId].name}`);
            continue;
          }

          updatedRelationships[globalUuidMap[relationshipId]] = {
            ...relationships[relationshipId],
            uuid: globalUuidMap[relationships[relationshipId].uuid],
          }
        }
        newRelationships[topic] = updatedRelationships;
      }     

      entry.relationships = newRelationships;
      await entry.save();
      
      processed++;
      updateProgress(`Updated id mappings in entry: ${entry.name}`);    
    }
  }

  // campaigns
  for (const campaign of Object.values(setting.campaigns)) {
    // todo - linkedUuid could be an item, actor, or one of our entries
    campaign.todoItems = campaign.todoItems.map((t)=>({
      ...t,
      linkedUuid: t.linkedUuid && globalUuidMap[t.linkedUuid] ? globalUuidMap[t.linkedUuid] : t.linkedUuid,
    }));

    // pcs
    campaign.pcs = campaign.pcs.map((pc)=>({
      ...pc,
      uuid: globalUuidMap[pc.uuid],
    }));

    // lore -- only ties to document
    // ideas -- no uuid
    // journals -- only ties to document

    await campaign.save();

    // sessions
    for (const sessionId of campaign.sessionIds) {
      const session = await Session.fromUuid(sessionId);

      if (!session)
        throw new Error(`Unable to find session ${sessionId} when cleaning ids in cleanCompendiumIds()`);
      
      // locations
      session.locations = session.locations.map((l)=>({
        ...l,
        uuid: globalUuidMap[l.uuid],
      }));
      
      // npcs 
      session.locations = session.npcs.map((n)=>({
        ...n,
        uuid: globalUuidMap[n.uuid],
      }));


      // items -- only ties to document
      // monsters -- only ties to document
      // vignettes -- no uuid
      // lore -- only ties to document

      await session.save();
    }
  }
  
}