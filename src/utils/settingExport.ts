/**
 * Service for exporting entire settings to markdown files with accompanying story web images.
 * Provides functionality to generate hierarchical markdown documentation and package it with images.
 */

import { FCBSetting, Entry, Campaign, Arc, Session, Front, FCBJournalEntryPage } from '@/classes';
import { CustomFieldContentType, CustomFieldDescription, FieldType, Species, Topics } from '@/types';
import { localize } from '@/utils/game';
import { cleanUuidReferencesInText, resolveUuidNameSync } from '@/utils/clipboardUuidCleaner';
import { htmlToMarkdown } from '@/utils/sanitizeHtml';
import { ModuleSettings, SettingKey } from '@/settings';
import ZipFileService from '@/utils/zipFiles';

/**
 * Exports an entire setting to a markdown file with story web images in a zip archive.
 * @param settingId - The UUID of the setting to export
 */
const exportSetting = async (settingId: string): Promise<void> => {
  try {
    // Load the setting
    const setting = await FCBSetting.fromUuid(settingId);
    if (!setting) {
      throw new Error('Setting not found');
    }

    // Show loading notification
    ui.notifications.info(localize('notifications.export.starting'));

    // Generate markdown content
    const markdownContent = await generateSettingMarkdown(setting);

    // Export story webs as PNGs
    console.log('Loading campaigns for story web export...');
    await setting.loadCampaigns();
    console.log('Campaigns loaded:', Object.keys(setting.campaigns).length);
    const storyWebImages = await exportStoryWebs(setting);
    console.log(`Total story web images to include: ${storyWebImages.length}`);

    // Create and download zip file
    await createAndDownloadZip(setting, markdownContent, storyWebImages);

    ui.notifications.info(localize('notifications.export.complete'));
  } catch (error) {
    console.error('Error exporting setting:', error);
    ui.notifications.error(localize('notifications.export.failed'));
  }
};

/**
 * Exports an entire setting to a markdown file only (no story webs).
 * @param settingId - The UUID of the setting to export
 */
const exportSettingMarkdown = async (settingId: string): Promise<void> => {
  try {
    // Load the setting
    const setting = await FCBSetting.fromUuid(settingId);
    if (!setting) {
      throw new Error('Setting not found');
    }

    // Show loading notification
    ui.notifications.info(localize('notifications.export.starting'));

    // Generate markdown content
    const markdownContent = await generateSettingMarkdown(setting);

    // Download just the markdown file
    const markdownBlob = new Blob([markdownContent], { type: 'text/markdown' });
    const markdownUrl = URL.createObjectURL(markdownBlob);
    const markdownLink = document.createElement('a');
    markdownLink.href = markdownUrl;
    markdownLink.download = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    markdownLink.click();
    URL.revokeObjectURL(markdownUrl);

    ui.notifications.info(localize('notifications.export.complete'));
  } catch (error) {
    console.error('Error exporting setting markdown:', error);
    ui.notifications.error(localize('notifications.export.failed'));
  }
};

/**
 * Generates hierarchical markdown content for the entire setting.
 * @param setting - The setting object to export
 * @returns The generated markdown content
 */
const generateSettingMarkdown = async (setting: FCBSetting): Promise<string> => {
  let markdown = `# ${setting.name}\n\n`;
  markdown += `## Overview\n`;

  // Add genre and feeling
  if (setting.genre.trim()) {
    markdown += `**Genre:** ${setting.genre.trim()}\n\n`;
  }
  if (setting.settingFeeling.trim()) {
    markdown += `**Setting Feeling:** ${setting.settingFeeling.trim()}\n\n`;
  }

  // Add setting description
  if (setting.description.trim()) {
    markdown += `**Description:**\n\n${cleanText(setting.description, 3)}\n\n`;
  }

  const customFieldDefinitions = ModuleSettings.get(SettingKey.customFields);
  const fields = customFieldDefinitions[CustomFieldContentType.Setting] || [];
  if (fields.length>0)
    markdown += exportCustomFields(setting, fields);

  const speciesList = ModuleSettings.get(SettingKey.speciesList);
  if (speciesList.length > 0) {
    markdown += `## Setting Species\n`;
    for (const species of speciesList) {
      markdown += `**${species.name.trim()}:**\n\n${cleanText(species.description, 3)}\n\n`;
    }
  }

  // Load all campaigns
  await setting.loadCampaigns();

  // Export entries by topic
  markdown += await exportEntriesByTopic(setting);

  // Export campaigns
  markdown += await exportCampaigns(setting);

  return markdown;
};

/**
 * Exports all entries organized by topic.
 * @param setting - The setting object
 * @returns Markdown content for all entries
 */
const exportEntriesByTopic = async (setting: FCBSetting): Promise<string> => {
  let markdown = '';

  const topics = [
    { type: Topics.Character, name: localize('topics.characters'), contentType: CustomFieldContentType.Character},
    { type: Topics.Location, name: localize('topics.locations'), contentType: CustomFieldContentType.Location},
    { type: Topics.Organization, name: localize('topics.organizations'), contentType: CustomFieldContentType.Organization},
    { type: Topics.PC, name: localize('topics.pcs'), contentType: CustomFieldContentType.PC}
  ];

  const customFieldDefinitions = ModuleSettings.get(SettingKey.customFields);

  const validSpecies = ModuleSettings.get(SettingKey.speciesList).reduce((acc, s: Species) => {
    acc[s.id] = s.name;
    return acc;
  }, {} as Record<string, string>);

  for (const topic of topics) {
    const entries = await setting.topicFolders[topic.type].allEntries();
    if (entries.length > 0) {
      markdown += `## ${topic.name}\n`;
      
      for (const entry of entries) {
        markdown += await exportEntry(entry, setting, validSpecies, customFieldDefinitions[topic.contentType] || []);
      }
    }
  }

  return markdown;
};

/**
 * Exports a single entry with all its content.
 * @param entry - The entry to export
 * @returns Markdown content for the entry
 */
const exportEntry = async (entry: Entry, setting: FCBSetting, validSpecies: Record<string, string>, customFieldDefinitions: CustomFieldDescription[]): Promise<string> => {
  let markdown = `### ${entry.name}\n`;

  // Tags - I think these may not make sense to export?
  // if (entry.tags && entry.tags.length > 0) {
  //   markdown += `**Tags:** ${entry.tags.join(', ')}\n\n`;
  // }

  // Type
  if (entry.type.trim()) {
    markdown += `**Type:** ${entry.type.trim()}\n\n`;
  }

  // characters have species
  if (entry.topic === Topics.Character && entry.speciesId && validSpecies[entry.speciesId]) {
    markdown += `**Species:** ${validSpecies[entry.speciesId]}\n\n`;
  }
  
  // locations and orgs have parents
  if ([Topics.Location, Topics.Organization].includes(entry.topic)) {
    const parentId = setting.getEntryHierarchy(entry.uuid)?.parentId;
    if (parentId) {
      markdown += `**Parent:** ${resolveUuidNameSync(parentId)}\n\n`;
    }
  }

  // Description
  if (entry.description.trim()) {
    markdown += `**Description:**\n\n${cleanText(entry.description, 3)}\n\n`;
  }

  markdown += exportCustomFields(entry, customFieldDefinitions);


  // Relationships
  markdown += exportRelationships(entry);

  // Linked Foundry Documents - not sure these make sense to export
  // if (entry.foundryDocuments && entry.foundryDocuments.length > 0) {
  //   markdown += `### Linked Documents\n\n`;
  //   for (const docId of entry.foundryDocuments) {
  //     const docName = resolveFoundryDocumentName(docId);
  //     markdown += `- ${docName}\n`;
  //   }
  //   markdown += '\n';
  // }

  // Linked Journals - not sure these make sense to export
  // if (entry.journals && entry.journals.length > 0) {
  //   markdown += `### Linked Journals\n\n`;
  //   for (const journal of entry.journals) {
  //     // RelatedJournal might not have standard properties, so we handle it safely
  //     const journalName = (journal as any).name || 'Journal Entry';
  //     markdown += `- ${journalName}\n`;
  //   }
  //   markdown += '\n';
  // }

  return markdown;
};

/**
 * Exports custom field definitions for an object with them
 */
const exportCustomFields = (content: FCBJournalEntryPage<any, any>, customFieldDefinitions: CustomFieldDescription[]): string => {
  let markdown = '';

  // Custom Fields
  for (const fieldDef of customFieldDefinitions) {  
    if (!fieldDef.deleted) {
      let value = content.getCustomField(fieldDef.name);

      if (value == null)
        continue;

      switch (fieldDef.fieldType) {
        case FieldType.Boolean:
          markdown += `**${fieldDef.label}:** ${value ? 'Yes' : 'No'}\n\n`;
          break;
        case FieldType.Select:
        case FieldType.Text:
          if ((value as string).trim())
            markdown += `**${fieldDef.label}:** ${(value as string).trim()}\n\n`;
          break;
        case FieldType.Editor:
          if ((value as string).trim())
            markdown += `**${fieldDef.label}:**\n\n${cleanText((value as string), 4)}\n\n`;
          break;
        default:
          continue;
      }
    }
  }

  return markdown;
}

/**
 * Exports relationships for an entry.
 * @param entry - The entry
 * @returns Formatted relationships markdown
 */
const exportRelationships = (entry: Entry): string => {
  let relationships = '';

  for (const [topic, topicRelationships] of Object.entries(entry.relationships)) {
    const relationshipData = Object.values(topicRelationships);

    if (relationshipData.length > 0) {
      relationships += `#### ${localize(`export.relatedTopics.${topic}`)}\n`;
      for (const relationship of relationshipData) {
        relationships += `- ${relationship.name.trim()}`;

        if (relationship.type.trim()) {
          relationships += ` (${relationship.type?.trim()})`;
        }

        if (relationship.extraFields?.relationship?.trim()) {
          relationships += ` - ${cleanText(relationship.extraFields.relationship, 5)}`;
        }

        relationships += '\n';
      }

      relationships += '\n';
    }
  }

  return relationships;
};

/**
 * Exports all campaigns with their arcs and sessions.
 * @param setting - The setting object
 * @returns Markdown content for all campaigns
 */
const exportCampaigns = async (setting: FCBSetting): Promise<string> => {
  let markdown = '';

  if (Object.keys(setting.campaigns).length === 0) {
    return markdown;
  }

  // Get custom field definitions once for all campaigns
  const customFieldDefinitions = ModuleSettings.get(SettingKey.customFields);
  const campaignFields = customFieldDefinitions[CustomFieldContentType.Campaign] || [];
  const frontFields = customFieldDefinitions[CustomFieldContentType.Front] || [];
  const arcFields = customFieldDefinitions[CustomFieldContentType.Arc] || [];
  const sessionFields = customFieldDefinitions[CustomFieldContentType.Session] || [];

  for (const campaign of Object.values(setting.campaigns)) {
    markdown += await exportCampaign(campaign, setting, campaignFields, frontFields, arcFields, sessionFields);
  }

  return markdown;
};

/**
 * Exports a single campaign with its fronts, arcs, and sessions.
 * @param campaign - The campaign to export
 * @param setting - The setting object
 * @param customFieldDefinitions - The custom field definitions for campaigns
 * @param frontFieldDefinitions - The custom field definitions for fronts
 * @param arcFieldDefinitions - The custom field definitions for arcs
 * @param sessionFieldDefinitions - The custom field definitions for sessions
 * @returns Markdown content for the campaign
 */
const exportCampaign = async (
  campaign: Campaign,
  setting: FCBSetting,
  customFieldDefinitions: CustomFieldDescription[],
  frontFieldDefinitions: CustomFieldDescription[],
  arcFieldDefinitions: CustomFieldDescription[],
  sessionFieldDefinitions: CustomFieldDescription[]
): Promise<string> => {
  if (campaign.completed)
    return '';  

  let markdown = `## Campaign: ${campaign.name}\n`;

  // Description
  if (campaign.description) {
    markdown += `**Description:**\n\n${cleanText(campaign.description, 3)}\n\n`;
  }

  // Custom fields
  markdown += exportCustomFields(campaign, customFieldDefinitions);

  // TODO - PCs
  if (campaign.pcs && campaign.pcs.length > 0) {
    markdown += `### PCs\n`;
    for (const pc of campaign.pcs) {
      if (!pc.actorId)
        continue;

      // lookup the actor
      const actorName = resolveUuidNameSync(pc.actorId);
      if (actorName)
        markdown += `- ${actorName} (player name: ${pc.name})\n`;
    }
    markdown += '\n';
  }

  // Lore (only undelivered) - table format
  const undeliveredLore = campaign.lore.filter(lore => !lore.delivered);
  if (undeliveredLore.length > 0) {
    markdown += `### Not-yet-delivered Lore\n`;
    markdown += `| Lore         |\n`;
    markdown += `|--------------|\n`;
    for (const lore of undeliveredLore) {
      const description = cleanText(lore.description, 4);
      markdown += `| ${description} |\n`;
    }
    markdown += '\n';
  }

  // Ideas
  if (campaign.ideas && campaign.ideas.length > 0) {
    markdown += `### Ideas\n`;
    for (const idea of campaign.ideas) {
      markdown += `- ${cleanText(idea.text, 4)}\n`;
    }
    markdown += '\n';
  }

  // Todo Items (table format)
  if (ModuleSettings.get(SettingKey.enableToDoList)) {
    if (campaign.todoItems && campaign.todoItems.length > 0) {
      markdown += `### To-Do Items\n`;
      markdown += `| Date | Reference | To Do |\n`;
      markdown += `|------|-----------|-------|\n`;
      for (const todo of campaign.todoItems) {
        const date = new Date(todo.lastTouched).toLocaleDateString();
        const reference = todo.linkedText || '';
        const todoText = cleanText(todo.text, 4);
        markdown += `| ${date} | ${reference} | ${todoText} |\n`;
      }
      markdown += '\n';
    }
  }

  // Fronts
  if (ModuleSettings.get(SettingKey.useFronts)) {
    const fronts = await campaign.allFronts();
    if (fronts.length > 0) {
      for (const front of fronts) {
        markdown += await exportFront(front, setting, frontFieldDefinitions);
      }
    }
  }

  // Arcs
  const arcs = await Promise.all(
    campaign.arcIndex.map(arcIndex => Arc.fromUuid(arcIndex.uuid))
  );
  const validArcs = arcs.filter(arc => arc !== null) as Arc[];

  if (validArcs.length > 0) {
    for (const arc of validArcs) {
      markdown += await exportArc(arc, setting, arcFieldDefinitions, sessionFieldDefinitions);
    }
  }

  return markdown;
};

/**
 * Exports a front with its dangers.
 * @param front - The front to export
 * @param setting - The setting object 
 * @param customFieldDefinitions - The custom field definitions for fronts
 * @returns Markdown content for the front
 */
const exportFront = async (front: Front, setting: FCBSetting, customFieldDefinitions: CustomFieldDescription[]): Promise<string> => {
  let markdown = `### Front: ${front.name}\n`;

  // Description
  if (front.description) {
    markdown += `#### Description\n${cleanText(front.description)}\n\n`;
  }

  // Custom fields
  markdown += exportCustomFields(front, customFieldDefinitions);

  // Dangers
  if (front.dangers && front.dangers.length > 0) {
    for (const danger of front.dangers) {
      markdown += `#### Danger: ${danger.name}\n`;
      if (danger.description.trim()) {
        markdown += `${cleanText(danger.description)}\n\n`;
      }
      if (danger.impendingDoom.trim()) {
        markdown += `**Impending Doom:** ${danger.impendingDoom.trim()}\n\n`;
      }
      if (danger.motivation.trim()) {
        markdown += `**Motivation:** ${cleanText(danger.motivation.trim(), 5)}\n\n`;
      }

      // Participants
      if (danger.participants && danger.participants.length > 0) {
        markdown += `**Participants:**\n\n`;
        for (const participant of danger.participants) {
          const name = resolveUuidNameSync(participant.uuid);
          markdown += `- ${name} ${participant.role.trim() ? `(Role: ${cleanText(participant.role, 5)})` : ''}\n`;
        }
        markdown += '\n';
      }

      // Grim Portents (table format)
      if (danger.grimPortents && danger.grimPortents.length > 0) {
        markdown += `**Grim Portents:**\n\n`;
        markdown += `| Complete | Description |\n`;
        markdown += `|-------------|----------|\n`;
        for (const portent of danger.grimPortents) {
          const complete = portent.complete ? '✓' : '';
          const description = cleanText(portent.description, 5);

          if (!description)
            continue;

          markdown += `| ${complete} | ${description} |\n`;
        }
        markdown += '\n';
      }
    }
  }

  return markdown;
};

/**
 * Exports an arc with its sessions.
 * @param arc - The arc to export
 * @param setting - The setting object 
 * @param customFieldDefinitions - The custom field definitions for arcs
 * @param sessionFieldDefinitions - The custom field definitions for sessions
 * @returns Markdown content for the arc
 */
const exportArc = async (arc: Arc, setting: FCBSetting, customFieldDefinitions: CustomFieldDescription[], sessionFieldDefinitions: CustomFieldDescription[]): Promise<string> => {
  let markdown = `### Arc: ${arc.name}\n`;

  // Description
  if (arc.description) {
    markdown += `**Description:**\n\n${cleanText(arc.description, 5)}\n\n`;
  }

  // Custom fields
  markdown += exportCustomFields(arc, customFieldDefinitions);

  // Vignettes (table format)
  if (arc.vignettes && arc.vignettes.length > 0) {
    markdown += `#### Vignettes\n`;
    markdown += `| Description |\n`;
    markdown += `|-------------|\n`;
    for (const vignette of arc.vignettes) {
      const description = cleanText(vignette.description, 5);

      if (!description)
        continue;

      markdown += `| ${description} |\n`;
    }
    markdown += '\n';
  }

  // Locations (table format with name, type, parent, notes)
  if (arc.locations && arc.locations.length > 0) {
    markdown += `#### Locations\n`;
    markdown += `| Name | Type | Parent | Notes |\n`;
    markdown += `|------|------|--------|-------|\n`;
    for (const location of arc.locations) {
      const entry = await Entry.fromUuid(location.uuid);
      if (entry) {
        const name = entry.name;
        const type = entry.type || '';
        const hierarchy = setting?.getEntryHierarchy(entry.uuid);
        const parentName = hierarchy?.parentId ? resolveUuidNameSync(hierarchy.parentId) : '';
        const notes = cleanText(location.notes, 5);
        markdown += `| ${name} | ${type} | ${parentName} | ${notes} |\n`;
      }
    }
    markdown += '\n';
  }

  // Participants (table format with name, type, notes)
  if (arc.participants && arc.participants.length > 0) {
    markdown += `#### Participants\n`;
    markdown += `| Name | Type | Notes |\n`;
    markdown += `|------|------|-------|\n`;
    for (const participant of arc.participants) {
      const entry = await Entry.fromUuid(participant.uuid);
      if (entry) {
        const name = entry.name;
        const type = entry.type || '';
        const notes = cleanText(participant.notes, 5);
        markdown += `| ${name} | ${type} | ${notes} |\n`;
      }
    }
    markdown += '\n';
  }

  // Monsters (table format)
  if (arc.monsters && arc.monsters.length > 0) {
    markdown += `#### Monsters\n`;
    markdown += `| Name | Notes |\n`;
    markdown += `|------|-------|\n`;
    for (const monster of arc.monsters) {
      const docName = resolveFoundryDocumentName(monster.uuid, true);
      if (docName) {
        const notes = cleanText(monster.notes, 5);
        markdown += `| ${docName} | ${notes} |\n`;
      }
    }
    markdown += '\n';
  }

  // Lore (table format)
  if (arc.lore && arc.lore.length > 0) {
    markdown += `#### Lore\n`;
    markdown += `| Description |\n`;
    markdown += `|-------------|\n`;
    for (const lore of arc.lore) {
      const description = cleanText(lore.description, 5);

      if (!description)
        continue;

      markdown += `| ${description} |\n`;
    }
    markdown += '\n';
  }

  // Ideas (table format)
  if (arc.ideas && arc.ideas.length > 0) {
    markdown += `#### Ideas\n`;

    markdown += `| Description |\n`;
    markdown += `|-------------|\n`;
    for (const idea of arc.ideas) {
      const description = cleanText(idea.text, 5);

      if (!description)
        continue;

      markdown += `| ${description} |\n`;
    }
    markdown += '\n';
  }

  // Sessions
  const campaign = await arc.loadCampaign();
  const sessions = await campaign.filterSessions(s =>
    s.number >= arc.startSessionNumber && s.number <= arc.endSessionNumber
  );

  if (sessions.length > 0) {
    for (const session of sessions) {
      markdown += await exportSession(session, setting, sessionFieldDefinitions);
    }
  }

  return markdown;
};

/**
 * Exports a session with all its content.
 * @param session - The session to export
 * @param setting - The setting object 
 * @param customFieldDefinitions - The custom field definitions for sessions
 * @returns Markdown content for the session
 */
const exportSession = async (session: Session, setting: FCBSetting, customFieldDefinitions: CustomFieldDescription[]): Promise<string> => {
  let markdown = `#### Session: ${session.name}\n`;

  // Session number and date
  markdown += `**Session Number:** ${session.number}\n\n`;
  if (session.date) {
    markdown += `**Session Date:** ${session.date.toLocaleDateString()}\n\n`;
  }

  // Description
  if (session.description) {
    markdown += `**Notes:**\n\n${cleanText(session.description, 5)}\n\n`;
  }

  // Custom fields
  markdown += exportCustomFields(session, customFieldDefinitions);

  // Tags - I think these may not make sense to export?
  // if (session.tags && session.tags.length > 0) {
  //   markdown += `**Tags:** ${session.tags.join(', ')}\n\n`;
  // }

  // Lore (table format)
  if (session.lore && session.lore.length > 0) {
    markdown += `#### Lore\n`;
    markdown += `| Used | Significant | Description |\n`;
    markdown += `|------|-------------|-------------|\n`;
    for (const lore of session.lore) {
      const description = cleanText(lore.description, 5);
      const significant = lore.significant ? '✓' : '';
      const delivered = lore.delivered ? '✓' : '';

      if (!description)
        continue;

      markdown += `| ${delivered} | ${significant} | ${description} |\n`;
    }
    markdown += '\n';
  }

  // Vignettes
  if (session.vignettes && session.vignettes.length > 0) {
    markdown += `#### Vignettes\n`;
    markdown += `| Used | Description |\n`;
    markdown += `|------|-------------|\n`;
    for (const vignette of session.vignettes) {
      const description = cleanText(vignette.description, 5);
      const delivered = vignette.delivered ? '✓' : '';

      if (!description)
        continue;

      markdown += `| ${delivered} | ${description} |\n`;
    }
    markdown += '\n';
  }

  // Locations
  if (session.locations && session.locations.length > 0) {
    markdown += `#### Locations\n`;

    markdown += `| Used | Name | Type | Parent | Notes |\n`;
    markdown += `|------|------|------|--------|-------|\n`;
    for (const location of session.locations) {
      const entry = await Entry.fromUuid(location.uuid);
      if (entry && entry.uuid) {
        const name = entry.name;
        const type = entry.type || '';
        const delivered = location.delivered ? '✓' : '';
        const notes = cleanText(location.notes, 5);
        const parentName = setting?.getEntryHierarchy(entry.uuid)?.parentId ? resolveUuidNameSync(setting.getEntryHierarchy(entry.uuid)!.parentId || '') : '';
        markdown += `| ${delivered} | ${name} | ${type} | ${parentName} | ${notes} |\n`;
      }
    }
    markdown += '\n';
  }

  // NPCs (table format)
  // TODO - get tid of all the checks, etc.
   if (session.npcs && session.npcs.length > 0) {
    markdown += `#### NPCs\n`;
    markdown += `| Used | Name | Type | Notes |\n`;
    markdown += `|------|------|------|-------|\n`;
    for (const npc of session.npcs) {
      const entry = await Entry.fromUuid(npc.uuid);
      if (entry) {
        const name = entry.name;
        const type = entry.type || '';
        const delivered = npc.delivered ? '✓' : '';
        const notes = cleanText(npc.notes, 5);
        markdown += `| ${delivered} | ${name} | ${type} | ${notes} |\n`;
      }
    }
    markdown += '\n';
  }

  // Monsters (table format)
  if (session.monsters && session.monsters.length > 0) {
    markdown += `#### Monsters\n`;
    markdown += `| Used | Name | Number | Notes |\n`;
    markdown += `|------|------|--------|-------|\n`;
    for (const monster of session.monsters) {
      const docName = resolveFoundryDocumentName(monster.uuid, true);
      if (docName) {
        const delivered = monster.delivered ? '✓' : '';
        const notes = cleanText(monster.notes, 5);
        markdown += `| ${delivered} | ${docName} | ${monster.number} | ${notes} |\n`;
      }
    }
    markdown += '\n';
  }

  // Items
  if (session.items && session.items.length > 0) {
    markdown += `#### Items\n`;
    markdown += `| Used | Name | Notes |\n`;
    markdown += `|------|------|-------|\n`;
    for (const item of session.items) {
      const docName = resolveFoundryDocumentName(item.uuid, true);
      if (docName) {
        const delivered = item.delivered ? '✓' : '';
        const notes = cleanText(item.notes, 5);
        markdown += `| ${delivered} | ${docName} | ${notes} |\n`;
      }
    }
    markdown += '\n';
  }

  return markdown;
};

/**
 * Generates a PNG blob from a story web.
 * @param storyWeb - The story web to export
 * @returns Promise<Blob> - The PNG blob
 */
const generateStoryWebPng = async (storyWeb: any): Promise<Blob> => {
  // Generate network data
  const { nodes, edges } = await storyWeb.generateNetworkData(true);

  // Create off-screen container
  // I've been unable to get the container to size dynamically; it should only be an issue for very large webs, though, since it will fit and then you can zoom in
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '2000px';
  container.style.height = '1500px';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  // Import vis-network dynamically
  const { Network } = await import('vis-network');

  // Create network
  const network = new Network(container, { nodes, edges }, {
    physics: false,
    interaction: {
      hover: false,
      tooltipDelay: 0
    }
  });

  // Wait for network to be ready and rendered
  await new Promise<void>((resolve) => {
    // Since physics is disabled, the network should be ready immediately
    // But we'll wait a bit for rendering
    setTimeout(resolve, 1000);
  });

  // Get the network canvas directly from vis-network
  const networkCanvas = (network as any).canvas?.frame?.canvas || 
                        container.querySelector('canvas') as HTMLCanvasElement;
  
  if (!networkCanvas) {
    document.body.removeChild(container);
    network.destroy();
    throw new Error('Could not find network canvas for story web export');
  }

  // Create canvas with the same dimensions as the network canvas
  const canvas = document.createElement('canvas');
  canvas.width = networkCanvas.width || 2000;
  canvas.height = networkCanvas.height || 1500;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    document.body.removeChild(container);
    network.destroy();
    throw new Error('Could not get canvas context for story web export');
  }

  // Draw white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the network canvas to our canvas
  ctx.drawImage(networkCanvas, 0, 0);

  // Get canvas data as PNG
  const pngData = await new Promise<Blob>((resolve) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        resolve(new Blob()); // Empty blob as fallback
      }
    }, 'image/png');
  });

  // Clean up
  document.body.removeChild(container);
  network.destroy();

  return pngData;
};

/**
 * Exports all story webs in a setting as PNG images.
 * @param setting - The setting object
 * @returns Array of objects containing story web name and PNG data
 */
const exportStoryWebs = async (setting: FCBSetting): Promise<Array<{ name: string; data: Blob }>> => {
  if (!ModuleSettings.get(SettingKey.useStoryWebs))
    return [];

  const storyWebImages: Array<{ name: string; data: Blob }> = [];
  console.log('Starting story web export for setting:', setting.name);

  for (const campaign of Object.values(setting.campaigns)) {
    const storyWebs = await campaign.allStoryWebs();
    console.log(`Found ${storyWebs.length} story webs in campaign: ${campaign.name}`);
    
    for (const storyWeb of storyWebs) {
      try {
        console.log(`Exporting story web: ${storyWeb.name}`);
        
        // Use the shared PNG generation function
        const pngData = await generateStoryWebPng(storyWeb);
        
        // Only add if we got valid data
        if (pngData.size > 0) {
          // Get the campaign name for the filename
          const campaignName = campaign?.name || 'Unknown Campaign';
          const fileName = `${campaignName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${storyWeb.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
          storyWebImages.push({ name: fileName, data: pngData });
          console.log(`Successfully exported story web: ${storyWeb.name}`);
        } else {
          console.error(`Failed to generate PNG for story web: ${storyWeb.name}`);
        }
      } catch (error) {
        console.error(`Error exporting story web ${storyWeb.name}:`, error);
      }
    }
  }

  console.log(`Successfully exported ${storyWebImages.length} story web images`);
  return storyWebImages;
};

/**
 * Creates and downloads a zip file containing the markdown and images.
 * @param setting - The setting object
 * @param markdownContent - The markdown content
 * @param storyWebImages - Array of story web images
 */
const createAndDownloadZip = async (
  setting: FCBSetting,
  markdownContent: string,
  storyWebImages: Array<{ name: string; data: Blob }>
): Promise<void> => {
  try {
    // Create ZIP data directly
    const encoder = new TextEncoder();
    const files: Array<{ name: string; content: Uint8Array }> = [];
    
    // Add markdown file
    const markdownFileName = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    files.push({
      name: markdownFileName,
      content: encoder.encode(markdownContent)
    });
    
    // Add image files
    for (const image of storyWebImages) {
      const arrayBuffer = await image.data.arrayBuffer();
      files.push({
        name: image.name,
        content: new Uint8Array(arrayBuffer)
      });
    }
    
    // Create ZIP file
    const zipData = await ZipFileService.createZipData(files);
    
    // Download immediately using blob URL
    const blob = new Blob([zipData], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error creating zip file:', error);
    // Fallback - download files separately
    await downloadFilesSeparately(setting, markdownContent, storyWebImages);
  }
};

/**
 * Downloads files individually when ZIP creation is not available.
 * @param setting - The setting object
 * @param markdownContent - The markdown content
 * @param storyWebImages - Array of story web images
 */
const downloadFilesSeparately = async (
  setting: FCBSetting,
  markdownContent: string,
  storyWebImages: Array<{ name: string; data: Blob }>
): Promise<void> => {
  // Download markdown file
  const markdownBlob = new Blob([markdownContent], { type: 'text/markdown' });
  const markdownUrl = URL.createObjectURL(markdownBlob);
  const markdownLink = document.createElement('a');
  markdownLink.href = markdownUrl;
  markdownLink.download = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  markdownLink.click();
  URL.revokeObjectURL(markdownUrl);

  // Download images with a small delay between each
  for (let i = 0; i < storyWebImages.length; i++) {
    const image = storyWebImages[i];
    setTimeout(() => {
      const url = URL.createObjectURL(image.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.name;
      link.click();
      URL.revokeObjectURL(url);
    }, i * 100); // 100ms delay between downloads
  }
};

/**
 * Resolves a Foundry document UUID to a readable name.
 * @param uuid - The UUID to resolve
 * @basic = If true, just return the name of the document 
 * @returns The formatted name
 */
const resolveFoundryDocumentName = (uuid: string, basic: boolean = false): string => {
  try {
    const parsed = foundry.utils.parseUuid(uuid);
    if (!parsed) return uuid;

    const collection = parsed.collection as any;
    const id = parsed.id as string;

    // Try to get the document name
    if (collection.index) {
      const indexEntry = collection.index.get(id);
      if (indexEntry?.name) {
        // Determine document type from collection name
        const docType = collection.metadata?.name || 'Document';
        return basic ? indexEntry.name : `[Foundry ${docType} - ${indexEntry.name}]`;
      }
    }

    if (typeof collection.get === 'function') {
      const doc = collection.get(id);
      if (doc?.name) {
        const docType = doc.documentName || 'Document';
        return basic ? doc.name : `[Foundry ${docType} - ${doc.name}]`;
      }
    }

    return `[Foundry Document - ${uuid}]`;
  } catch {
    return `[Foundry Document - ${uuid}]`;
  }
};

/**
 * Cleans text content by removing UUID references and HTML.  Also trims.
 * @param text - The text to clean
 * @param topHeaderLevel - The header level to use for the top-level heading
 * @returns The cleaned text
 */
const cleanText = (text: string, topHeaderLevel: number = 1): string => {
  // Clean UUID references first (before DOM parsing, so names appear in markdown)
  let cleaned = cleanUuidReferencesInText(text);

  // Convert HTML to markdown
  cleaned = htmlToMarkdown(cleaned, topHeaderLevel).trim();

  return cleaned;
};

const SettingExportService = {
  exportSetting,
  exportSettingMarkdown,
  generateStoryWebPng
};

export default SettingExportService;
