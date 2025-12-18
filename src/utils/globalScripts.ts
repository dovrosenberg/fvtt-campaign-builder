import { getGlobalSetting } from './globalSettings';
import { JournalEntryFlagKey, moduleId, ModuleSettings, SettingKey } from '@/settings';
import { FCBSetting, Campaign, Entry, Session, Arc, Front, StoryWeb } from '@/classes';
import { EntryBasicIndex, CampaignBasicIndex, SessionBasicIndex, ArcBasicIndex, Topics, Hierarchy } from '@/types';
import { DOCUMENT_TYPES } from '@/documents/types';
import { closeCampaignBuilderApp, isCampaignBuilderAppOpen } from '@/utils/appWindow';
import { toRaw } from 'vue';
import { localize } from './game';


/**
 * Repairs all document indexes across all settings and their campaigns.
 * This function rebuilds the following indexes from scratch to match actual documents:
 * - FCBSetting: campaignIndex and topic entries arrays
 * - Campaigns: sessionIndex, arcIndex, frontIds, and storyWebIds
 * 
 * Usage: Call this function from the browser console or via window.repairAllIndexes()
 * 
 * @param settingId - Optional setting ID to repair indexes for. If not provided, all settings will be repaired.
 * @returns Promise that resolves when all indexes have been repaired
 */
const repairAllIndexes = async (settingId?: string): Promise<void> => {
  console.log('Starting repair of all document indexes...');

  // Check if FCB window is open and exit if so
  if (isCampaignBuilderAppOpen()) {
    await closeCampaignBuilderApp();
    console.warn('Cannot repair indexes while Campaign Builder window is open. Closing window.');
  }
  
  try {
    // Get all settings from the module settings
    const settingIndexes = ModuleSettings.get(SettingKey.settingIndex) || [];
    console.log(`Found ${settingIndexes.length} settings to repair`);
    
    let totalRepaired = 0;
    let totalErrors = 0;
    
    // Repair each setting's indexes
    for (const settingIndex of settingIndexes) {
      try {
        if (settingId && settingIndex.settingId !== settingId) {
          continue;
        }

        console.log(`Repairing indexes for setting: ${settingIndex.name} (${settingIndex.settingId})`);
        
        // Load the setting
        const setting = toRaw(await getGlobalSetting(settingIndex.settingId));
        if (!setting) {
          console.warn(`Could not load setting: ${settingIndex.name} (${settingIndex.settingId})`);
          totalErrors++;
          continue;
        }
        
        // Load only index metadata to avoid full document load
        const index = await setting.compendium.getIndex({ 
          // @ts-ignore
          fields: ['name', 'uuid', 'flags.' + moduleId + '.' + JournalEntryFlagKey.campaignBuilderType] 
        });
        console.log(`Loaded index with ${index.contents.length} entries from compendium`);
        
        // Categorize documents by type using index metadata only
        const docTypeFilter = (indexEntry, docType) => 
          indexEntry.flags?.[moduleId]?.[JournalEntryFlagKey.campaignBuilderType] === docType;
        
        const campaignIds = index.filter(entry => docTypeFilter(entry, DOCUMENT_TYPES.Campaign)).map(entry => entry.uuid);
        const sessionIds = index.filter(entry => docTypeFilter(entry, DOCUMENT_TYPES.Session)).map(entry => entry.uuid);
        const arcIds = index.filter(entry => docTypeFilter(entry, DOCUMENT_TYPES.Arc)).map(entry => entry.uuid);
        const frontIds = index.filter(entry => docTypeFilter(entry, DOCUMENT_TYPES.Front)).map(entry => entry.uuid);
        const entryIds = index.filter(entry => docTypeFilter(entry, DOCUMENT_TYPES.Entry)).map(entry => entry.uuid);
        const storyWebIds = index.filter(entry => docTypeFilter(entry, DOCUMENT_TYPES.StoryWeb)).map(entry => entry.uuid);
        
        console.log(`Found: ${campaignIds.length} campaigns, ${sessionIds.length} sessions, ${arcIds.length} arcs, ${frontIds.length} fronts, ${entryIds.length} entries, ${storyWebIds.length} storyWebs`);
        
        console.log(`Processing ${campaignIds.length} campaigns for repair`);
        
        // Rebuild campaign indexes first and collect arc data
        const campaignArcData = new Map<string, ArcBasicIndex[]>();
        for (const campaignId of campaignIds) {
          const campaign = await Campaign.fromUuid(campaignId);
          if (!campaign) continue;
          
          const arcData = await repairCampaignIndexes(campaign, sessionIds, arcIds, frontIds, storyWebIds);
          campaignArcData.set(campaign.uuid, arcData);
        }
        
        // Rebuild FCBSetting indexes using the collected campaign arc data
        await repairSettingIndexes(setting, campaignIds, entryIds, campaignArcData);
        
        console.log(`Successfully repaired indexes for setting: ${settingIndex.name}`);
        totalRepaired++;
        
      } catch (error) {
        console.error(`Failed to repair indexes for setting ${settingIndex.name}:`, error);
        totalErrors++;
      }
    }
    
    console.log(`Index repair complete! Successfully repaired ${totalRepaired} settings, ${totalErrors} errors.`);
    
    if (totalErrors > 0) {
      ui.notifications?.warn(`Index repair completed with ${totalErrors} errors. Check console for details.`);
    } else {
      ui.notifications?.info(localize('notifications.documentIndexesRepaired'));
    }
    
  } catch (error) {
    console.error('Fatal error during index repair:', error);
    ui.notifications?.error(localize('errors.failedToRepairIndexes'));
    throw error;
  }
};

/**
 * Repairs the setting's campaignIndex and topic entries arrays
 */
async function repairSettingIndexes(
  setting: FCBSetting, 
  campaignIds: string[], 
  entryIds: string[], 
  campaignArcData: Map<string, ArcBasicIndex[]>
): Promise<void> {
  // Load campaigns individually and rebuild campaignIndex with arc data already populated
  const newCampaignIndex: CampaignBasicIndex[] = [];
  for (const campaignId of campaignIds) {
    const campaign = await Campaign.fromUuid(campaignId);
    if (campaign) {
      newCampaignIndex.push({
        uuid: campaign.uuid,
        name: campaign.name,
        completed: campaign.completed,
        arcs: campaignArcData.get(campaign.uuid) || []
      });
    }
  }
  
  // Rebuild topic entries
  const newTopics = { ...setting.topics };
  
  // Initialize empty entries arrays for each topic using numeric enum values
  const validTopics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];
  validTopics.forEach(topicKey => {
    newTopics[topicKey] = {
      topic: topicKey,
      entries: [],
      types: [],
      topNodes: []
    };
  });
  
  // Categorize entries by topic and rebuild entries arrays
  const topicTypes = new Map<string, Set<string>>();
  const topicEntries = new Map<string, EntryBasicIndex[]>();
  
  // Load entries individually
  for (const entryId of entryIds) {
    const entry = await Entry.fromUuid(entryId);
    if (!entry) continue;
    
    const topic = entry.topic.toString();
    const entryIndex: EntryBasicIndex = {
      uuid: entry.uuid,
      name: entry.name,
      type: entry.type || ''
    };
    
    if (!topicEntries.has(topic)) {
      topicEntries.set(topic, []);
      topicTypes.set(topic, new Set());
    }
    
    topicEntries.get(topic)!.push(entryIndex);
    if (entry.type) {
      topicTypes.get(topic)!.add(entry.type);
    }
  }
  
  // clean up heierarchies - we can't adjust parents but we can remove any references to bad entries
  const newHierarchies: Record<string, Hierarchy> = {};
  for (const key in setting.hierarchies) {
    // if key is invalid, drop it
    if (!entryIds.includes(key)) 
      continue;

    const hierarchy = setting.hierarchies[key];
    const newHierarchy: Hierarchy = {
      type: hierarchy.type,
      ancestors: hierarchy.ancestors.filter((ancestor) => entryIds.includes(ancestor)),
      children: hierarchy.children.filter((child) => entryIds.includes(child)),
      parentId: hierarchy.parentId && entryIds.includes(hierarchy.parentId) ? hierarchy.parentId : null,
    };
    newHierarchies[key] = newHierarchy;
  }

  // Update topic data and identify top-level entries (those without parents)
  [Topics.Character, Topics.Location, Topics.Organization, Topics.PC].forEach(topicKey => {
    const entryList = topicEntries.get(topicKey.toString()) || [];
    const types = Array.from(topicTypes.get(topicKey.toString()) || []);
    
    newTopics[topicKey].entries = entryList;
    newTopics[topicKey].types = types;
    
    // Identify top-level entries using hierarchy data
    const hierarchies = setting.hierarchies;
    const topLevelEntries = entryList.filter(entry => {
      const hierarchy = hierarchies[entry.uuid];
      // Top-level entries have no parents (empty ancestors array or no hierarchy)
      return !hierarchy || (!hierarchy.ancestors || hierarchy.ancestors.length === 0);
    });
    
    newTopics[topicKey].topNodes = topLevelEntries.map(e => e.uuid);
  });
  
  // Save the updated indexes
  setting.campaignIndex = newCampaignIndex;
  setting.topics = newTopics;
  await setting.save();
  
  console.log(`Repaired setting indexes: ${newCampaignIndex.length} campaigns, ${entryIds.length} entries across topics`);
}

/**
 * Repairs a campaign's sessionIndex, arcIndex, frontIds, and storyWebIds
 */
async function repairCampaignIndexes(
  campaign: Campaign, 
  sessionIds: string[], 
  arcIds: string[], 
  frontIds: string[], 
  storyWebIds: string[]
): Promise<ArcBasicIndex[]> {
  // Load and filter documents belonging to this campaign individually
  const newSessionIndex: SessionBasicIndex[] = [];
  for (const sessionId of sessionIds) {
    const session = await Session.fromUuid(sessionId);
    if (!session) {
      console.log('Skipping bad session id: ' + sessionId);
      continue;
    }

    if (session.campaignId === campaign.uuid) {
      newSessionIndex.push({
        uuid: session.uuid,
        name: session.name,
        number: session.number,
        date: session.date?.toISOString() || null
      });
    }
  }
  
  let newArcIndex: ArcBasicIndex[] = [];
  for (const arcId of arcIds) {
    const arc = await Arc.fromUuid(arcId);
    if (arc && arc.campaignId === campaign.uuid) {
      newArcIndex.push({
          uuid: arc.uuid,
          name: arc.name,
          startSessionNumber: arc.startSessionNumber,
          endSessionNumber: arc.endSessionNumber,
          sortOrder: arc.sortOrder,
      });
    }
  }

  newArcIndex = newArcIndex.sort((a, b) => (a.sortOrder - b.sortOrder));
  
  // there's no setter, so we use the add method
  for (const frontId of frontIds) {
    const front = await Front.fromUuid(frontId);
    if (front && front.campaignId === campaign.uuid) {
      await campaign.addFront(front);
    }
  }

  // there's no setter, so we use the add method
  for (const storyWebId of storyWebIds) {
    const storyWeb = await StoryWeb.fromUuid(storyWebId);
    if (storyWeb && storyWeb.campaignId === campaign.uuid) {
      await campaign.addStoryWeb(storyWeb);
    }
  }
    
  // Save the updated indexes
  campaign.sessionIndex = newSessionIndex;
  campaign.arcIndex = newArcIndex;
  await campaign.save();
  
  console.log(`Repaired campaign indexes for ${campaign.name}: ${campaign.sessionIndex.length} sessions, ${campaign.arcIndex.length} arcs, ${campaign.frontIds.length} fronts, ${campaign.storyWebIds.length} storyWebs`);
  
  // Return the arc data for updating the setting's campaignIndex
  return newArcIndex;
}

// Make the function globally available for users to run from console
if (typeof window !== 'undefined') {
  (window as any).repairAllIndexes = repairAllIndexes;
  console.log('Global script loaded: window.repairAllIndexes() is now available');
}

export const attachGlobalScripts = () => {
  const module = game.modules.get(moduleId); 
  if (!module)
    throw new Error('Couldn\'t find module in globalScripts.attachGlobalScripts()');

  // @ts-ignore
  module.repairAllIndexes = repairAllIndexes;
}
