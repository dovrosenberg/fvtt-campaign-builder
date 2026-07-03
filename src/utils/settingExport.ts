/**
 * Service for exporting entire settings to markdown files, with an optional zip containing
 * accompanying story web PNGs.
 *
 * The markdown content is produced by walking a pre-resolved `SettingTree` built by
 * `settingExportTree.ts`. All async document lookups and text-cleaning live there; this module
 * is a synchronous markdown renderer + the browser-download/zip wrapper + the story-web PNG
 * generation path that is also consumed externally by `storyWebGeneration.ts`.
 */

import { FCBSetting } from '@/classes';
import { FieldType } from '@/types';
import { localize } from '@/utils/game';
import ZipFileService from '@/utils/zipFiles';
import { downloadFile, downloadBlob } from '@/utils/fileDownload';
import { ModuleSettings, SettingKey } from '@/settings';
import { notifyError, notifyInfo } from './notifications';
import {
  buildSettingTree,
  SettingTree,
  SettingNode,
  EntryNode,
  CampaignNode,
  FrontNode,
  DangerNode,
  ArcNode,
  SessionNode,
  JournalNode,
  JournalPageNode,
  CustomFieldRow,
  RelationshipGroup,
  TOPIC_KEY,
  ENTRY_TOPICS
} from './settingExportTree';

////////////////////////////////////////////////////////////////////////////////
// Public API
////////////////////////////////////////////////////////////////////////////////

/**
 * Exports an entire setting to a markdown file bundled with story web PNG images in a zip archive.
 * @param settingId - The UUID of the setting to export.
 */
const exportSetting = async (settingId: string): Promise<void> => {
  try {
    const setting = await FCBSetting.fromUuid(settingId);
    if (!setting) {
      throw new Error('Setting not found');
    }

    notifyInfo(localize('notifications.export.starting'));

    const tree = await buildSettingTree(setting);
    const markdownContent = renderMarkdown(tree);

    // Story webs are orthogonal to the markdown content; still loaded/rendered separately.
    console.log('Loading campaigns for story web export...');
    await setting.loadCampaigns();
    console.log('Campaigns loaded:', Object.keys(setting.campaigns).length);
    const storyWebImages = await exportStoryWebs(setting);
    console.log(`Total story web images to include: ${storyWebImages.length}`);

    await createAndDownloadZip(setting, markdownContent, storyWebImages);

    notifyInfo(localize('notifications.export.complete'));
  } catch (error) {
    console.error('Error exporting setting:', error);
    notifyError(localize('notifications.export.failed'));
  }
};

/**
 * Exports an entire setting to a markdown file only (no story webs, no zip).
 * @param settingId - The UUID of the setting to export.
 */
const exportSettingMarkdown = async (settingId: string): Promise<void> => {
  try {
    const setting = await FCBSetting.fromUuid(settingId);
    if (!setting) {
      throw new Error('Setting not found');
    }

    notifyInfo(localize('notifications.export.starting'));

    const tree = await buildSettingTree(setting);
    const markdownContent = renderMarkdown(tree);

    const filename = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    downloadFile(markdownContent, filename, 'text/markdown');

    notifyInfo(localize('notifications.export.complete'));
  } catch (error) {
    console.error('Error exporting setting markdown:', error);
    notifyError(localize('notifications.export.failed'));
  }
};

////////////////////////////////////////////////////////////////////////////////
// Markdown renderer (synchronous; operates purely on the resolved tree)
////////////////////////////////////////////////////////////////////////////////

/**
 * Renders a SettingTree as a markdown string. Header levels and whitespace match the behavior of
 * the pre-refactor exporter byte-for-byte.
 * @param tree - Resolved setting tree.
 * @returns Markdown text.
 */
const renderMarkdown = (tree: SettingTree): string => {
  let md = `# ${tree.setting.name}\n\n`;
  md += renderSettingOverview(tree.setting);
  md += renderEntriesByTopic(tree);
  md += renderCampaigns(tree.campaigns);
  md += renderReferencedJournals(tree.referencedJournals);
  return md;
};

/**
 * Renders the Setting overview (genre, feeling, description, custom fields, species list).
 * @param setting - Setting node.
 * @returns Markdown fragment.
 */
const renderSettingOverview = (setting: SettingNode): string => {
  let md = `## Overview\n`;

  if (setting.genre) {
    md += `**Genre:** ${setting.genre}\n\n`;
  }
  if (setting.feeling) {
    md += `**Setting Feeling:** ${setting.feeling}\n\n`;
  }
  if (setting.description) {
    md += `**Description:**\n\n${setting.description}\n\n`;
  }

  md += renderCustomFields(setting.customFields);

  if (setting.species.length > 0) {
    md += `## Setting Species\n`;
    for (const species of setting.species) {
      md += `**${species.name}:**\n\n${species.description}\n\n`;
    }
  }

  return md;
};

/**
 * Renders the four topic sections (Characters, Locations, Organizations, PCs). Sections with no
 * entries are omitted entirely (including the ## header).
 * @param tree - Full tree.
 * @returns Markdown fragment.
 */
const renderEntriesByTopic = (tree: SettingTree): string => {
  let md = '';

  // Present topics in the canonical order (Character → Location → Organization → PC) using the
  // localized header labels from the i18n bundle.
  const topicHeaders: Record<string, string> = {
    characters: localize('topics.characters'),
    locations: localize('topics.locations'),
    organizations: localize('topics.organizations'),
    pcs: localize('topics.pcs')
  };

  for (const topic of ENTRY_TOPICS) {
    const key = TOPIC_KEY[topic];
    const list = tree.entries[key];
    if (list.length === 0) {
      continue;
    }
    md += `## ${topicHeaders[key]}\n`;
    for (const entry of list) {
      md += renderEntry(entry);
    }
  }

  return md;
};

/**
 * Renders a single entry's markdown block.
 * @param entry - Entry node.
 * @returns Markdown fragment.
 */
const renderEntry = (entry: EntryNode): string => {
  let md = `### ${entry.name}\n`;

  if (entry.type) {
    md += `**Type:** ${entry.type}\n\n`;
  }
  if (entry.species) {
    md += `**Species:** ${entry.species}\n\n`;
  }
  if (entry.parentName) {
    md += `**Parent:** ${entry.parentName}\n\n`;
  }
  if (entry.isBranch && entry.locationParentName) {
    md += `**Location:** ${entry.locationParentName}\n\n`;
  }
  if (entry.description) {
    md += `**Description:**\n\n${entry.description}\n\n`;
  }
  md += renderCustomFields(entry.customFields);
  md += renderRelationships(entry.relationships);

  return md;
};

/**
 * Renders custom fields in the same `**Label:** value` style the original exporter used.
 * Boolean values are "Yes"/"No"; Editor values render as a paragraph under the label.
 * @param rows - Custom field rows.
 * @returns Markdown fragment.
 */
const renderCustomFields = (rows: CustomFieldRow[]): string => {
  let md = '';
  for (const row of rows) {
    switch (row.fieldType) {
      case FieldType.Boolean:
        md += `**${row.label}:** ${row.value ? 'Yes' : 'No'}\n\n`;
        break;
      case FieldType.Select:
      case FieldType.Text:
        md += `**${row.label}:** ${row.value}\n\n`;
        break;
      case FieldType.Editor:
        md += `**${row.label}:**\n\n${row.value}\n\n`;
        break;
      default:
        break;
    }
  }
  return md;
};

/**
 * Renders relationships grouped by related-topic.
 * @param groups - Relationship groups.
 * @returns Markdown fragment.
 */
const renderRelationships = (groups: RelationshipGroup[]): string => {
  let md = '';
  for (const group of groups) {
    md += `#### ${localize(`export.relatedTopics.${group.topic}`)}\n`;
    for (const rel of group.rows) {
      md += `- ${rel.name}`;
      if (rel.type) {
        md += ` (${rel.type})`;
      }
      if (rel.note) {
        md += ` - ${rel.note}`;
      }
      md += '\n';
    }
    md += '\n';
  }
  return md;
};

/**
 * Renders all active campaigns.
 * @param campaigns - Active campaign nodes.
 * @returns Markdown fragment.
 */
const renderCampaigns = (campaigns: CampaignNode[]): string => {
  let md = '';
  for (const campaign of campaigns) {
    md += renderCampaign(campaign);
  }
  return md;
};

/**
 * Renders one campaign with its PCs, lore, ideas, todos, fronts, and arcs.
 * @param campaign - Campaign node.
 * @returns Markdown fragment.
 */
const renderCampaign = (campaign: CampaignNode): string => {
  let md = `## Campaign: ${campaign.name}\n`;

  if (campaign.description) {
    md += `**Description:**\n\n${campaign.description}\n\n`;
  }
  md += renderCustomFields(campaign.customFields);

  if (campaign.pcs.length > 0) {
    md += `### PCs\n`;
    for (const pc of campaign.pcs) {
      md += `- ${pc.name} (player name: ${pc.player})\n`;
    }
    md += '\n';
  }

  if (campaign.undeliveredLore.length > 0) {
    md += `### Not-yet-delivered Lore\n`;
    md += `| Lore         |\n`;
    md += `|--------------|\n`;
    for (const lore of campaign.undeliveredLore) {
      md += `| ${lore.description} |\n`;
    }
    md += '\n';
  }

  if (campaign.ideas.length > 0) {
    md += `### Ideas\n`;
    for (const idea of campaign.ideas) {
      md += `- ${idea.description}\n`;
    }
    md += '\n';
  }

  // Todos is null when the feature flag is off; empty array means flag on but no items.
  if (campaign.todos && campaign.todos.length > 0) {
    md += `### To-Do Items\n`;
    md += `| Date | Reference | To Do |\n`;
    md += `|------|-----------|-------|\n`;
    for (const t of campaign.todos) {
      md += `| ${t.date} | ${t.reference} | ${t.text} |\n`;
    }
    md += '\n';
  }

  if (campaign.fronts) {
    for (const front of campaign.fronts) {
      md += renderFront(front);
    }
  }

  for (const arc of campaign.arcs) {
    md += renderArc(arc);
  }

  return md;
};

/**
 * Renders one front with its dangers.
 * @param front - Front node.
 * @returns Markdown fragment.
 */
const renderFront = (front: FrontNode): string => {
  let md = `### Front: ${front.name}\n`;

  if (front.description) {
    md += `#### Description\n${front.description}\n\n`;
  }
  md += renderCustomFields(front.customFields);

  for (const danger of front.dangers) {
    md += renderDanger(danger);
  }

  return md;
};

/**
 * Renders one danger (within a front).
 * @param danger - Danger node.
 * @returns Markdown fragment.
 */
const renderDanger = (danger: DangerNode): string => {
  let md = `#### Danger: ${danger.name}\n`;

  if (danger.description) {
    md += `${danger.description}\n\n`;
  }
  if (danger.impendingDoom) {
    md += `**Impending Doom:** ${danger.impendingDoom}\n\n`;
  }
  if (danger.motivation) {
    md += `**Motivation:** ${danger.motivation}\n\n`;
  }

  if (danger.participants.length > 0) {
    md += `**Participants:**\n\n`;
    for (const p of danger.participants) {
      md += `- ${p.name} ${p.role ? `(Role: ${p.role})` : ''}\n`;
    }
    md += '\n';
  }

  if (danger.grimPortents.length > 0) {
    md += `**Grim Portents:**\n\n`;
    md += `| Complete | Description |\n`;
    md += `|-------------|----------|\n`;
    for (const portent of danger.grimPortents) {
      md += `| ${portent.complete ? '✓' : ''} | ${portent.description} |\n`;
    }
    md += '\n';
  }

  return md;
};

/**
 * Renders one arc with its sub-tables and sessions.
 * @param arc - Arc node.
 * @returns Markdown fragment.
 */
const renderArc = (arc: ArcNode): string => {
  let md = `### Arc: ${arc.name}\n`;

  if (arc.description) {
    md += `**Description:**\n\n${arc.description}\n\n`;
  }
  md += renderCustomFields(arc.customFields);

  if (arc.vignettes.length > 0) {
    md += `#### Vignettes\n`;
    md += `| Description |\n`;
    md += `|-------------|\n`;
    for (const v of arc.vignettes) {
      md += `| ${v.description} |\n`;
    }
    md += '\n';
  }

  if (arc.locations.length > 0) {
    md += `#### Locations\n`;
    md += `| Name | Type | Parent | Notes |\n`;
    md += `|------|------|--------|-------|\n`;
    for (const loc of arc.locations) {
      md += `| ${loc.name} | ${loc.type} | ${loc.parent} | ${loc.notes} |\n`;
    }
    md += '\n';
  }

  if (arc.participants.length > 0) {
    md += `#### Participants\n`;
    md += `| Name | Type | Notes |\n`;
    md += `|------|------|-------|\n`;
    for (const p of arc.participants) {
      md += `| ${p.name} | ${p.type} | ${p.notes} |\n`;
    }
    md += '\n';
  }

  if (arc.monsters.length > 0) {
    md += `#### Monsters\n`;
    md += `| Name | Notes |\n`;
    md += `|------|-------|\n`;
    for (const m of arc.monsters) {
      md += `| ${m.name} | ${m.notes} |\n`;
    }
    md += '\n';
  }

  if (arc.magicItems.length > 0) {
    md += `#### Magic Items\n`;
    md += `| Name | Notes |\n`;
    md += `|------|-------|\n`;
    for (const it of arc.magicItems) {
      md += `| ${it.name} | ${it.notes} |\n`;
    }
    md += '\n';
  }

  if (arc.lore.length > 0) {
    md += `#### Lore\n`;
    md += `| Description |\n`;
    md += `|-------------|\n`;
    for (const l of arc.lore) {
      md += `| ${l.description} |\n`;
    }
    md += '\n';
  }

  if (arc.ideas.length > 0) {
    md += `#### Ideas\n`;
    md += `| Description |\n`;
    md += `|-------------|\n`;
    for (const i of arc.ideas) {
      md += `| ${i.description} |\n`;
    }
    md += '\n';
  }

  for (const session of arc.sessions) {
    md += renderSession(session);
  }

  return md;
};

/**
 * Renders one session with all its tabular sub-blocks.
 * @param session - Session node.
 * @returns Markdown fragment.
 */
const renderSession = (session: SessionNode): string => {
  let md = `#### Session: ${session.name}\n`;

  md += `**Session Number:** ${session.number}\n\n`;
  if (session.date) {
    md += `**Session Date:** ${session.date}\n\n`;
  }
  if (session.notes) {
    md += `**Notes:**\n\n${session.notes}\n\n`;
  }
  md += renderCustomFields(session.customFields);

  if (session.lore.length > 0) {
    md += `#### Lore\n`;
    md += `| Used | Significant | Description |\n`;
    md += `|------|-------------|-------------|\n`;
    for (const l of session.lore) {
      md += `| ${l.used ? '✓' : ''} | ${l.significant ? '✓' : ''} | ${l.description} |\n`;
    }
    md += '\n';
  }

  if (session.vignettes.length > 0) {
    md += `#### Vignettes\n`;
    md += `| Used | Description |\n`;
    md += `|------|-------------|\n`;
    for (const v of session.vignettes) {
      md += `| ${v.used ? '✓' : ''} | ${v.description} |\n`;
    }
    md += '\n';
  }

  if (session.locations.length > 0) {
    md += `#### Locations\n`;
    md += `| Used | Name | Type | Parent | Notes |\n`;
    md += `|------|------|------|--------|-------|\n`;
    for (const loc of session.locations) {
      md += `| ${loc.used ? '✓' : ''} | ${loc.name} | ${loc.type} | ${loc.parent} | ${loc.notes} |\n`;
    }
    md += '\n';
  }

  if (session.npcs.length > 0) {
    md += `#### NPCs\n`;
    md += `| Used | Name | Type | Notes |\n`;
    md += `|------|------|------|-------|\n`;
    for (const npc of session.npcs) {
      md += `| ${npc.used ? '✓' : ''} | ${npc.name} | ${npc.type} | ${npc.notes} |\n`;
    }
    md += '\n';
  }

  if (session.monsters.length > 0) {
    md += `#### Monsters\n`;
    md += `| Used | Name | Number | Notes |\n`;
    md += `|------|------|--------|-------|\n`;
    for (const m of session.monsters) {
      md += `| ${m.used ? '✓' : ''} | ${m.name} | ${m.number} | ${m.notes} |\n`;
    }
    md += '\n';
  }

  if (session.items.length > 0) {
    md += `#### Items\n`;
    md += `| Used | Name | Notes |\n`;
    md += `|------|------|-------|\n`;
    for (const it of session.items) {
      md += `| ${it.used ? '✓' : ''} | ${it.name} | ${it.notes} |\n`;
    }
    md += '\n';
  }

  return md;
};

/**
 * Renders the "Referenced Journal Entries" section listing every external Foundry journal.
 * @param journals - Journal nodes (already sorted by UUID in the tree).
 * @returns Markdown fragment.
 */
const renderReferencedJournals = (journals: JournalNode[]): string => {
  if (journals.length === 0) {
    return '';
  }

  let md = `## Referenced Journal Entries\n\n`;
  md += `*The following journal entries are referenced in the setting content.*\n\n`;

  for (const j of journals) {
    if (!j.found) {
      md += `### [Journal not found: ${j.uuid}]\n\n`;
      continue;
    }
    md += `### ${j.name}\n\n`;
    if (j.pages.length === 0) {
      md += `*[No pages]*\n\n`;
      continue;
    }
    for (const page of j.pages) {
      md += renderJournalPage(page);
    }
  }

  return md;
};

/**
 * Renders one journal page, dispatching on page type.
 * @param page - Journal page node.
 * @returns Markdown fragment.
 */
const renderJournalPage = (page: JournalPageNode): string => {
  let md = `#### ${page.name}\n\n`;

  switch (page.type) {
    case 'text':
      if (page.text) {
        md += `${page.text}\n\n`;
      }
      return md;
    case 'image':
      md += `*[Image page]*\n`;
      if (page.src) {
        md += `**Source:** ${page.src}\n\n`;
      }
      if (page.caption) {
        md += `**Caption:** ${page.caption}\n\n`;
      }
      return md;
    case 'pdf':
      md += `*[PDF page]*\n`;
      if (page.src) {
        md += `**Source:** ${page.src}\n\n`;
      }
      return md;
    case 'video':
      md += `*[Video page]*\n`;
      if (page.src) {
        md += `**Source:** ${page.src}\n\n`;
      }
      if (page.videoSettings.length > 0) {
        md += `**Settings:** ${page.videoSettings.join(', ')}\n\n`;
      }
      return md;
    default:
      md += `*[${page.type} page]*\n\n`;
      return md;
  }
};

////////////////////////////////////////////////////////////////////////////////
// Story web PNG generation + zip assembly (unchanged from prior implementation)
////////////////////////////////////////////////////////////////////////////////

/**
 * Generates a PNG blob rendering of a story web. Consumed externally by storyWebGeneration.ts.
 * @param storyWeb - The story web to render.
 * @returns PNG blob.
 */
const generateStoryWebPng = async (storyWeb: any): Promise<Blob> => {
  // Generate network data
  const { nodes, edges } = await storyWeb.generateNetworkData(true);

  // Create off-screen container.
  // I've been unable to get the container to size dynamically; it should only be an issue for very
  // large webs, though, since it will fit and then you can zoom in.
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '2000px';
  container.style.height = '1500px';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  // Import vis-network dynamically.
  const { Network } = await import('vis-network');

  const network = new Network(container, { nodes, edges }, {
    physics: false,
    interaction: {
      hover: false,
      tooltipDelay: 0
    }
  });

  // Since physics is disabled the network should be ready immediately, but wait a beat for rendering.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 1000);
  });

  const networkCanvas = (network as any).canvas?.frame?.canvas ||
    (container.querySelector('canvas') as HTMLCanvasElement);

  if (!networkCanvas) {
    document.body.removeChild(container);
    network.destroy();
    throw new Error('Could not find network canvas for story web export');
  }

  // Create a canvas matching the network canvas dimensions.
  const canvas = document.createElement('canvas');
  canvas.width = networkCanvas.width || 2000;
  canvas.height = networkCanvas.height || 1500;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    document.body.removeChild(container);
    network.destroy();
    throw new Error('Could not get canvas context for story web export');
  }

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(networkCanvas, 0, 0);

  const pngData = await new Promise<Blob>((resolve) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        resolve(new Blob()); // Empty blob as fallback
      }
    }, 'image/png');
  });

  document.body.removeChild(container);
  network.destroy();

  return pngData;
};

/**
 * Exports every story web in a setting as a PNG image.
 * @param setting - The setting to render story webs for.
 * @returns Array of { name, data } tuples.
 */
const exportStoryWebs = async (setting: FCBSetting): Promise<Array<{ name: string; data: Blob }>> => {
  if (!ModuleSettings.get(SettingKey.useStoryWebs)) {
    return [];
  }

  const storyWebImages: Array<{ name: string; data: Blob }> = [];
  console.log('Starting story web export for setting:', setting.name);

  for (const campaign of Object.values(setting.campaigns)) {
    const storyWebs = await campaign.allStoryWebs();
    console.log(`Found ${storyWebs.length} story webs in campaign: ${campaign.name}`);

    for (const storyWeb of storyWebs) {
      try {
        console.log(`Exporting story web: ${storyWeb.name}`);

        const pngData = await generateStoryWebPng(storyWeb);

        if (pngData.size > 0) {
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
 * Builds a zip archive containing the markdown file and story web PNGs, and triggers a download.
 * Falls back to downloading files individually if zip creation fails.
 * @param setting - Source setting (used for the archive filename).
 * @param markdownContent - Markdown content to include as the main file.
 * @param storyWebImages - Story web PNG blobs to include.
 */
const createAndDownloadZip = async (
  setting: FCBSetting,
  markdownContent: string,
  storyWebImages: Array<{ name: string; data: Blob }>
): Promise<void> => {
  try {
    const encoder = new TextEncoder();
    const files: Array<{ name: string; content: Uint8Array }> = [];

    const markdownFileName = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    files.push({
      name: markdownFileName,
      content: encoder.encode(markdownContent)
    });

    for (const image of storyWebImages) {
      const arrayBuffer = await image.data.arrayBuffer();
      files.push({
        name: image.name,
        content: new Uint8Array(arrayBuffer)
      });
    }

    const zipData = await ZipFileService.createZipData(files);

    const filename = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
    downloadFile(zipData, filename, 'application/zip');

  } catch (error) {
    console.error('Error creating zip file:', error);
    // Fallback: download files separately.
    await downloadFilesSeparately(setting, markdownContent, storyWebImages);
  }
};

/**
 * Fallback path used when zip creation fails: downloads the markdown file and each image separately.
 * @param setting - Source setting.
 * @param markdownContent - Markdown content to download.
 * @param storyWebImages - Story web PNG blobs to download individually.
 */
const downloadFilesSeparately = async (
  setting: FCBSetting,
  markdownContent: string,
  storyWebImages: Array<{ name: string; data: Blob }>
): Promise<void> => {
  const markdownFilename = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  downloadFile(markdownContent, markdownFilename, 'text/markdown');

  for (let i = 0; i < storyWebImages.length; i++) {
    const image = storyWebImages[i];
    // Stagger downloads slightly to avoid popup-blocker heuristics.
    setTimeout(() => {
      downloadBlob(image.data, image.name);
    }, i * 100);
  }
};

////////////////////////////////////////////////////////////////////////////////
// Service export
////////////////////////////////////////////////////////////////////////////////

const SettingExportService = {
  exportSetting,
  exportSettingMarkdown,
  generateStoryWebPng
};

export default SettingExportService;
