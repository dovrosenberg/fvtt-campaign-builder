/**
 * Service for exporting entire settings to markdown files with accompanying story web images.
 * Provides functionality to generate hierarchical markdown documentation and package it with images.
 */

import { FCBSetting } from '@/classes/Documents/FCBSetting';
import { Entry } from '@/classes/Documents/Entry';
import { Campaign } from '@/classes/Documents/Campaign';
import { Arc } from '@/classes/Documents/Arc';
import { Session } from '@/classes/Documents/Session';
import { Front } from '@/classes/Documents/Front';
import { CustomFieldDescription, FieldType, Topics } from '@/types';
import { localize } from '@/utils/game';
import { cleanUuidReferencesInText } from '@/utils/clipboardUuidCleaner';

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
  
  // Add setting description
  if (setting.description) {
    markdown += `${cleanText(setting.description)}\n\n`;
  }

  // Add genre and feeling
  if (setting.genre) {
    markdown += `**Genre:** ${setting.genre}\n\n`;
  }
  if (setting.settingFeeling) {
    markdown += `**Setting Feeling:** ${setting.settingFeeling}\n\n`;
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
    { type: Topics.Character, name: localize('topics.characters') },
    { type: Topics.Location, name: localize('topics.locations') },
    { type: Topics.Organization, name: localize('topics.organizations') },
    { type: Topics.PC, name: localize('topics.pcs') }
  ];

  for (const topic of topics) {
    const entries = await setting.topicFolders[topic.type].allEntries();
    if (entries.length > 0) {
      markdown += `## ${topic.name}\n\n`;
      
      for (const entry of entries) {
        markdown += await exportEntry(entry);
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
const exportEntry = async (entry: Entry, setting: FCBSetting, customFieldDefinitions: CustomFieldDescription[]): Promise<string> => {
  let markdown = `### ${entry.name}\n\n`;

  // Tags - I think these may not make sense to export?
  // if (entry.tags && entry.tags.length > 0) {
  //   markdown += `**Tags:** ${entry.tags.join(', ')}\n\n`;
  // }

  // Type
  if (entry.type) {
    markdown += `**Type:** ${entry.type}\n\n`;
  }

  // characters have species
  if (entry.topic === Topics.Character && entry.speciesId) {
    // TODO
    markdown += `**Species:** ${entry.speciesId}\n\n`;
  }
  
  // locations and orgs have parents
  if ([Topics.Location, Topics.Organization].includes(entry.topic)) {
    const parentId = setting.getEntryHierarchy(entry.uuid)?.parentId;
    if (parentId) {
      markdown += `**Parent:** ${uuidToName(parentId)}\n\n`;
    }
  }

  // Description
  if (entry.description) {
    markdown += `**Description**: ${cleanText(entry.description)}\n\n`;
  }

  // Custom Fields
  for (const defn of customFieldDefinitions) {  
    if (!defn.deleted) {
      let value = entry.getCustomField(defn.name);

      if (value != null) {
        if (defn.fieldType === FieldType.Boolean)
          value = value ? 'Yes' : 'No';

        markdown += `**${defn.label}:** ${value}\n\n`;
      }
    }
  }

  // TODO - Relationships
  const relationships = await exportRelationships(entry);
  if (relationships) {
    markdown += `### Relationships\n\n${relationships}\n\n`;
  }

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
 * Exports relationships for an entry.
 * @param entry - The entry
 * @returns Formatted relationships markdown
 */
const exportRelationships = async (entry: Entry): Promise<string> => {
  let relationships = '';

  for (const [topicType, topicRelationships] of Object.entries(entry.relationships)) {
    if (Object.keys(topicRelationships).length > 0) {
      relationships += `**${localize(`topics.${topicType}`)}:**\n`;
      for (const [relatedId, relationship] of Object.entries(topicRelationships)) {
        const relatedEntry = await Entry.fromUuid(relatedId);
        if (relatedEntry) {
          relationships += `- ${relatedEntry.name}`;
          // RelatedEntryDetails might not have a description property, so we check safely
          const relDetails = relationship as any;
          if (relDetails.description) {
            relationships += ` - ${relDetails.description}`;
          }
          relationships += '\n';
        }
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

  markdown += `## ${localize('topics.campaigns')}\n\n`;

  for (const campaign of Object.values(setting.campaigns)) {
    markdown += await exportCampaign(campaign, 'a');
  }

  return markdown;
};

/**
 * Exports a single campaign with its fronts, arcs, and sessions.
 * @param campaign - The campaign to export
 * @param prefix - The prefix for the heading
 * @returns Markdown content for the campaign
 */
const exportCampaign = async (campaign: Campaign, prefix: string): Promise<string> => {
  let markdown = `${prefix}. **${campaign.name}**\n\n`;

  // Description
  if (campaign.description) {
    markdown += `### Description\n\n${cleanText(campaign.description)}\n\n`;
  }

  // Status
  markdown += `### Status\n\n${campaign.completed ? 'Completed' : 'Active'}\n\n`;

  // Fronts
  const fronts = await campaign.allFronts();
  if (fronts.length > 0) {
    markdown += `### (1) ${localize('topics.fronts')}\n\n`;
    for (const front of fronts) {
      markdown += await exportFront(front, '(a)');
    }
  }

  // Arcs
  const arcs = await Promise.all(
    campaign.arcIndex.map(arcIndex => Arc.fromUuid(arcIndex.uuid))
  );
  const validArcs = arcs.filter(arc => arc !== null) as Arc[];
  
  if (validArcs.length > 0) {
    markdown += `### (2) ${localize('topics.arcs')}\n\n`;
    for (const arc of validArcs) {
      markdown += await exportArc(arc, '(a)');
    }
  }

  return markdown;
};

/**
 * Exports a front with its dangers.
 * @param front - The front to export
 * @param prefix - The prefix for the heading
 * @returns Markdown content for the front
 */
const exportFront = async (front: Front, prefix: string): Promise<string> => {
  let markdown = `${prefix}. **${front.name}**\n\n`;

  // Description
  if (front.description) {
    markdown += `#### Description\n\n${cleanText(front.description)}\n\n`;
  }

  // Dangers
  if (front.dangers && front.dangers.length > 0) {
    markdown += `#### Dangers\n\n`;
    front.dangers.forEach((danger, index) => {
      markdown += `**${index + 1}. ${danger.name}**\n\n`;
      if (danger.description) {
        markdown += `${cleanText(danger.description)}\n\n`;
      }
      if (danger.impendingDoom) {
        markdown += `Impending Doom: ${danger.impendingDoom}\n\n`;
      }
      if (danger.motivation) {
        markdown += `Motivation: ${danger.motivation}\n\n`;
      }
    });
  }

  return markdown;
};

/**
 * Exports an arc with its sessions.
 * @param arc - The arc to export
 * @param prefix - The prefix for the heading
 * @returns Markdown content for the arc
 */
const exportArc = async (arc: Arc, prefix: string): Promise<string> => {
  let markdown = `${prefix}. **${arc.name}**\n\n`;

  // Session range
  markdown += `#### Session Range\n\n`;
  if (arc.startSessionNumber >= 0 && arc.endSessionNumber >= 0) {
    markdown += `Sessions ${arc.startSessionNumber} to ${arc.endSessionNumber}\n\n`;
  }

  // Ideas
  if (arc.ideas && arc.ideas.length > 0) {
    markdown += `#### Ideas\n\n`;
    arc.ideas.forEach(idea => {
      markdown += `- ${idea.text}\n`;
    });
    markdown += '\n';
  }

  // Sessions
  const campaign = await arc.loadCampaign();
  const sessions = await campaign.filterSessions(s => 
    s.number >= arc.startSessionNumber && s.number <= arc.endSessionNumber
  );
  
  if (sessions.length > 0) {
    markdown += `#### (i) ${localize('topics.sessions')}\n\n`;
    for (const session of sessions) {
      markdown += await exportSession(session, '(1)');
    }
  }

  return markdown;
};

/**
 * Exports a session with all its content.
 * @param session - The session to export
 * @param prefix - The prefix for the heading
 * @returns Markdown content for the session
 */
const exportSession = async (session: Session, prefix: string): Promise<string> => {
  let markdown = `${prefix}. **${session.name}**\n\n`;

  // Session number and date
  markdown += `#### Session Details\n\n`;
  markdown += `Number: ${session.number}\n\n`;
  if (session.date) {
    markdown += `Date: ${session.date.toLocaleDateString()}\n\n`;
  }

  // Description
  if (session.description) {
    markdown += `#### Description\n\n${cleanText(session.description)}\n\n`;
  }

  // Tags
  if (session.tags && session.tags.length > 0) {
    markdown += `#### Tags\n\n${session.tags.join(', ')}\n\n`;
  }

  // Locations
  if (session.locations && session.locations.length > 0) {
    markdown += `#### Locations\n\n`;
    for (const location of session.locations) {
      const entry = await Entry.fromUuid(location.uuid);
      if (entry) {
        markdown += `- **${entry.name}**`;
        if (location.delivered) {
          markdown += ' ✓';
        }
        if (location.notes) {
          markdown += ` - ${location.notes}`;
        }
        markdown += '\n';
      }
    }
    markdown += '\n';
  }

  // NPCs
  if (session.npcs && session.npcs.length > 0) {
    markdown += `#### NPCs\n\n`;
    for (const npc of session.npcs) {
      const entry = await Entry.fromUuid(npc.uuid);
      if (entry) {
        markdown += `- **${entry.name}**`;
        if (npc.delivered) {
          markdown += ' ✓';
        }
        if (npc.notes) {
          markdown += ` - ${npc.notes}`;
        }
        markdown += '\n';
      }
    }
    markdown += '\n';
  }

  // Monsters
  if (session.monsters && session.monsters.length > 0) {
    markdown += `#### Monsters\n\n`;
    for (const monster of session.monsters) {
      const docName = resolveFoundryDocumentName(monster.uuid);
      markdown += `- **${docName}**`;
      if (monster.number > 1) {
        markdown += ` x${monster.number}`;
      }
      if (monster.delivered) {
        markdown += ' ✓';
      }
      if (monster.notes) {
        markdown += ` - ${monster.notes}`;
      }
      markdown += '\n';
    }
    markdown += '\n';
  }

  // Items
  if (session.items && session.items.length > 0) {
    markdown += `#### Items\n\n`;
    for (const item of session.items) {
      const docName = resolveFoundryDocumentName(item.uuid);
      markdown += `- **${docName}**`;
      if (item.delivered) {
        markdown += ' ✓';
      }
      if (item.notes) {
        markdown += ` - ${item.notes}`;
      }
      markdown += '\n';
    }
    markdown += '\n';
  }

  // Lore
  if (session.lore && session.lore.length > 0) {
    markdown += `#### Lore\n\n`;
    for (const lore of session.lore) {
      markdown += `- **${lore.description}**`;
      if (lore.significant) {
        markdown += ' ⭐';
      }
      if (lore.delivered) {
        markdown += ' ✓';
      }
      markdown += '\n';
    }
    markdown += '\n';
  }

  // Vignettes
  if (session.vignettes && session.vignettes.length > 0) {
    markdown += `#### Vignettes\n\n`;
    for (const vignette of session.vignettes) {
      markdown += `- **${vignette.description}**`;
      if (vignette.delivered) {
        markdown += ' ✓';
      }
      markdown += '\n';
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
    const zipData = await createZipData(files);
    
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
 * Calculates CRC-32 checksum for data.
 * @param data - The data to calculate CRC-32 for
 * @returns The CRC-32 checksum
 */
const calculateCRC32 = (data: Uint8Array): number => {
  // CRC-32 table
  const crcTable = new Uint32Array(256);
  
  // Generate CRC-32 table
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    crcTable[i] = crc;
  }
  
  // Calculate CRC-32
  let crc = 0 ^ (-1);
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
  }
  
  return (crc ^ (-1)) >>> 0;
};

/**
 * Creates ZIP data from files using a simple ZIP implementation.
 * @param files - Array of files to include in the ZIP
 * @returns ZIP data as Uint8Array
 */
const createZipData = async (files: Array<{ name: string; content: Uint8Array }>): Promise<Uint8Array> => {
  const encoder = new TextEncoder();
  const zipChunks: Uint8Array[] = [];
  
  // Simple ZIP file format
  let centralDirectoryOffset = 0;
  let centralDirectory: Uint8Array[] = [];
  
  for (const file of files) {
    // Calculate CRC-32
    const crc32 = calculateCRC32(file.content);
    
    // File header
    const fileHeader = new Uint8Array(30 + file.name.length);
    const view = new DataView(fileHeader.buffer);
    
    // Local file header signature
    view.setUint32(0, 0x04034b50, true);
    
    // Version needed (20)
    view.setUint16(4, 20, true);
    
    // Flags (0)
    view.setUint16(6, 0, true);
    
    // Compression method (0 = stored)
    view.setUint16(8, 0, true);
    
    // Mod time and date (dummy values)
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    
    // CRC-32
    view.setUint32(14, crc32, true);
    
    // Compressed size
    view.setUint32(18, file.content.length, true);
    
    // Uncompressed size
    view.setUint32(22, file.content.length, true);
    
    // File name length
    view.setUint16(26, file.name.length, true);
    
    // Extra field length (0)
    view.setUint16(28, 0, true);
    
    // File name
    fileHeader.set(encoder.encode(file.name), 30);
    
    // Write file header and content
    zipChunks.push(fileHeader);
    zipChunks.push(file.content);
    
    // Central directory entry
    const cdEntry = new Uint8Array(46 + file.name.length);
    const cdView = new DataView(cdEntry.buffer);
    
    // Central directory signature
    cdView.setUint32(0, 0x02014b50, true);
    
    // Version made by (20)
    cdView.setUint16(4, 20, true);
    
    // Version needed (20)
    cdView.setUint16(6, 20, true);
    
    // Flags (0)
    cdView.setUint16(8, 0, true);
    
    // Compression method (0)
    cdView.setUint16(10, 0, true);
    
    // Mod time and date
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    
    // CRC-32
    cdView.setUint32(16, crc32, true);
    
    // Compressed size
    cdView.setUint32(20, file.content.length, true);
    
    // Uncompressed size
    cdView.setUint32(24, file.content.length, true);
    
    // File name length
    cdView.setUint16(28, file.name.length, true);
    
    // Extra field length (0)
    cdView.setUint16(30, 0, true);
    
    // Comment length (0)
    cdView.setUint16(32, 0, true);
    
    // Disk number start (0)
    cdView.setUint16(34, 0, true);
    
    // Internal file attributes (0)
    cdView.setUint16(36, 0, true);
    
    // External file attributes (0)
    cdView.setUint32(38, 0, true);
    
    // Relative offset of local header
    cdView.setUint32(42, centralDirectoryOffset, true);
    
    // File name
    cdEntry.set(encoder.encode(file.name), 46);
    
    centralDirectory.push(cdEntry);
    centralDirectoryOffset += fileHeader.length + file.content.length;
  }
  
  // Calculate central directory size and offset
  const centralDirectoryData = new Uint8Array(
    centralDirectory.reduce((acc, chunk) => acc + chunk.length, 0)
  );
  let offset = 0;
  for (const chunk of centralDirectory) {
    centralDirectoryData.set(chunk, offset);
    offset += chunk.length;
  }
  
  // End of central directory record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  
  // End of central dir signature
  eocdView.setUint32(0, 0x06054b50, true);
  
  // Number of this disk (0)
  eocdView.setUint16(4, 0, true);
  
  // Disk with start of central directory (0)
  eocdView.setUint16(6, 0, true);
  
  // Number of central directory records on this disk
  eocdView.setUint16(8, files.length, true);
  
  // Total number of central directory records
  eocdView.setUint16(10, files.length, true);
  
  // Size of central directory
  eocdView.setUint32(12, centralDirectoryData.length, true);
  
  // Offset of central directory
  eocdView.setUint32(16, centralDirectoryOffset, true);
  
  // Comment length (0)
  eocdView.setUint16(20, 0, true);
  
  // Combine all parts
  const totalSize = zipChunks.reduce((acc, chunk) => acc + chunk.length, 0) +
                   centralDirectoryData.length + eocd.length;
  
  const result = new Uint8Array(totalSize);
  offset = 0;
  
  for (const chunk of zipChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  result.set(centralDirectoryData, offset);
  offset += centralDirectoryData.length;
  
  result.set(eocd, offset);
  
  return result;
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
 * Resolves a FCB UUID to a readable name
 * @param uuid - The UUID to resolve
 * @returns The formatted name
 */
const uuidToName = async (uuid: string): Promise<string> => {
  // if we need better performance we could use the various indexes available
  // but for now...
  const content = await fromUuid(uuid);
  return content?.name || uuid;
};

/**
 * Resolves a Foundry document UUID to a readable name.
 * @param uuid - The UUID to resolve
 * @returns The formatted name
 */
const resolveFoundryDocumentName = (uuid: string): string => {
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
        return `[Foundry ${docType} - ${indexEntry.name}]`;
      }
    }

    if (typeof collection.get === 'function') {
      const doc = collection.get(id);
      if (doc?.name) {
        const docType = doc.documentName || 'Document';
        return `[Foundry ${docType} - ${doc.name}]`;
      }
    }

    return `[Foundry Document - ${uuid}]`;
  } catch {
    return `[Foundry Document - ${uuid}]`;
  }
};

/**
 * Cleans text content by removing UUID references and HTML.
 * @param text - The text to clean
 * @returns The cleaned text
 */
const cleanText = (text: string): string => {
  // Clean UUID references
  let cleaned = cleanUuidReferencesInText(text);
  
  // Basic HTML cleanup (you might want to use a more sophisticated HTML stripper)
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  return cleaned;
};

const SettingExportService = {
  exportSetting,
  exportSettingMarkdown,
  generateStoryWebPng
};

export default SettingExportService;
