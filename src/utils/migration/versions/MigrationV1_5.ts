import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { ModuleSettings, SettingKey, UserFlagKey, } from '@/settings';
import { RootFolder, FCBSetting, Session, Campaign, Entry, TopicFolder, WindowTab, Arc } from '@/classes';
import { updateGlobalSetting } from '@/utils/globalSettings';
import { Bookmark, defaultCustomFields, Hierarchy, Idea, RelatedItemDetails, RelatedJournal, RelatedPCDetails, TabHeader, ToDoItem, Topics, ValidTopic, ValidTopicRecord, ArcBasicIndex } from '@/types';
import { CampaignLore, SessionItem, SessionLocation, SessionLore, SessionMonster, SessionNPC, SessionVignette, } from '@/documents';
import { cleanKeysOnLoad } from '@/utils/cleanKeys';

const moduleId = 'campaign-builder';  // don't want to use from settings because maybe it changed

// map old id to new id
const globalUuidMap: Record<string, string> = {};

// maps old settings to new settings - just the id part
const settingIdMap: Record<string, string> = {};

// track the compendiums
const compendiumsToClean: string[] = [];

// store old hierarchies so we can remap them properly after migration
const oldHierarchiesMap: Record<string, Record<string, Hierarchy>> = {};

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
        // @ts-ignore
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

      // Build the tag lists from migrated data
      updateProgress('Building tag lists...');
      await buildTagLists();

      // all the old entries should be deleted so now we can remap all the relationships
      for (const idx of ModuleSettings.get(SettingKey.settingIndex)) {
        await cleanCompendiumIds(idx.settingId);
      }

      // remap the email settings
      const emailSettingId = ModuleSettings.get(SettingKey.emailDefaultSetting);
      const emailCampaignId = ModuleSettings.get(SettingKey.emailDefaultCampaign);
      if (emailSettingId) {
        ModuleSettings.set(SettingKey.emailDefaultSetting, globalUuidMap[emailSettingId]);
        ModuleSettings.set(SettingKey.emailDefaultCampaign, globalUuidMap[emailCampaignId]);
      }

      // clean up all the user settings - only care about the GM user, which
      //    must be the current one
      const user = game.user;
      if (!user || !user.isGM)
        throw new Error('MigrationV1_5.migrate() - somehow user isn\'t GM');

      // current setting
      const oldSettingId = user.getFlag(moduleId, UserFlagKey.currentSetting) as Record<string, string> || undefined;
      if (oldSettingId) {
        // it was encoded in a real odd way
        await user.setFlag(moduleId, UserFlagKey.currentSetting, globalUuidMap[oldSettingId['']]);
      }

      // if there's a currentWorld, delete it - that's old
      // @ts-ignore
      await user.unsetFlag(moduleId, 'currentWorld');

      // bookmarks, tabs, and recently viewed are indexed by setting id (not uuid)
      for (const folder of allSettingFolders) {
        // @ts-ignore
        const oldBookmarks = user.getFlag(moduleId, 'bookmarks.'+ folder.uuid) as Bookmark[] || [];
        if (oldBookmarks.length > 0) {
          const newBookmarks = oldBookmarks.map((b)=>({
            ...b,  // the base id is just a string
            header: {
              ...b.header,
              uuid: b.header.uuid ? globalUuidMap[b.header.uuid] : null,
            },
            tabInfo: {
              ...b.tabInfo,
              contentId: b.tabInfo.contentId ? globalUuidMap[b.tabInfo.contentId] : null,
            }
          }));

          // @ts-ignore
          await user.unsetFlag(moduleId, 'bookmarks.'+ folder.uuid);
          // @ts-ignore
          await user.setFlag(moduleId, 'bookmarks.'+ globalUuidMap[folder.uuid], newBookmarks);
        }

        // tabs
        // @ts-ignore
        const oldTabs = user.getFlag(moduleId, 'tabs.' + folder.uuid) as WindowTab[] || [];
        if (oldTabs.length > 0) {
          const newTabs = oldTabs.map((t)=>({
            ...t,
            header: {
              ...t.header,
              uuid: t.header.uuid ? globalUuidMap[t.header.uuid] : null,
            },
            history: t.history.map((h)=>({
              ...h,
              contentId: h.contentId ? globalUuidMap[h.contentId] : h.contentId
            }))
          }));

          // @ts-ignore
          await user.unsetFlag(moduleId, 'tabs.' + folder.uuid);

          // @ts-ignore
          await user.setFlag(moduleId, 'tabs.' + globalUuidMap[folder.uuid], newTabs);
        }

        // recent viewed
        // @ts-ignore
        const oldRecentViewed = user.getFlag(moduleId, 'recentlyViewed.' + folder.uuid) as TabHeader[] || [];
        if (oldRecentViewed.length > 0) {
          const newRecentViewed = oldRecentViewed.map((t)=>({
            ...t,
            uuid: t.uuid ? globalUuidMap[t.uuid] : t.uuid
          }));

          // @ts-ignore
          await user.unsetFlag(moduleId, 'recentlyViewed' + folder.uuid);

          // @ts-ignore
          await user.setFlag(moduleId, 'recentlyViewed.' + globalUuidMap[folder.uuid], newRecentViewed);
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
    NONE: 'NONE',
    GAMEMASTER: 'OWNER', 
    ASSISTANT: 'LIMITED', 
    TRUSTED: 'LIMITED', 
    PLAYER: 'LIMITED' 
  }, locked: false });

  const newSetting = await FCBSetting.create(false, folder.name, compendiumId, true);
  let topicIds = [] as string[];

  if (!newSetting)
    throw new Error('Failed to create setting in MigrationV1_5.migrate()');

  globalUuidMap[folder.uuid] = newSetting.uuid;
  settingIdMap[foundry.utils.parseUuid(folder.uuid).id] = foundry.utils.parseUuid(newSetting.uuid).id;

  // get all the setting configuration
  // @ts-ignore
  newSetting.description = folder.getFlag(moduleId, 'description') || '';
  
  // @ts-ignore
  topicIds = folder.getFlag(moduleId, 'topicIds') || [];
  
  // @ts-ignore
  // we no longer use campaign names, but we need to know them
  const oldCampaignNames = cleanKeysOnLoad(folder.getFlag(moduleId, 'campaignNames') || {});
  
  // @ts-ignore
  newSetting.expandedIds = folder.getFlag(moduleId, 'expandedIds') || {};
  
  // Store old hierarchies for later remapping - don't set them on the setting yet
  // They have old UUIDs that won't match the new entries until cleanCompendiumIds() runs
  // Need to clean the keys because Foundry stores them with #&# instead of dots
  // @ts-ignore
  const oldHierarchies = folder.getFlag(moduleId, 'hierarchies') as Record<string, Hierarchy> || {};
  const cleanedHierarchies = cleanKeysOnLoad(oldHierarchies);
  oldHierarchiesMap[newSetting.uuid] = cleanedHierarchies;
  
  // @ts-ignore
  newSetting.genre = folder.getFlag(moduleId, 'genre');
  
  // @ts-ignore
  newSetting.settingFeeling = folder.getFlag(moduleId, 'worldFeeling'); // leaving the key value for backwards compatibility
  
  // @ts-ignore
  newSetting.img = folder.getFlag(moduleId, 'img');   // image path for the setting
  
  // @ts-ignore
  newSetting.nameStyles = folder.getFlag(moduleId, 'nameStyles') || [];   // array of name styles to use for name generation
  
  // @ts-ignore
  newSetting.rollTableConfig = folder.getFlag(moduleId, 'rollTableConfig') || null;   // setting-specific roll table configuration
  
  // @ts-ignore
  newSetting.nameStyleExamples = folder.getFlag(moduleId, 'nameStyleExamples') || { genre: '', settingFeeling: '', examples: [] } as NameStyleExamples;   // stored example names for each style with their genre and setting feeling
  
  // @ts-ignore
  newSetting.journals = folder.getFlag(moduleId, 'journals') || [];

  await newSetting.save();

  // migrate all the topicFolders 
  for (const topicId of Object.values(topicIds)) {
    // topic ids are JournalEntry
    const topic = await fromUuid<JournalEntry>(topicId);
    if (topic) {
      await migrateTopicFolder(newSetting, topic);
    }
  }

  // now migrate all the campaigns
  // we save these because they get removed as campaigns are created
  for (const id in oldCampaignNames as Record<string, string>) {
    const campaign = await fromUuid<JournalEntry>(id);

    // NOTE! This may generate a bunch of console warnings because the old stuff wasn't 
    //    compatible with the new schema

    // if it's not a campaign, skip it
    // @ts-ignore
    if (!campaign || !campaign.getFlag(moduleId, 'isCampaign')) {
      continue;
    }

    await migrateCampaign(campaign, newSetting);
  }

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

  // @ts-ignore
  newCampaign.description = oldCampaign.getFlag(moduleId, 'description') as string || '';
  // @ts-ignore
  newCampaign.houseRules = oldCampaign.getFlag(moduleId, 'houseRules') as string || '';
  // @ts-ignore
  newCampaign.img = oldCampaign.getFlag(moduleId, 'img') as string || '';
  // @ts-ignore
  newCampaign.lore = oldCampaign.getFlag(moduleId, 'lore') as CampaignLore[] || [];
  // @ts-ignore
  newCampaign.todoItems = oldCampaign.getFlag(moduleId, 'todoItems') as ToDoItem[] || [];
  // @ts-ignore
  newCampaign.ideas = oldCampaign.getFlag(moduleId, 'ideas') as Idea[] || [];
  // @ts-ignore
  newCampaign.journals = oldCampaign.getFlag(moduleId, 'journals') as RelatedJournal[] || [];
  // @ts-ignore
  newCampaign.pcs = oldCampaign.getFlag(moduleId, 'pcs') as RelatedPCDetails[] || [];

  // sort with missing values at the end
  const sortWithMissing = (a: null | undefined | number, b: null | undefined | number) => {
    if (a == null && b == null)
      return 0;
    if (a == null)
      return 1;
    if (b == null)
      return -1;
    return a - b;
  };
  // some old lore don't have sort orders
  if (newCampaign.lore.find((lore)=>lore.sortOrder == null)) {
    // if any don't the probably all don't, so just reset them all
    // but sort first in case some have it ... but missing ones at the end
    newCampaign.lore = newCampaign.lore.slice().sort((a, b)=>sortWithMissing(a.sortOrder, b.sortOrder)).map((lore, index)=>({
      ...lore,
      sortOrder: index,
    }));
  }

  // some old ideas don't have sort orders
  if (newCampaign.ideas.find((idea)=>idea.sortOrder == null)) {
    // if any don't they probably all don't, so just reset them all
    newCampaign.ideas = newCampaign.ideas.slice().sort((a, b)=>sortWithMissing(a.sortOrder, b.sortOrder)).map((idea, index)=>({
      ...idea,
      sortOrder: index,
    }));
  }

  // some old todos don't have sort orders
  if (newCampaign.todoItems.find((todo)=>todo.sortOrder == null)) {
    // if any don't they probably all don't, so just reset them all
    newCampaign.todoItems = newCampaign.todoItems.slice().sort((a, b)=>sortWithMissing(a.sortOrder, b.sortOrder)).map((todo, index)=>({
      ...todo,
      sortOrder: index,
    }));
  }

  await newCampaign.save();

  globalUuidMap[oldCampaign.uuid] = newCampaign.uuid;

    // create a default arc covering all sessions for this campaign
  const sessionList = oldCampaign.pages.contents;
  if (sessionList.length > 0) {
    const arc = await Arc.create(newCampaign, 'All sessions');

    if (!arc)
      throw new Error('Failed to create catch-all arc in MigrationV1_5.migrateCampaign()');

    let minSessionNumber = Number.MAX_SAFE_INTEGER;
    let maxSessionNumber = Number.MIN_SAFE_INTEGER;
    for (const sessionIdx of sessionList) {
      if (sessionIdx.number < minSessionNumber)
        minSessionNumber = sessionIdx.number;
      if (sessionIdx.number > maxSessionNumber)
        maxSessionNumber = sessionIdx.number;
    }

    arc.startSessionNumber = minSessionNumber;
    arc.endSessionNumber = maxSessionNumber;
    console.warn('Arc before save:', JSON.stringify(arc));
    await arc.save();

    const arcIndex = {
      uuid: arc.uuid,
      name: arc.name,
      startSessionNumber: arc.startSessionNumber,
      endSessionNumber: arc.endSessionNumber,
    } as ArcBasicIndex;

    newCampaign.arcIndex = [arcIndex];
    await newCampaign.save();  
  }

  // now migrate all the sessions
  for (const session of oldCampaign.pages) {
    await migrateSession(newCampaign, session);
  }

  // update the final session
  newCampaign.resetCurrentSession();
  await newCampaign.save();
  
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

  const system = oldSession.system;
  newSession.notes = oldSession.text.content || '';
  newSession.number = system.number || 0;
  newSession.date = system.date ? new Date(system.date) : null;
  newSession.strongStart = system.strongStart || '';
  newSession.img = system.img || '';
  newSession.locations = system.locations as SessionLocation[] || [];
  newSession.items = system.items as SessionItem[] || [];
  newSession.npcs = system.npcs as SessionNPC[] || [];
  newSession.monsters = system.monsters as SessionMonster[] || [];
  newSession.vignettes = system.vignettes as SessionVignette[] || [];
  newSession.lore = system.lore as SessionLore[] || [];
  // Convert old TagInfo[] format to string[] if needed
  const oldTags = system.tags as unknown as any[] || [];
  newSession.tags = oldTags.map(t => typeof t === 'string' ? t : t.value);

  // some old lore don't have sort orders
  if (newSession.lore.find((lore)=>lore.sortOrder == null)) {
    // if any don't they probably all don't, so just reset them all
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
  // @ts-ignore
  const topic = oldTopicFolder.getFlag(moduleId, 'topic') as unknown as ValidTopic;

  const topicFolder = new TopicFolder(topic, setting);

  // topic folders now are just an object on the setting
  // @ts-ignore
  topicFolder.types = oldTopicFolder.getFlag(moduleId, 'types') as string[] || [];

  // these populate as you go
  // topicFolder.topNodes = oldTopicFolder.getFlag(moduleId, 'topNodes') as string[];
  // topicFolder.entries = {} as Record<string, string>;  
  await topicFolder.save();

  // update the map - but the topic ids are settingId.topic.# 
  const oldSettingId = Object.keys(globalUuidMap).find((key)=>globalUuidMap[key] === setting.uuid);
  globalUuidMap[`${oldSettingId}.topic.${topic}`] = `${setting.uuid}.topic.${topic}`;

  // migrate all the entries
  for (const entry of oldTopicFolder.pages.contents) {
    await migrateEntry(topicFolder, entry);

    processed++;
    updateProgress(`Processed entry: ${entry.name}`);  
  }

  // everything gets added as a topNode because we don't know the right 
  //    parentId yet; so we need to make it match the old one (so things with
  //    parents don't show up)
  // @ts-ignore
  const oldTopNodes = oldTopicFolder.getFlag(moduleId, 'topNodes') as string[] || [] ;
  const newTopNodes = oldTopNodes
    .map((uuid) => globalUuidMap[uuid])
    .filter((uuid) => uuid != undefined);

  topicFolder.topNodes = newTopNodes;

  await topicFolder.save();

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

  newEntry.description = entry.text.content || '';
  newEntry.type = system.type || '';
  // Convert old TagInfo[] format to string[] if needed
  const oldTags = system.tags as unknown as any[] || [];
  newEntry.tags = oldTags.map(t => typeof t === 'string' ? t : t.value);
  // @ts-ignore
  newEntry.roleplayingNotes = system.rolePlayingNotes || ''; // note different caps in old one

  // relationships used to use _ in keys
  const newRelationships = {} as ValidTopicRecord<Record<string, RelatedItemDetails<any, any>>>;

  for (const topic in system.relationships) {
    const newTopicBlock = {} as Record<string, RelatedItemDetails<any, any>>;
    for (const entryId in system.relationships[topic]) {
      const relationship = system.relationships[topic][entryId];
      // Filter out invalid relationships with null/undefined values
      if (relationship && relationship.uuid && relationship.topic !== undefined) {
        newTopicBlock[entryId.replaceAll('_', '.')] = relationship;
      }
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

  // hierarchies - use the old ones we stored during migration
  const oldHierarchies = oldHierarchiesMap[settingId] || {};
  const newHierarchies = {} as Record<string, Hierarchy>;
  for (const hierarchyId in oldHierarchies) {
    // if we don't have a mapping it's probably a bogus entry
    if (!globalUuidMap[hierarchyId]) {
      continue;
    }
    
    const oldHierarchy = oldHierarchies[hierarchyId];
    const newParentId = oldHierarchy.parentId ? globalUuidMap[oldHierarchy.parentId] : '';
    
    if (newParentId == undefined) {
      console.error(`Failed to find parent for old hierarchy ${hierarchyId}`);
    }

    // also alert (with the specific missing id) if any ancestors or children didn't get mapped
    const badAncestors = oldHierarchy.ancestors.filter((id)=>globalUuidMap[id] == undefined);
    const badChildren = oldHierarchy.children.filter((id)=>globalUuidMap[id] == undefined);
    if (badAncestors.length > 0 || badChildren.length > 0) {
      console.error(`Failed to find ancestors or children for old hierarchy ${hierarchyId}: ${badAncestors.join(', ')} | ${badChildren.join(', ')}`);
    }      

    const updatedHierarchy = {
      ...oldHierarchy,
      parentId: newParentId || null,
      ancestors: oldHierarchy.ancestors.map((id)=>globalUuidMap[id]).filter(id => id !== undefined),
      children: oldHierarchy.children.map((id)=>globalUuidMap[id]).filter(id => id !== undefined),
    };

    newHierarchies[globalUuidMap[hierarchyId]] = updatedHierarchy;
  }

  setting.hierarchies = newHierarchies;

  setting.description = cleanUuid(setting.description);
  await setting.save();
  
  // Update the global cache so the app uses this fresh instance with hierarchies
  // instead of the stale instance from migrateSetting()
  updateGlobalSetting(setting);


  // topicFolders
  for (const topicFolder of Object.values(setting.topicFolders)) {
    // topNodes - did it when we created the entry
    // entries object - should already be correct because they're added when they're created

    // entries
    for (const entry of await topicFolder.allEntries()) {
      // relationships
      const newRelationships = {} as ValidTopicRecord<Record<string, RelatedItemDetails<any, any>>>;
      
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

      // replace UUID references in text
      entry.description = cleanUuid(entry.description);
      entry.roleplayingNotes = cleanUuid(entry.roleplayingNotes);
      entry.background = cleanUuid(entry.background);
      entry.plotPoints = cleanUuid(entry.plotPoints);
      entry.magicItems = cleanUuid(entry.magicItems);

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
    })).filter(pc => pc.uuid !== undefined);

    // lore -- only ties to document
    // ideas -- no uuid
    // journals -- only ties to document

    campaign.description = cleanUuid(campaign.description);
    campaign.houseRules = cleanUuid(campaign.houseRules);

    await campaign.save();

    // Normalize the single default arc (for pre-1.5.0 worlds) so that it covers
    // the full range of existing sessions. Some legacy data can leave this arc
    // with invalid sentinel ranges.
    if (campaign.arcIndex.length === 1) {
      let minSessionNumber = Number.MAX_SAFE_INTEGER;
      let maxSessionNumber = Number.MIN_SAFE_INTEGER;

      if (campaign.sessionIndex.length > 0) {
        for (const idx of campaign.sessionIndex) {
          if (idx.number < minSessionNumber)
            minSessionNumber = idx.number;
          if (idx.number > maxSessionNumber)
            maxSessionNumber = idx.number;
        }
      } else {
        minSessionNumber = -1;
        maxSessionNumber = -1;
      }

      const firstArc = campaign.arcIndex[0];
      firstArc.startSessionNumber = minSessionNumber;
      firstArc.endSessionNumber = maxSessionNumber;
      campaign.arcIndex = [firstArc];
      await campaign.save();
    }

    // sessions
    for (const sessionIndex of campaign.sessionIndex) {
      const session = await Session.fromUuid(sessionIndex.uuid);

      if (!session)
        throw new Error(`Unable to find session ${sessionIndex.uuid} when cleaning ids in cleanCompendiumIds()`);
      
      // locations
      session.locations = session.locations.map((l)=>({
        ...l,
        uuid: globalUuidMap[l.uuid],
      })).filter(l => l.uuid !== undefined);
      
      // npcs 
      session.npcs = session.npcs.map((n)=>({
        ...n,
        uuid: globalUuidMap[n.uuid],
      })).filter(n => n.uuid !== undefined);


      // items -- only ties to document
      // monsters -- only ties to document
      // vignettes -- no uuid
      // lore -- only ties to document

      session.notes = cleanUuid(session.notes);
      session.strongStart = cleanUuid(session.strongStart);

      await session.save();
    }
  }
  
}

const cleanUuid = (text: string) => {
  let updatedText: string;

  // everything we care about is:
  // 1. JE or JEP in compendium: (Compendium[a-z0-9\.]*)\.JournalEntry\.([a-z0-9\.]){16}(\.JournalEntryPage\.([a-z0-9]){16})?
  // 2. Folder or Topic: (Folder\.[a-z0-9\.]*\s)
  // 3: Compendium itself, though I don't think you can actually reference it: (Compendium[a-z0-9\.]*\s)
  // search for anything that looks like a uuid and replace
  //    it from the global map
  updatedText = text.replace(/(Compendium[a-z0-9\.]*)\.JournalEntry\.([a-z0-9\.]){16}(\.JournalEntryPage\.([a-z0-9]){16})?/gi, (match) => {
    return globalUuidMap[match] || match;
  });

  updatedText = updatedText.replace(/(Folder\.[a-z0-9\.]*)\s/gi, (match) => {
    return globalUuidMap[match] || match;
  });

  updatedText = updatedText.replace(/(Compendium[a-z0-9\.]*)\s/gi, (match) => {
    return globalUuidMap[match] || match;
  });

  return updatedText;
}

/**
 * Build the global tag lists by counting all tags in entries and sessions
 */
async function buildTagLists(): Promise<void> {
  const entryTagCounts: Record<string, number> = {};
  const sessionTagCounts: Record<string, number> = {};

  // Loop through all settings
  for (const idx of ModuleSettings.get(SettingKey.settingIndex)) {
    const setting = await FCBSetting.fromUuid(idx.settingId);
    
    if (!setting) {
      console.warn(`Could not load setting ${idx.settingId} when building tag lists`);
      continue;
    }

    // Count tags from all entries
    for (const topicFolder of Object.values(setting.topicFolders)) {
      for (const entry of await topicFolder.allEntries()) {
        for (const tag of entry.tags || []) {
          entryTagCounts[tag] = (entryTagCounts[tag] || 0) + 1;
        }
      }
    }

    // Count tags from all sessions
    for (const campaign of Object.values(setting.campaigns)) {
      for (const sessionIndex of campaign.sessionIndex) {
        const session = await Session.fromUuid(sessionIndex.uuid);
        
        if (!session) {
          console.warn(`Could not load session ${sessionIndex.uuid} when building tag lists`);
          continue;
        }
        
        for (const tag of session.tags || []) {
          sessionTagCounts[tag] = (sessionTagCounts[tag] || 0) + 1;
        }
      }
    }
  }

  // Build the tag list objects
  const entryTagList: Record<string, { count: number }> = {};
  for (const tag in entryTagCounts) {
    entryTagList[tag] = { count: entryTagCounts[tag] };
  }

  const sessionTagList: Record<string, { count: number }> = {};
  for (const tag in sessionTagCounts) {
    sessionTagList[tag] = { count: sessionTagCounts[tag] };
  }

  // Save to settings
  await ModuleSettings.set(SettingKey.entryTags, entryTagList);
  await ModuleSettings.set(SettingKey.sessionTags, sessionTagList);
}