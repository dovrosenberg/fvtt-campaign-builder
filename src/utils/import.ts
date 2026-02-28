/**
 * Module JSON Import Service
 *
 * Handles importing FCB module data from a JSON file into a Foundry world.
 */

import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
import { FCBSetting, Campaign, Session, Arc, Front, StoryWeb, Entry,FCBJournalEntryPage } from '@/classes';
import { RelatedEntryDetails, Topics, ValidDocType, ValidTopic, ValidTopicRecord, SettingGeneratorConfig } from '@/types';
import GlobalSettingService from '@/utils/globalSettings';
import {
  ModuleExportData,
  SettingExportData,
  ImportContext,
  DocumentExportData,
  ProgressCallback,
  ExportMode,
  remapUuidsInObject,
  remapRecordKeys,
} from './importExportCommon';

/**
 * Import module data from a JSON file.
 *
 * @param file - The JSON file to import
 * @param onProgress - Optional callback for progress updates
 */
export async function importModuleJson(
  file: File,
  onProgress?: ProgressCallback
): Promise<void> {
  onProgress?.(localize('applications.importExport.importStarting'), 0);

  // Read and parse the file
  onProgress?.(localize('applications.importExport.readingFile'), 5);
  const text = await file.text();
  let data: ModuleExportData;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(localize('applications.importExport.invalidFile'));
  }

  // Determine export mode (default to ALL for backwards compatibility)
  const exportMode = data.exportMode ?? ExportMode.ALL;

  // For CONFIGURATION_ONLY mode, only import module settings
  if (exportMode === ExportMode.CONFIGURATION_ONLY) {
    onProgress?.(localize('applications.importExport.importingSettings'), 10);
    if (data.moduleSettings) {
      await importModuleSettings(data.moduleSettings);
    }
    onProgress?.(localize('applications.importExport.importComplete'), 100);
    return;
  }

  // For ALL and SETTINGS_ONLY modes, validate and import full data
  // Validate all data before making any changes
  onProgress?.(localize('applications.importExport.validatingData'), 8);
  // do nothing for now

  // Delete settings that match the imported ones (by JournalEntry ID)
  onProgress?.(localize('applications.importExport.deletingExisting'), 10);
  let entryIdsToPreserve = new Set<string>();
  let existingRollTableConfigs = new Map<string, SettingGeneratorConfig | null>();
  if (data.settings) {
    const result = await clearMatchingSettings(data.settings);
    entryIdsToPreserve = result.entryIdsToPreserve;
    existingRollTableConfigs = result.existingRollTableConfigs;
  }

  // Create import context with UUID mapping, original data storage, and entry IDs to preserve
  const context: ImportContext = {
    uuidMap: new Map<string, string>(),
    reverseUuidMap: new Map<string, string>(),
    originalData: new Map<string, DocumentExportData>(),
    entryIdsToPreserve,
    existingRollTableConfigs,
  };

  // Import module settings (remapped to remove old setting UUIDs)
  // Note: We import settings first, but UUIDs in settings like emailDefaultSetting/emailDefaultCampaign
  // will be remapped later after the UUID map is populated
  if (data.moduleSettings) {
    onProgress?.(localize('applications.importExport.importingSettings'), 15);
    await importModuleSettings(data.moduleSettings);
  }

  // Skip session renumbering during import to prevent recursive save loops
  Session.setSkipRenumbering(true);

  try {
    // Import settings and documents
    if (data.settings) {
      const totalSettings = data.settings.length;

      for (let i = 0; i < data.settings.length; i++) {
        const settingData = data.settings[i];
        const progress = 15 + (i / totalSettings) * 80;
        onProgress?.(
          `${localize('applications.importExport.importingSetting')}: ${settingData.name}`,
          progress
        );

        await importSetting(settingData, context);
      }

      // Remap all UUIDs in all documents using original data
      onProgress?.(localize('applications.importExport.remappingUuids'), 95);
      await remapAllDocumentUuids(context);

      // Remap UUIDs in module settings that reference documents
      await remapModuleSettingsUuids(context);
    }

    onProgress?.(localize('applications.importExport.importComplete'), 100);
  } finally {
    // Always re-enable renumbering after import (even on error)
    Session.setSkipRenumbering(false);
  }
}

/**
 * Delete existing FCB settings whose JournalEntry IDs match the imported settings.
 * This allows settings to be overwritten by subsequent imports from the same source.
 *
 * @param importedSettings - The settings being imported
 * @returns Set of JournalEntry IDs to preserve when creating new settings
 */
async function clearMatchingSettings(importedSettings: SettingExportData[]): Promise<{ entryIdsToPreserve: Set<string>; existingRollTableConfigs: Map<string, SettingGeneratorConfig | null> }> {
  const settingIndex = ModuleSettings.get(SettingKey.settingIndex);
  const entryIdsToPreserve = new Set<string>();
  const existingRollTableConfigs = new Map<string, SettingGeneratorConfig | null>();

  // Build a set of JournalEntry IDs from the import
  // This allows matching across different worlds/compendiums
  for (const s of importedSettings) {
    // Extract JournalEntry ID from UUID (format: Compendium.world.xxx.JournalEntry.ENTRY_ID)
    const uuidParts = s.uuid.split('.');
    const entryId = uuidParts[uuidParts.length - 1]; // Last part is the JournalEntry ID
    if (entryId) {
      entryIdsToPreserve.add(entryId);
    }
  }

  // Find and delete settings whose JournalEntry IDs match imported ones
  for (let i = settingIndex.length - 1; i >= 0; i--) {
    const settingInfo = settingIndex[i];
    // Extract JournalEntry ID from current setting UUID
    const currentParts = settingInfo.settingId.split('.');
    const currentEntryId = currentParts[currentParts.length - 1];
    
    if (entryIdsToPreserve.has(currentEntryId)) {
      // Capture the roll table config before deletion
      const setting = await FCBSetting.fromUuid(settingInfo.settingId, true);  // skip roll tables during import
      if (setting) {
        existingRollTableConfigs.set(currentEntryId, setting.rollTableConfig);
        
        // Delete the compendium directly (not setting.delete() which would delete roll tables)
        const compendium = setting.compendium;
        if (compendium) {
          await compendium.deleteCompendium();
        }
        
        // Remove from global cache
        GlobalSettingService.removeGlobalSetting(settingInfo.settingId);
      }
      
      // Remove from setting index
      settingIndex.splice(i, 1);
    }
  }

  // Update the setting index
  await ModuleSettings.set(SettingKey.settingIndex, settingIndex);

  // Clear global cache
  GlobalSettingService.clearAll();
  
  return { entryIdsToPreserve, existingRollTableConfigs };
}


/**
 * Import module settings from export data.
 *
 * @param settings - The settings to import
 */
async function importModuleSettings(settings: Record<string, unknown>): Promise<void> {
  /** Settings to never include in export */
  const EXCLUDED_SETTINGS: SettingKey[] = [
    SettingKey.lastKnownVersion,
    SettingKey.settingIndex,
    SettingKey.isInPlayMode,
  ];

  for (const [key, value] of Object.entries(settings)) {
    // Skip excluded settings
    if (EXCLUDED_SETTINGS.includes(key as SettingKey)) continue;

    // Skip settingIndex - it will be rebuilt
    if (key === SettingKey.settingIndex) continue;

    try {
      // Cast the key and value - TypeScript can't verify this at compile time
      await ModuleSettings.set(key as SettingKey, value as never);
    } catch {
      // Setting may not exist or have type mismatch
      console.warn(`Failed to import setting: ${key}`);
    }
  }
}

/**
 * Remap UUIDs in module settings that reference FCB documents.
 * This handles settings like emailDefaultSetting and emailDefaultCampaign
 * which store document UUIDs that need to be updated after import.
 *
 * @param context - Import context with UUID map
 */
async function remapModuleSettingsUuids(context: ImportContext): Promise<void> {
  // Settings that contain document UUIDs requiring remapping
  const UUID_SETTINGS: SettingKey[] = [
    SettingKey.emailDefaultSetting,
    SettingKey.emailDefaultCampaign,
  ];

  for (const settingKey of UUID_SETTINGS) {
    const currentValue = ModuleSettings.get(settingKey);
    if (!currentValue) continue;

    // Remap the UUID if it exists in the map
    const remappedValue = context.uuidMap.get(currentValue as string);
    if (remappedValue) {
      await ModuleSettings.set(settingKey, remappedValue);
    } else {
      // The UUID doesn't exist in the new world - clear the setting
      await ModuleSettings.set(settingKey, '');
    }
  }
}

/**
 * Import a single setting and all its documents.
 * If the setting existed before and its compendium was cleared, reuses the compendium
 * and preserves the original UUID.
 *
 * @param settingData - The setting data to import
 * @param context - Import context with UUID map, original data storage, and compendium map
 */
async function importSetting(
  settingData: SettingExportData,
  context: ImportContext
): Promise<void> {
  // Extract JournalEntry ID from the import UUID
  const uuidParts = settingData.uuid.split('.');
  const entryId = uuidParts[uuidParts.length - 1];
  
  // Always preserve the JournalEntry ID from the export
  // This ensures consistent UUIDs across imports
  const setting = await FCBSetting.createForImport('', settingData.name, entryId);
  if (!setting) {
    throw new Error(`Failed to create setting: ${settingData.name}`);
  }
  
  // Map the old setting UUID to the new one
  context.uuidMap.set(settingData.uuid, setting.uuid);
  context.reverseUuidMap.set(setting.uuid, settingData.uuid);

  // Store original setting data for later remapping
  context.originalData.set(settingData.uuid, {
    uuid: settingData.uuid,
    name: settingData.name,
    system: settingData.system,
    description: settingData.description,
  });

  // Import entries
  await importEntries(setting, settingData.documents.entries, context);

  // Import campaigns
  await importCampaigns(setting, settingData.documents.campaigns, context);

  // Import sessions (need campaign mapping)
  await importSessions(settingData.documents.sessions, context);

  // Import arcs
  await importArcs(settingData.documents.arcs, context);

  // Import fronts
  await importFronts(settingData.documents.fronts, context);

  // Import story webs
  await importStoryWebs(settingData.documents.storyWebs, context);
}

/**
 * Import entries into a setting.
 *
 * @param setting - The setting to import into
 * @param entries - The entry data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importEntries(
  setting: FCBSetting,
  entries: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const entryData of entries) {
    const topic = entryData.system.topic as ValidTopic;
    const topicFolder = setting.topicFolders[topic];
    if (!topicFolder) continue;

    // Create the entry - providing name skips the dialog
    const entry = await Entry.create(topicFolder, {
      name: entryData.name,
      type: entryData.system.type as string,
    });

    if (entry) {
      context.uuidMap.set(entryData.uuid, entry.uuid);
      context.reverseUuidMap.set(entry.uuid, entryData.uuid);

      // Store original entry data for later remapping
      context.originalData.set(entryData.uuid, {
        uuid: entryData.uuid,
        name: entryData.name,
        system: entryData.system,
        description: entryData.description,
      });
    }
  }
}

/**
 * Import campaigns into a setting.
 *
 * @param setting - The setting to import into
 * @param campaigns - The campaign data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importCampaigns(
  setting: FCBSetting,
  campaigns: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const campaignData of campaigns) {
    const campaign = await Campaign.create(setting, campaignData.name);
    if (campaign) {
      context.uuidMap.set(campaignData.uuid, campaign.uuid);
      context.reverseUuidMap.set(campaign.uuid, campaignData.uuid);

      // Store original campaign data for later remapping
      context.originalData.set(campaignData.uuid, {
        uuid: campaignData.uuid,
        name: campaignData.name,
        system: campaignData.system,
        description: campaignData.description,
      });
    }
  }
}

/**
 * Import sessions.
 *
 * @param sessions - The session data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importSessions(
  sessions: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const sessionData of sessions) {
    const campaignId = context.uuidMap.get(sessionData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const session = await Session.create(campaign, sessionData.name);
    if (session) {
      context.uuidMap.set(sessionData.uuid, session.uuid);
      context.reverseUuidMap.set(session.uuid, sessionData.uuid);

      // Store original session data for later remapping
      context.originalData.set(sessionData.uuid, {
        uuid: sessionData.uuid,
        name: sessionData.name,
        system: sessionData.system,
        description: sessionData.description,
      });
    }
  }
}

/**
 * Import arcs.
 *
 * @param arcs - The arc data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importArcs(
  arcs: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const arcData of arcs) {
    const campaignId = context.uuidMap.get(arcData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const arc = await Arc.create(campaign, arcData.name);
    if (arc) {
      context.uuidMap.set(arcData.uuid, arc.uuid);
      context.reverseUuidMap.set(arc.uuid, arcData.uuid);

      // Store original arc data for later remapping
      context.originalData.set(arcData.uuid, {
        uuid: arcData.uuid,
        name: arcData.name,
        system: arcData.system,
        description: arcData.description,
      });
    }
  }
}

/**
 * Import fronts.
 *
 * @param fronts - The front data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importFronts(
  fronts: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const frontData of fronts) {
    const campaignId = context.uuidMap.get(frontData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const front = await Front.create(campaign, frontData.name);
    if (front) {
      context.uuidMap.set(frontData.uuid, front.uuid);
      context.reverseUuidMap.set(front.uuid, frontData.uuid);

      // Store original front data for later remapping
      context.originalData.set(frontData.uuid, {
        uuid: frontData.uuid,
        name: frontData.name,
        system: frontData.system,
        description: frontData.description,
      });
    }
  }
}

/**
 * Import story webs.
 *
 * @param storyWebs - The story web data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importStoryWebs(
  storyWebs: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const storyWebData of storyWebs) {
    const campaignId = context.uuidMap.get(storyWebData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const storyWeb = await StoryWeb.create(campaign, storyWebData.name);
    if (storyWeb) {
      context.uuidMap.set(storyWebData.uuid, storyWeb.uuid);
      context.reverseUuidMap.set(storyWeb.uuid, storyWebData.uuid);

      // Store original story web data for later remapping
      context.originalData.set(storyWebData.uuid, {
        uuid: storyWebData.uuid,
        name: storyWebData.name,
        system: storyWebData.system,
        description: null,
      });
    }
  }
}

/**
 * Update a document's system data with remapped UUIDs.
 * Uses the FCB class's systemData setter and save() method to ensure
 * proper key transformation (e.g., UUID dots to #&#) before persistence.
 *
 * @param doc - The FCB document wrapper with systemData and save() method
 * @param systemData - The system data to apply (with remapped UUIDs)
 */
async function updateDocumentSystemData<
  DocType extends ValidDocType,
  DocClass extends JournalEntryPage<DocType>,
  T extends FCBJournalEntryPage<DocType, DocClass>
>(
  doc: T,
  systemData: unknown
): Promise<void> {
  try {
    // Set the system data through the FCB class's setter
    await doc.setSystemData(systemData as Record<string, unknown>);
  } catch (error) {
    // Log the error but don't throw - allow other documents to continue
    console.error(`Failed to update document "${doc.uuid}":`, error);
  }
}

/**
 * Remap UUIDs in a hierarchy object.
 * This handles both the keys (entry UUIDs) and the values (parentId, ancestors, children).
 *
 * @param hierarchies - The hierarchies record to remap
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns A new hierarchies record with remapped UUIDs
 */
function remapHierarchies(
  hierarchies: Record<string, unknown>,
  uuidMap: Map<string, string>
): Record<string, unknown> {
  if (!hierarchies) return hierarchies;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(hierarchies)) {
    // Remap the key (entry UUID)
    const newKey = uuidMap.get(key) || key;

    if (value && typeof value === 'object') {
      const hierarchy = value as Record<string, unknown>;
      const remappedHierarchy: Record<string, unknown> = {};

      // Remap parentId
      if (typeof hierarchy.parentId === 'string' && hierarchy.parentId) {
        remappedHierarchy.parentId = uuidMap.get(hierarchy.parentId) || hierarchy.parentId;
      } else {
        remappedHierarchy.parentId = hierarchy.parentId;
      }

      // Remap ancestors array
      if (Array.isArray(hierarchy.ancestors)) {
        remappedHierarchy.ancestors = hierarchy.ancestors.map(
          (uuid: string) => uuidMap.get(uuid) || uuid
        );
      } else {
        remappedHierarchy.ancestors = hierarchy.ancestors;
      }

      // Remap children array
      if (Array.isArray(hierarchy.children)) {
        remappedHierarchy.children = hierarchy.children.map(
          (uuid: string) => uuidMap.get(uuid) || uuid
        );
      } else {
        remappedHierarchy.children = hierarchy.children;
      }

      // Copy type as-is (not a UUID)
      remappedHierarchy.type = hierarchy.type;

      result[newKey] = remappedHierarchy;
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Remap all UUIDs in all documents after import using the original exported data.
 *
 * @param context - Import context with UUID map and original data
 */
async function remapAllDocumentUuids(context: ImportContext): Promise<void> {
  const settingIndex = ModuleSettings.get(SettingKey.settingIndex);

  for (const settingInfo of settingIndex) {
    const setting = await FCBSetting.fromUuid(settingInfo.settingId, true);  // skip roll tables during import
    if (!setting) continue;

    // Find the original setting data using the reverse map
    const oldSettingUuid = context.reverseUuidMap.get(setting.uuid);
    const originalSettingData = oldSettingUuid
      ? context.originalData.get(oldSettingUuid)
      : undefined;

    if (originalSettingData) {
      // Use original system data, remap UUIDs, and apply
      const remappedSettingSystem = remapUuidsInObject(
        originalSettingData.system,
        context.uuidMap
      ) as Record<string, unknown>;

      // Remap text content
      if (originalSettingData.description) {
        const remappedText = remapUuidsInObject(originalSettingData.description, context.uuidMap) as string;
        setting.description = remappedText;
        await setting.save();
      }

      // Remap hierarchies (both keys and internal UUIDs)
      if (remappedSettingSystem.hierarchies) {
        remappedSettingSystem.hierarchies = remapHierarchies(
          remappedSettingSystem.hierarchies as Record<string, unknown>,
          context.uuidMap
        );
      }

      // Remap expandedIds keys
      if (remappedSettingSystem.expandedIds) {
        remappedSettingSystem.expandedIds = remapRecordKeys(
          remappedSettingSystem.expandedIds as Record<string, unknown>,
          context.uuidMap
        );
      }

      // Handle rollTableConfig - prefer existing roll tables from the previous setting
      // Extract the entry ID to look up existing roll table config
      const settingUuidParts = setting.uuid.split('.');
      const settingEntryId = settingUuidParts[settingUuidParts.length - 1];
      const existingRollTableConfig = context.existingRollTableConfigs.get(settingEntryId);
      
      if (existingRollTableConfig?.rollTables) {
        // Validate that the roll tables still exist
        let allTablesExist = true;
        for (const tableUuid of Object.values(existingRollTableConfig.rollTables)) {
          const table = await foundry.utils.fromUuid<RollTable>(tableUuid as string);
          if (!table) {
            allTablesExist = false;
            break;
          }
        }
        
        if (allTablesExist) {
          // Use the existing roll table config - the roll tables still exist in the world
          remappedSettingSystem.rollTableConfig = existingRollTableConfig;
        } else {
          remappedSettingSystem.rollTableConfig = null;
        }
      } else if (remappedSettingSystem.rollTableConfig) {
        // No existing config, check if imported roll tables exist in this world
        const config = remappedSettingSystem.rollTableConfig as { rollTables?: Record<string, string> };
        if (config.rollTables) {
          // Check if any of the roll tables exist
          let hasValidRollTables = false;
          for (const uuid of Object.values(config.rollTables)) {
            const table = await foundry.utils.fromUuid<RollTable>(uuid);
            if (table) {
              hasValidRollTables = true;
              break;
            }
          }
          if (!hasValidRollTables) {
            remappedSettingSystem.rollTableConfig = null;
          }
        } else {
          remappedSettingSystem.rollTableConfig = null;
        }
      }

      // Update the setting document
      await updateDocumentSystemData(setting, remappedSettingSystem);
    }

    // Remap entries using original data
    for (const topic of [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[]) {
      const topicFolder = setting.topicFolders[topic];
      if (topicFolder) {
        const entries = await topicFolder.allEntries();
        for (const entry of entries) {
          // Find original entry data using reverse map
          const oldEntryUuid = context.reverseUuidMap.get(entry.uuid);
          const originalEntryData = oldEntryUuid
            ? context.originalData.get(oldEntryUuid)
            : undefined;

          if (originalEntryData) {
            // Use original system data, remap UUIDs, and apply
            const remappedEntrySystem = remapUuidsInObject(
              originalEntryData.system,
              context.uuidMap
            ) as Record<string, unknown>;

            // Apply text content
            if (originalEntryData.description) {
              entry.description = remapUuidsInObject(originalEntryData.description, context.uuidMap) as string;
              await entry.save();
            }

            await updateDocumentSystemData(entry, remappedEntrySystem);
          }
        }
      }
    }

    // Remap campaigns and their children
    for (const campaignIndex of setting.campaignIndex) {
      const campaign = await Campaign.fromUuid(campaignIndex.uuid);
      if (!campaign) continue;

      // Find original campaign data using reverse map
      const oldCampaignUuid = context.reverseUuidMap.get(campaign.uuid);
      const originalCampaignData = oldCampaignUuid
        ? context.originalData.get(oldCampaignUuid)
        : undefined;

      if (originalCampaignData) {
        const remappedCampaignSystem = remapUuidsInObject(
          originalCampaignData.system,
          context.uuidMap
        ) as Record<string, unknown>;

        if (originalCampaignData.description) {
          campaign.description = remapUuidsInObject(originalCampaignData.description, context.uuidMap) as string;
          await campaign.save();
        }

        await updateDocumentSystemData(campaign, remappedCampaignSystem);
      }

      // Remap sessions
      const sessions = await campaign.allSessions();
      for (const session of sessions) {
        // Find original session data using reverse map
        const oldSessionUuid = context.reverseUuidMap.get(session.uuid);
        const originalSessionData = oldSessionUuid
          ? context.originalData.get(oldSessionUuid)
          : undefined;

        if (originalSessionData) {
          const remappedSessionSystem = remapUuidsInObject(
            originalSessionData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          if (originalSessionData.description) {
            session.description = remapUuidsInObject(originalSessionData.description, context.uuidMap) as string;
            await session.save();
          }

          await updateDocumentSystemData(session, remappedSessionSystem);
        }
      }

      // Remap arcs
      for (const arcIndex of campaign.arcIndex) {
        const arc = await Arc.fromUuid(arcIndex.uuid);
        if (!arc) continue;

        // Find original arc data using reverse map
        const oldArcUuid = context.reverseUuidMap.get(arc.uuid);
        const originalArcData = oldArcUuid
          ? context.originalData.get(oldArcUuid)
          : undefined;

        if (originalArcData) {
          const remappedArcSystem = remapUuidsInObject(
            originalArcData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          if (originalArcData.description) {
            arc.description = remapUuidsInObject(originalArcData.description, context.uuidMap) as string;
            await arc.save();
          }

          await updateDocumentSystemData(arc, remappedArcSystem);
        }
      }

      // Remap fronts
      for (const frontId of campaign.frontIds) {
        const front = await Front.fromUuid(frontId);
        if (!front) continue;

        // Find original front data using reverse map
        const oldFrontUuid = context.reverseUuidMap.get(front.uuid);
        const originalFrontData = oldFrontUuid
          ? context.originalData.get(oldFrontUuid)
          : undefined;

        if (originalFrontData) {
          const remappedFrontSystem = remapUuidsInObject(
            originalFrontData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          if (originalFrontData.description) {
            front.description = remapUuidsInObject(originalFrontData.description, context.uuidMap) as string;
            await front.save();
          }

          await updateDocumentSystemData(front, remappedFrontSystem);
        }
      }

      // Remap story webs
      for (const storyWebId of campaign.storyWebIds) {
        const storyWeb = await StoryWeb.fromUuid(storyWebId);
        if (!storyWeb) continue;

        // Find original story web data using reverse map
        const oldStoryWebUuid = context.reverseUuidMap.get(storyWeb.uuid);
        const originalStoryWebData = oldStoryWebUuid
          ? context.originalData.get(oldStoryWebUuid)
          : undefined;

        if (originalStoryWebData) {
          const remappedStoryWebSystem = remapUuidsInObject(
            originalStoryWebData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          // Remap positions, edgeStyles, nodeStyles keys
          if (remappedStoryWebSystem.positions) {
            remappedStoryWebSystem.positions = remapRecordKeys(
              remappedStoryWebSystem.positions as Record<string, unknown>,
              context.uuidMap
            );
          }
          if (remappedStoryWebSystem.edgeStyles) {
            remappedStoryWebSystem.edgeStyles = remapRecordKeys(
              remappedStoryWebSystem.edgeStyles as Record<string, unknown>,
              context.uuidMap
            );
          }
          if (remappedStoryWebSystem.nodeStyles) {
            remappedStoryWebSystem.nodeStyles = remapRecordKeys(
              remappedStoryWebSystem.nodeStyles as Record<string, unknown>,
              context.uuidMap
            );
          }

          await updateDocumentSystemData(storyWeb, remappedStoryWebSystem);
        }
      }
    }
  }
}

export default {
  importModuleJson,
};