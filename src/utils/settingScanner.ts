/**
 * Service for scanning all (long) text content within a setting.
 * Provides a reusable utility to traverse all text-containing fields across
 * all content types (setting, entries, campaigns, sessions, arcs, fronts)
 * and invoke a callback for each.
 */

import { FCBSetting, Campaign, Session, Arc, Front } from '@/classes';
import { CustomFieldContentType, CustomFieldDescription, FieldType, Topics } from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';

/**
 * Enum for the types of documents that can be scanned.
 */
export enum ScanSourceType {
  Setting = 'setting',
  Entry = 'entry',
  Campaign = 'campaign',
  Session = 'session',
  Arc = 'arc',
  Front = 'front',
}

/**
 * Context provided to the scan callback for each text field.
 */
export interface ScanContext {
  /** The type of document being scanned */
  sourceType: ScanSourceType;
  /** The UUID of the document being scanned */
  sourceUuid: string;
  /** The name of the field being scanned (e.g., 'description', 'notes', 'text') */
  fieldName: string;
}

/**
 * Callback function type for scanning text content.
 * @param text - The text content found
 * @param context - Context about where the text was found
 */
export type ScanCallback = (text: string, context: ScanContext) => void | Promise<void>;

/**
 * Service for scanning all text content within a setting.
 * Traverses all content types and invokes a callback for each text field.
 */
const SettingScannerService = {
  /**
   * Scans all text content in a setting and invokes the callback for each field.
   * Ensures all campaigns and entries are loaded before scanning.
   * 
   * @param setting - The setting to scan
   * @param callback - Function to call for each text field found
   */
  scanSettingContent: async (setting: FCBSetting, callback: ScanCallback): Promise<void> => {
    // Ensure campaigns are loaded
    await setting.loadCampaigns();

    // Get custom field definitions for determining which fields are editor-type
    const customFieldDefinitions = ModuleSettings.get(SettingKey.customFields);

    // Scan setting-level content
    await scanSetting(setting, callback, customFieldDefinitions);

    // Scan all entries
    await scanAllEntries(setting, callback, customFieldDefinitions);

    // Scan all campaigns and their nested content
    await scanAllCampaigns(setting, callback, customFieldDefinitions);
  },
};

/**
 * Scans the setting object itself.
 */
async function scanSetting(
  setting: FCBSetting,
  callback: ScanCallback,
  customFieldDefinitions: Record<CustomFieldContentType, CustomFieldDescription[]>
): Promise<void> {
  const context: ScanContext = {
    sourceType: ScanSourceType.Setting,
    sourceUuid: setting.uuid,
    fieldName: 'description',
  };

  // Scan description
  if (setting.description) {
    await callback(setting.description, context);
  }

  // Scan custom editor fields
  const fields = customFieldDefinitions[CustomFieldContentType.Setting] || [];
  await scanCustomFields(setting, ScanSourceType.Setting, setting.uuid, fields, callback);
}

/**
 * Scans all entries across all topics.
 */
async function scanAllEntries(
  setting: FCBSetting,
  callback: ScanCallback,
  customFieldDefinitions: Record<CustomFieldContentType, CustomFieldDescription[]>
): Promise<void> {
  const topics = [
    { type: Topics.Character, contentType: CustomFieldContentType.Character },
    { type: Topics.Location, contentType: CustomFieldContentType.Location },
    { type: Topics.Organization, contentType: CustomFieldContentType.Organization },
    { type: Topics.PC, contentType: CustomFieldContentType.PC },
  ];

  for (const topic of topics) {
    const entries = await setting.topicFolders[topic.type].allEntries();
    for (const entry of entries) {
      // Scan description
      if (entry.description) {
        await callback(entry.description, { sourceType: ScanSourceType.Entry, sourceUuid: entry.uuid, fieldName: 'description' });
      }

      // Scan custom editor fields
      await scanCustomFields(entry, ScanSourceType.Entry, entry.uuid, customFieldDefinitions[topic.contentType] || [], callback);
    }
  }
}

/**
 * Scans all campaigns and their nested content (sessions, arcs, fronts).
 */
async function scanAllCampaigns(
  setting: FCBSetting,
  callback: ScanCallback,
  customFieldDefinitions: Record<CustomFieldContentType, CustomFieldDescription[]>
): Promise<void> {
  for (const campaignUuid of Object.keys(setting.campaigns)) {
    const campaign = setting.campaigns[campaignUuid];
    if (!campaign) continue;

    await scanCampaign(campaign, callback, customFieldDefinitions);

    // Scan sessions
    const sessions = await campaign.allSessions();
    for (const session of sessions) {
      await scanSession(session, callback, customFieldDefinitions);
    }

    // Scan arcs - load from arcIndex
    for (const arcIndex of campaign.arcIndex) {
      const arc = await Arc.fromUuid(arcIndex.uuid);
      if (arc) {
        await scanArc(arc, callback, customFieldDefinitions);
      }
    }

    // Scan fronts
    const fronts = await campaign.allFronts();
    for (const front of fronts) {
      await scanFront(front, callback, customFieldDefinitions);
    }
  }
}

/**
 * Scans a campaign.
 */
async function scanCampaign(
  campaign: Campaign,
  callback: ScanCallback,
  customFieldDefinitions: Record<CustomFieldContentType, CustomFieldDescription[]>
): Promise<void> {
  const baseContext: Omit<ScanContext, 'fieldName'> = {
    sourceType: ScanSourceType.Campaign,
    sourceUuid: campaign.uuid,
  };

  // Scan description
  if (campaign.description) {
    await callback(campaign.description, { ...baseContext, fieldName: 'description' });
  }

  // Scan lore descriptions
  for (const lore of campaign.lore) {
    if (lore.description) {
      await callback(lore.description, { ...baseContext, fieldName: 'lore.description' });
    }
  }

  // Scan ideas
  for (const idea of campaign.ideas) {
    if (idea.text) {
      await callback(idea.text, { ...baseContext, fieldName: 'ideas.text' });
    }
  }

  // Scan custom editor fields
  const fields = customFieldDefinitions[CustomFieldContentType.Campaign] || [];
  await scanCustomFields(campaign, ScanSourceType.Campaign, campaign.uuid, fields, callback);
}

/**
 * Scans a session.
 */
async function scanSession(
  session: Session,
  callback: ScanCallback,
  customFieldDefinitions: Record<CustomFieldContentType, CustomFieldDescription[]>
): Promise<void> {
  const baseContext: Omit<ScanContext, 'fieldName'> = {
    sourceType: ScanSourceType.Session,
    sourceUuid: session.uuid,
  };

  // Scan description (strong start)
  if (session.description) {
    await callback(session.description, { ...baseContext, fieldName: 'description' });
  }

  // Scan locations notes
  for (const location of session.locations) {
    if (location.notes) {
      await callback(location.notes, { ...baseContext, fieldName: 'locations.notes' });
    }
  }

  // Scan NPCs notes
  for (const npc of session.npcs) {
    if (npc.notes) {
      await callback(npc.notes, { ...baseContext, fieldName: 'npcs.notes' });
    }
  }

  // Scan monsters notes
  for (const monster of session.monsters) {
    if (monster.notes) {
      await callback(monster.notes, { ...baseContext, fieldName: 'monsters.notes' });
    }
  }

  // Scan items notes
  for (const item of session.items) {
    if (item.notes) {
      await callback(item.notes, { ...baseContext, fieldName: 'items.notes' });
    }
  }

  // Scan vignettes
  for (const vignette of session.vignettes) {
    if (vignette.description) {
      await callback(vignette.description, { ...baseContext, fieldName: 'vignettes.description' });
    }
  }

  // Scan lore
  for (const lore of session.lore) {
    if (lore.description) {
      await callback(lore.description, { ...baseContext, fieldName: 'lore.description' });
    }
  }

  // Scan custom editor fields
  const fields = customFieldDefinitions[CustomFieldContentType.Session] || [];
  await scanCustomFields(session, ScanSourceType.Session, session.uuid, fields, callback);
}

/**
 * Scans an arc.
 */
async function scanArc(
  arc: Arc,
  callback: ScanCallback,
  customFieldDefinitions: Record<CustomFieldContentType, CustomFieldDescription[]>
): Promise<void> {
  const baseContext: Omit<ScanContext, 'fieldName'> = {
    sourceType: ScanSourceType.Arc,
    sourceUuid: arc.uuid,
  };

  // Scan locations notes
  for (const location of arc.locations) {
    if (location.notes) {
      await callback(location.notes, { ...baseContext, fieldName: 'locations.notes' });
    }
  }

  // Scan participants notes
  for (const participant of arc.participants) {
    if (participant.notes) {
      await callback(participant.notes, { ...baseContext, fieldName: 'participants.notes' });
    }
  }

  // Scan monsters notes
  for (const monster of arc.monsters) {
    if (monster.notes) {
      await callback(monster.notes, { ...baseContext, fieldName: 'monsters.notes' });
    }
  }

  // Scan items notes
  for (const item of arc.items) {
    if (item.notes) {
      await callback(item.notes, { ...baseContext, fieldName: 'items.notes' });
    }
  }

  // Scan vignettes
  for (const vignette of arc.vignettes) {
    if (vignette.description) {
      await callback(vignette.description, { ...baseContext, fieldName: 'vignettes.description' });
    }
  }

  // Scan lore
  for (const lore of arc.lore) {
    if (lore.description) {
      await callback(lore.description, { ...baseContext, fieldName: 'lore.description' });
    }
  }

  // Scan ideas
  for (const idea of arc.ideas) {
    if (idea.text) {
      await callback(idea.text, { ...baseContext, fieldName: 'ideas.text' });
    }
  }

  // Scan custom editor fields
  const fields = customFieldDefinitions[CustomFieldContentType.Arc] || [];
  await scanCustomFields(arc, ScanSourceType.Arc, arc.uuid, fields, callback);
}

/**
 * Scans a front.
 */
async function scanFront(
  front: Front,
  callback: ScanCallback,
  customFieldDefinitions: Record<CustomFieldContentType, CustomFieldDescription[]>
): Promise<void> {
  const baseContext: Omit<ScanContext, 'fieldName'> = {
    sourceType: ScanSourceType.Front,
    sourceUuid: front.uuid,
  };

  // Scan description
  if (front.description) {
    await callback(front.description, { ...baseContext, fieldName: 'description' });
  }

  // Scan dangers
  for (const danger of front.dangers) {
    if (danger.description) {
      await callback(danger.description, { ...baseContext, fieldName: 'dangers.description' });
    }
    if (danger.motivation) {
      await callback(danger.motivation, { ...baseContext, fieldName: 'dangers.motivation' });
    }
    if (danger.impendingDoom) {
      await callback(danger.impendingDoom, { ...baseContext, fieldName: 'dangers.impendingDoom' });
    }
    // Grim portents descriptions
    for (const portent of danger.grimPortents) {
      if (portent.description) {
        await callback(portent.description, { ...baseContext, fieldName: 'dangers.grimPortents.description' });
      }
    }
  }

  // Scan custom editor fields
  const fields = customFieldDefinitions[CustomFieldContentType.Front] || [];
  await scanCustomFields(front, ScanSourceType.Front, front.uuid, fields, callback);
}

/**
 * Scans custom fields that are editor type (contain rich text).
 */
async function scanCustomFields(
  content: { getCustomField: (name: string) => string | boolean | undefined },
  sourceType: ScanContext['sourceType'],
  sourceUuid: string,
  fieldDefinitions: CustomFieldDescription[],
  callback: ScanCallback
): Promise<void> {
  for (const fieldDef of fieldDefinitions) {
    // Only scan editor fields (rich text content that may contain UUIDs)
    if (fieldDef.fieldType !== FieldType.Editor) {
      continue;
    }

    const value = content.getCustomField(fieldDef.name);
    if (typeof value === 'string' && value.trim()) {
      await callback(value, {
        sourceType,
        sourceUuid,
        fieldName: `customFields.${fieldDef.name}`,
      });
    }
  }
}

export default SettingScannerService;
