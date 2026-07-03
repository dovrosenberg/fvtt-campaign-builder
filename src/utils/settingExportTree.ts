/**
 * Shared resolved-tree builder for setting exports.
 *
 * This module is the single source of truth for "what's in a setting export and how is it resolved."
 * It walks an FCBSetting end-to-end — loading campaigns, fetching every referenced Entry/Arc,
 * resolving Foundry document names, flattening hierarchies, scanning for external journal
 * references — and produces a fully-resolved plain JavaScript object tree.
 *
 * Both the markdown exporter (`settingExport.ts`) and the TOON exporter (`toonExport.ts`) consume
 * this tree; neither performs any async data lookups itself. That keeps the renderers thin and
 * ensures both formats always describe the same content.
 *
 * Text fields in the tree are pre-cleaned: HTML converted to markdown and inline `@UUID[...]`
 * references resolved to names via `cleanUuidReferencesInText`. The cleanText `topHeaderLevel`
 * arguments are chosen to match the current markdown exporter's output byte-for-byte.
 */

import { FCBSetting, Entry, Campaign, Arc, Front, Session } from '@/classes';
import {
  CustomFieldContentType,
  CustomFieldDescription,
  FieldType,
  RelatedJournal,
  Species,
  Topics
} from '@/types';
import { cleanUuidReferencesInText, resolveUuidNameSync } from '@/utils/clipboardUuidCleaner';
import { htmlToMarkdown } from '@/utils/sanitizeHtml';
import { ModuleSettings, SettingKey } from '@/settings';
import SettingScannerService, { ScanContext } from './settingScanner';
import { extractUUIDs } from './uuidExtraction';
import { isFCBUuid } from './importExportCommon';

////////////////////////////////////////////////////////////////////////////////
// Tree type declarations
////////////////////////////////////////////////////////////////////////////////

export type EntryTopic = Topics.Character | Topics.Location | Topics.Organization | Topics.PC;

// Canonical English labels used in the alphabetical name index. Stable regardless of user locale.
export const TOPIC_LABEL: Record<EntryTopic, string> = {
  [Topics.Character]: 'Character',
  [Topics.Location]: 'Location',
  [Topics.Organization]: 'Organization',
  [Topics.PC]: 'PC'
};

// Lowercased plural keys used as field names in `entries.<topic>` on the tree.
export const TOPIC_KEY: Record<EntryTopic, 'characters' | 'locations' | 'organizations' | 'pcs'> = {
  [Topics.Character]: 'characters',
  [Topics.Location]: 'locations',
  [Topics.Organization]: 'organizations',
  [Topics.PC]: 'pcs'
};

export const ENTRY_TOPICS: ReadonlyArray<EntryTopic> = [
  Topics.Character,
  Topics.Location,
  Topics.Organization,
  Topics.PC
];

// Single custom-field row. `value` carries the raw boolean for Boolean fields so each renderer
// can format it in its own dialect ("Yes"/"No" for markdown, true/false for TOON).
export type CustomFieldRow = {
  label: string;
  fieldType: FieldType;
  value: boolean | string;
};

export type SpeciesRow = {
  name: string;
  description: string;
};

export type SettingNode = {
  uuid: string;
  name: string;
  genre: string;            // trimmed; '' when blank
  feeling: string;          // trimmed; '' when blank
  description: string;      // cleanText(text, 3); '' when blank
  customFields: CustomFieldRow[];
  species: SpeciesRow[];    // empty array when none
};

export type IndexRow = {
  name: string;
  topic: string;            // English label from TOPIC_LABEL
  type: string;
  uuid: string;
};

export type RelationshipRow = {
  uuid: string;
  name: string;
  type: string;
  note: string;             // cleanText at 5; '' when blank
};

export type RelationshipGroup = {
  topic: EntryTopic;
  rows: RelationshipRow[];
};

export type EntryNode = {
  uuid: string;
  topic: EntryTopic;
  name: string;
  type: string;             // trimmed; '' when blank
  species: string;          // resolved species name; '' when not applicable
  parentUuid: string;       // '' when no parent
  parentName: string;       // '' when no parent
  description: string;      // cleanText at 3; '' when blank
  customFields: CustomFieldRow[];
  relationships: RelationshipGroup[];
};

export type DescRow = { description: string };

export type PCRow = {
  uuid: string;
  name: string;
  player: string;
};

export type TodoRow = {
  date: string;             // toLocaleDateString()
  reference: string;        // linkedText or ''
  text: string;             // cleanText at 4
};

export type DangerParticipantRow = {
  uuid: string;
  name: string;             // resolveUuidNameSync
  role: string;             // cleanText at 5; '' when blank
};

export type GrimPortentRow = {
  complete: boolean;
  description: string;      // cleanText at 5; always non-empty (empties filtered upstream)
};

export type DangerNode = {
  name: string;
  description: string;      // cleanText() default level; '' when blank
  impendingDoom: string;    // trimmed; '' when blank
  motivation: string;       // cleanText at 5; '' when blank
  participants: DangerParticipantRow[];
  grimPortents: GrimPortentRow[];
};

export type FrontNode = {
  uuid: string;
  name: string;
  description: string;      // cleanText; '' when blank
  customFields: CustomFieldRow[];
  dangers: DangerNode[];
};

export type ResolvedDocRow = {
  uuid: string;
  name: string;             // resolveFoundryDocumentName(uuid, true)
  notes: string;            // cleanText at 5
};

export type LocationRow = {
  uuid: string;
  name: string;
  type: string;
  parent: string;           // parent name; '' when no parent
  notes: string;            // cleanText at 5
};

export type ParticipantRow = {
  uuid: string;
  name: string;
  type: string;
  notes: string;            // cleanText at 5
};

export type SessionLoreRow = { used: boolean; significant: boolean; description: string };
export type SessionVignetteRow = { used: boolean; description: string };
export type SessionLocationRow = {
  used: boolean;
  uuid: string;
  name: string;
  type: string;
  parent: string;
  notes: string;
};
export type SessionNPCRow = {
  used: boolean;
  uuid: string;
  name: string;
  type: string;
  notes: string;
};
export type SessionMonsterRow = {
  used: boolean;
  uuid: string;
  name: string;
  number: number;
  notes: string;
};
export type SessionItemRow = {
  used: boolean;
  uuid: string;
  name: string;
  notes: string;
};

export type SessionNode = {
  uuid: string;
  name: string;
  number: number;
  date: string;             // toLocaleDateString() or ''
  notes: string;            // cleanText at 5 of description; '' when blank
  customFields: CustomFieldRow[];
  lore: SessionLoreRow[];
  vignettes: SessionVignetteRow[];
  locations: SessionLocationRow[];
  npcs: SessionNPCRow[];
  monsters: SessionMonsterRow[];
  items: SessionItemRow[];
};

export type ArcNode = {
  uuid: string;
  name: string;
  description: string;      // cleanText at 5; '' when blank
  customFields: CustomFieldRow[];
  vignettes: DescRow[];     // cleanText at 5; non-empty rows only
  locations: LocationRow[];
  participants: ParticipantRow[];
  monsters: ResolvedDocRow[];
  magicItems: ResolvedDocRow[];
  lore: DescRow[];          // cleanText at 5; non-empty rows only
  ideas: DescRow[];         // cleanText at 5; non-empty rows only
  sessions: SessionNode[];
};

export type CampaignNode = {
  uuid: string;
  name: string;
  description: string;      // cleanText at 3; '' when blank
  customFields: CustomFieldRow[];
  pcs: PCRow[];
  undeliveredLore: DescRow[]; // cleanText at 4
  ideas: DescRow[];           // cleanText at 4
  todos: TodoRow[] | null;    // null when the To-Do feature is disabled globally
  fronts: FrontNode[] | null; // null when the Fronts feature is disabled globally
  arcs: ArcNode[];
};

export type JournalPageNode = {
  uuid: string;
  name: string;
  type: string;             // 'text' | 'image' | 'pdf' | 'video' | other
  text: string;             // cleanText at 5 for text pages; '' otherwise
  src: string;              // '' when not applicable
  caption: string;          // '' when not applicable
  videoSettings: string[];  // subset of ['autoplay','loop','controls']; [] when not a video
};

export type JournalNode = {
  uuid: string;
  name: string;
  found: boolean;           // false when the journal couldn't be loaded
  pages: JournalPageNode[];
};

export type SettingTree = {
  setting: SettingNode;
  index: IndexRow[];        // alphabetized, case-insensitive, numeric collation
  entries: {
    characters: EntryNode[];
    locations: EntryNode[];
    organizations: EntryNode[];
    pcs: EntryNode[];
  };
  campaigns: CampaignNode[];  // completed campaigns are filtered out
  referencedJournals: JournalNode[]; // sorted by UUID
};

////////////////////////////////////////////////////////////////////////////////
// Internal text helpers (previously exported from settingExport.ts)
////////////////////////////////////////////////////////////////////////////////

/**
 * Cleans text by resolving inline `@UUID[...]` references to names and converting HTML to markdown.
 * @param text - Raw text to clean.
 * @param topHeaderLevel - Header level to use when converting HTML headers.
 * @returns Cleaned text (trimmed).
 */
export const cleanText = (text: string, topHeaderLevel: number = 1): string => {
  // Resolve UUID references first so the resolved names appear correctly in the markdown output.
  const resolved = cleanUuidReferencesInText(text);
  return htmlToMarkdown(resolved, topHeaderLevel).trim();
};

/**
 * Resolves a Foundry document UUID (typically Actor or Item) to a readable name.
 * @param uuid - The document UUID to resolve.
 * @param basic - When true, return just the name; otherwise decorate with `[Foundry <Type> - name]`.
 * @returns The resolved name, or a placeholder when resolution fails.
 */
export const resolveFoundryDocumentName = (uuid: string, basic: boolean = false): string => {
  try {
    const parsed = foundry.utils.parseUuid(uuid);
    if (!parsed) {
      return uuid;
    }

    const collection = parsed.collection as any;
    const id = parsed.id as string;

    // Prefer the lightweight index when available to avoid pulling the full document.
    if (collection.index) {
      const indexEntry = collection.index.get(id);
      if (indexEntry?.name) {
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

////////////////////////////////////////////////////////////////////////////////
// Internal journal-reference scanner
////////////////////////////////////////////////////////////////////////////////

/**
 * Extracts external Foundry JournalEntry/JournalEntryPage UUID references from a single raw text
 * blob and accumulates them into the journal map (journal UUID -> set of specific page UUIDs; an
 * empty set means "include all pages"). Exported so callers with a narrower scan scope than the
 * whole setting (e.g. AI generation context) can reuse the reference parsing.
 * @param text - Raw text (HTML) possibly containing `@UUID[...]` references.
 * @param journalMap - Map to accumulate journal references into.
 */
export const collectJournalRefsFromText = (text: string, journalMap: Map<string, Set<string>>): void => {
  if (!text) {
    return;
  }
  const uuids = extractUUIDs(text);
  for (const uuid of uuids) {
    if (isFCBUuid(uuid)) {
      continue;
    }
    const parsed = foundry.utils.parseUuid(uuid);
    if (!parsed) {
      continue;
    }
    const docType = parsed.type as string;
    if (docType === 'JournalEntry') {
      // Whole-journal reference overrides any per-page references.
      journalMap.set(uuid, new Set());
    }
    else if (docType === 'JournalEntryPage') {
      // Reconstruct the parent journal UUID and add the specific page, unless the whole
      // journal is already being exported (empty set).
      const parts = uuid.split('.');
      const pageIdIndex = parts.lastIndexOf('JournalEntryPage');
      if (pageIdIndex <= 0) {
        continue;
      }
      let journalUuid: string;
      if (parts[0] === 'Compendium') {
        const journalIdIndex = parts.lastIndexOf('JournalEntry');
        if (journalIdIndex > 0 && journalIdIndex < pageIdIndex) {
          journalUuid = parts.slice(0, journalIdIndex + 2).join('.');
        }
        else {
          continue;
        }
      }
      else {
        journalUuid = parts.slice(0, 2).join('.');
      }
      if (!journalMap.has(journalUuid)) {
        journalMap.set(journalUuid, new Set([uuid]));
      }
      else {
        const existing = journalMap.get(journalUuid)!;
        if (existing.size > 0) {
          existing.add(uuid);
        }
      }
    }
  }
};

/**
 * Scans every text field in the setting for external Foundry JournalEntry/JournalEntryPage UUID
 * references and returns a map of journal UUID -> set of specific page UUIDs. An empty set for a
 * journal means "include all pages" (the whole journal was referenced directly).
 * @param setting - Setting to scan.
 * @returns Map of referenced journal UUIDs.
 */
const collectReferencedJournalUuids = async (setting: FCBSetting): Promise<Map<string, Set<string>>> => {
  const journalMap = new Map<string, Set<string>>();

  // Callback fed to SettingScannerService to inspect every text field in the setting.
  const processText = (text: string, _context: ScanContext): void => {
    collectJournalRefsFromText(text, journalMap);
  };

  await SettingScannerService.scanSettingContent(setting, processText);
  await collectJournalUuidsFromArrays(setting, journalMap);
  return journalMap;
};

/**
 * Collects Journal UUIDs from the `journals` arrays on entries/campaigns/arcs. These are explicit
 * journal links stored separately from free-text references.
 * @param setting - Setting to scan.
 * @param journalMap - Map to accumulate journal references into.
 */
const collectJournalUuidsFromArrays = async (
  setting: FCBSetting,
  journalMap: Map<string, Set<string>>
): Promise<void> => {
  for (const topic of ENTRY_TOPICS) {
    const entries = await setting.topicFolders[topic].allEntries();
    for (const entry of entries) {
      processRelatedJournals(entry.journals, journalMap);
    }
  }

  for (const campaign of Object.values(setting.campaigns)) {
    if (!campaign) {
      continue;
    }
    processRelatedJournals(campaign.journals, journalMap);

    for (const arcIndex of campaign.arcIndex) {
      const arc = await Arc.fromUuid(arcIndex.uuid);
      if (arc) {
        processRelatedJournals(arc.journals, journalMap);
      }
    }
  }
};

/**
 * Adds RelatedJournal entries (explicit journal link objects) into the journal map.
 * @param journals - RelatedJournal array from a content document.
 * @param journalMap - Map to accumulate references into.
 */
export const processRelatedJournals = (
  journals: RelatedJournal[],
  journalMap: Map<string, Set<string>>
): void => {
  for (const journal of journals) {
    if (!journal.journalUuid || isFCBUuid(journal.journalUuid)) {
      continue;
    }
    if (journal.pageUuid && !isFCBUuid(journal.pageUuid)) {
      if (!journalMap.has(journal.journalUuid)) {
        journalMap.set(journal.journalUuid, new Set([journal.pageUuid]));
      }
      else {
        const existing = journalMap.get(journal.journalUuid)!;
        if (existing.size > 0) {
          existing.add(journal.pageUuid);
        }
      }
    }
    else {
      // Whole journal referenced; override any per-page references.
      journalMap.set(journal.journalUuid, new Set());
    }
  }
};

////////////////////////////////////////////////////////////////////////////////
// Public tree builder
////////////////////////////////////////////////////////////////////////////////

/**
 * Resolves a full SettingTree for the given setting. All async document lookups happen inside
 * this function; the returned tree contains only plain data that sync renderers can consume.
 * Assumes `setting.loadCampaigns()` has not necessarily been called yet — does it itself.
 * @param setting - Setting to serialize.
 * @returns Fully-resolved setting tree.
 */
export const buildSettingTree = async (setting: FCBSetting): Promise<SettingTree> => {
  await setting.loadCampaigns();

  const customFieldDefinitions = ModuleSettings.get(SettingKey.customFields);
  const speciesList = ModuleSettings.get(SettingKey.speciesList);
  const validSpecies = speciesList.reduce((acc, s: Species) => {
    acc[s.id] = s.name;
    return acc;
  }, {} as Record<string, string>);

  const settingNode = buildSettingNode(
    setting,
    customFieldDefinitions[CustomFieldContentType.Setting] || [],
    speciesList
  );

  // Collect entries per topic, building the alphabetical index in parallel.
  const characters: EntryNode[] = [];
  const locations: EntryNode[] = [];
  const organizations: EntryNode[] = [];
  const pcs: EntryNode[] = [];
  const indexRows: IndexRow[] = [];
  const topicBuckets: Record<EntryTopic, EntryNode[]> = {
    [Topics.Character]: characters,
    [Topics.Location]: locations,
    [Topics.Organization]: organizations,
    [Topics.PC]: pcs
  };

  for (const topic of ENTRY_TOPICS) {
    const contentType =
      topic === Topics.Character ? CustomFieldContentType.Character :
      topic === Topics.Location ? CustomFieldContentType.Location :
      topic === Topics.Organization ? CustomFieldContentType.Organization :
      CustomFieldContentType.PC;
    const fields = customFieldDefinitions[contentType] || [];
    const entries = await setting.topicFolders[topic].allEntries();
    for (const entry of entries) {
      const node = buildEntryNode(entry, setting, validSpecies, fields);
      topicBuckets[topic].push(node);
      indexRows.push({
        name: entry.name,
        topic: TOPIC_LABEL[topic],
        type: node.type,
        uuid: entry.uuid
      });
    }
  }

  // Alphabetize case-insensitively with numeric collation (so "King Henry IV" sorts naturally).
  indexRows.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  );

  // Build active (non-completed) campaigns.
  const campaignFields = customFieldDefinitions[CustomFieldContentType.Campaign] || [];
  const frontFields = customFieldDefinitions[CustomFieldContentType.Front] || [];
  const arcFields = customFieldDefinitions[CustomFieldContentType.Arc] || [];
  const sessionFields = customFieldDefinitions[CustomFieldContentType.Session] || [];

  const campaigns: CampaignNode[] = [];
  for (const campaign of Object.values(setting.campaigns)) {
    if (campaign.completed) {
      continue;
    }
    campaigns.push(
      await buildCampaignNode(campaign, setting, campaignFields, frontFields, arcFields, sessionFields)
    );
  }

  const referencedJournals = await buildJournalNodes(setting);

  return {
    setting: settingNode,
    index: indexRows,
    entries: { characters, locations, organizations, pcs },
    campaigns,
    referencedJournals
  };
};

////////////////////////////////////////////////////////////////////////////////
// Node builders
////////////////////////////////////////////////////////////////////////////////

/**
 * Builds the root SettingNode.
 * @param setting - Source setting.
 * @param settingFields - Custom field definitions for the Setting content type.
 * @param speciesList - Global species list.
 * @returns SettingNode.
 */
export const buildSettingNode = (
  setting: FCBSetting,
  settingFields: CustomFieldDescription[],
  speciesList: Species[]
): SettingNode => ({
  uuid: setting.uuid,
  name: setting.name,
  genre: setting.genre.trim(),
  feeling: setting.settingFeeling.trim(),
  description: setting.description.trim() ? cleanText(setting.description, 3) : '',
  customFields: buildCustomFieldRows(setting, settingFields),
  species: speciesList.map(s => ({
    name: s.name.trim(),
    description: cleanText(s.description, 3)
  }))
});

/**
 * Extracts custom field rows for any document exposing `getCustomField`. Values are normalized
 * per field type: Booleans kept as booleans; Text/Select trimmed; Editor values cleaned at level 4.
 * Fields with null/undefined values (or empty strings for text-like fields) are omitted.
 * @param content - Document exposing getCustomField.
 * @param defs - Custom field definitions for that content type.
 * @returns Array of rows for non-empty fields.
 */
export const buildCustomFieldRows = (
  content: { getCustomField: (name: string) => unknown },
  defs: CustomFieldDescription[]
): CustomFieldRow[] => {
  const rows: CustomFieldRow[] = [];
  for (const def of defs) {
    if (def.deleted) {
      continue;
    }
    const value = content.getCustomField(def.name);
    if (value == null) {
      continue;
    }
    switch (def.fieldType) {
      case FieldType.Boolean:
        rows.push({ label: def.label, fieldType: def.fieldType, value: !!value });
        break;
      case FieldType.Select:
      case FieldType.Text: {
        const s = String(value).trim();
        if (s) {
          rows.push({ label: def.label, fieldType: def.fieldType, value: s });
        }
        break;
      }
      case FieldType.Editor: {
        const s = String(value);
        if (s.trim()) {
          rows.push({ label: def.label, fieldType: def.fieldType, value: cleanText(s, 4) });
        }
        break;
      }
      default:
        continue;
    }
  }
  return rows;
};

/**
 * Builds an EntryNode for a single entry, including hierarchy parent resolution, species name
 * lookup (for Characters), and relationship grouping.
 * @param entry - Source entry.
 * @param setting - Enclosing setting (needed for hierarchy lookup).
 * @param validSpecies - Species id -> display name.
 * @param customFieldDefinitions - Custom field definitions for this entry's topic.
 * @returns EntryNode.
 */
export const buildEntryNode = (
  entry: Entry,
  setting: FCBSetting,
  validSpecies: Record<string, string>,
  customFieldDefinitions: CustomFieldDescription[]
): EntryNode => {
  // Hierarchy parent resolution (only meaningful for Locations and Organizations).
  let parentUuid = '';
  let parentName = '';
  if (entry.topic === Topics.Location || entry.topic === Topics.Organization) {
    const resolved = setting.getEntryHierarchy(entry.uuid)?.parentId;
    if (resolved) {
      parentUuid = resolved;
      parentName = resolveUuidNameSync(resolved);
    }
  }

  // Species is Character-only and only when it resolves to a known species.
  const species =
    entry.topic === Topics.Character && entry.speciesId && validSpecies[entry.speciesId]
      ? validSpecies[entry.speciesId]
      : '';

  return {
    uuid: entry.uuid,
    topic: entry.topic as EntryTopic,
    name: entry.name,
    type: entry.type?.trim() || '',
    species,
    parentUuid,
    parentName,
    description: entry.description?.trim() ? cleanText(entry.description, 3) : '',
    customFields: buildCustomFieldRows(entry, customFieldDefinitions),
    relationships: buildRelationshipGroups(entry)
  };
};

/**
 * Builds the list of RelationshipGroup for an entry. Each group corresponds to a related-topic
 * and carries every relationship row (uuid, name, type, note).
 * @param entry - Source entry.
 * @returns Groups for topics that have at least one relationship; empty array otherwise.
 */
const buildRelationshipGroups = (entry: Entry): RelationshipGroup[] => {
  const groups: RelationshipGroup[] = [];
  for (const [topicStr, topicRelationships] of Object.entries(entry.relationships)) {
    const topicNum = Number(topicStr) as EntryTopic;
    if (!TOPIC_LABEL[topicNum]) {
      continue;
    }
    const data = Object.values(topicRelationships);
    if (data.length === 0) {
      continue;
    }
    const rows: RelationshipRow[] = data.map(rel => {
      // extraFields is keyed by topic pair; `relationship` only exists for some pairs.
      const extras = rel.extraFields as { relationship?: string } | undefined;
      const note = extras?.relationship?.trim() ? cleanText(extras.relationship, 5) : '';
      return {
        uuid: rel.uuid,
        name: rel.name?.trim() || '',
        type: rel.type?.trim() || '',
        note
      };
    });
    groups.push({ topic: topicNum, rows });
  }
  return groups;
};

/**
 * Builds a CampaignNode with its PCs, lore, ideas, todos, fronts, and arcs (which in turn carry sessions).
 * @param campaign - Source campaign.
 * @param setting - Enclosing setting.
 * @param campaignFields - Campaign custom fields.
 * @param frontFields - Front custom fields.
 * @param arcFields - Arc custom fields.
 * @param sessionFields - Session custom fields.
 * @param options - Optional flags; `includeArcs: false` skips arc/session resolution entirely (arcs come back empty).
 * @returns CampaignNode.
 */
export const buildCampaignNode = async (
  campaign: Campaign,
  setting: FCBSetting,
  campaignFields: CustomFieldDescription[],
  frontFields: CustomFieldDescription[],
  arcFields: CustomFieldDescription[],
  sessionFields: CustomFieldDescription[],
  options: { includeArcs?: boolean } = {}
): Promise<CampaignNode> => {
  // PCs: resolve each PC's Entry so we have name/player alongside uuid.
  const pcRows: PCRow[] = [];
  if (campaign.pcs && campaign.pcs.length > 0) {
    for (const pc of campaign.pcs) {
      if (!pc.actorId) {
        continue;
      }
      const entry = await Entry.fromUuid(pc.uuid);
      if (entry && entry.name) {
        pcRows.push({ uuid: pc.uuid, name: entry.name, player: entry.playerName || '' });
      }
    }
  }

  // Lore: only undelivered (matches markdown export behavior).
  const undeliveredLore: DescRow[] = (campaign.lore || [])
    .filter(l => !l.delivered)
    .map(l => ({ description: cleanText(l.description, 4) }));

  const ideas: DescRow[] = (campaign.ideas || []).map(i => ({ description: cleanText(i.text, 4) }));

  // Todos: feature-gated. null when disabled; empty array when enabled but no items exist.
  const todos: TodoRow[] | null = ModuleSettings.get(SettingKey.enableToDoList)
    ? (campaign.toDoItems || []).map(t => ({
        date: new Date(t.lastTouched).toLocaleDateString(),
        reference: t.linkedText || '',
        text: cleanText(t.text, 4)
      }))
    : null;

  // Fronts: feature-gated in the same way.
  let fronts: FrontNode[] | null = null;
  if (ModuleSettings.get(SettingKey.useFronts)) {
    const loaded = await campaign.allFronts();
    fronts = loaded.map(f => buildFrontNode(f, frontFields));
  }

  // Arcs with sessions (loaded from the campaign's arcIndex). Skipped when the caller only
  // needs the campaign-level data (e.g. AI generation context, which selects arcs itself).
  const arcs: ArcNode[] = [];
  if (options.includeArcs !== false) {
    const arcResults = await Promise.all(campaign.arcIndex.map(a => Arc.fromUuid(a.uuid)));
    const validArcs = arcResults.filter((a): a is Arc => a !== null);
    for (const arc of validArcs) {
      arcs.push(await buildArcNode(arc, setting, arcFields, sessionFields));
    }
  }

  return {
    uuid: campaign.uuid,
    name: campaign.name,
    description: campaign.description?.trim() ? cleanText(campaign.description, 3) : '',
    customFields: buildCustomFieldRows(campaign, campaignFields),
    pcs: pcRows,
    undeliveredLore,
    ideas,
    todos,
    fronts,
    arcs
  };
};

/**
 * Builds a FrontNode with its dangers. Danger data is fully resolved here: participant names
 * are looked up via resolveUuidNameSync, and empty-description grim portents are filtered out.
 * @param front - Source front.
 * @param frontFields - Front custom field definitions.
 * @returns FrontNode.
 */
export const buildFrontNode = (front: Front, frontFields: CustomFieldDescription[]): FrontNode => {
  const dangers: DangerNode[] = (front.dangers || []).map(danger => {
    const participants: DangerParticipantRow[] = (danger.participants || []).map(p => ({
      uuid: p.uuid,
      name: resolveUuidNameSync(p.uuid),
      role: p.role?.trim() ? cleanText(p.role, 5) : ''
    }));

    const grimPortents: GrimPortentRow[] = [];
    for (const portent of danger.grimPortents || []) {
      const desc = cleanText(portent.description, 5);
      if (!desc) {
        continue;
      }
      grimPortents.push({ complete: !!portent.complete, description: desc });
    }

    return {
      name: danger.name,
      description: danger.description?.trim() ? cleanText(danger.description) : '',
      impendingDoom: danger.impendingDoom?.trim() || '',
      motivation: danger.motivation?.trim() ? cleanText(danger.motivation.trim(), 5) : '',
      participants,
      grimPortents
    };
  });

  return {
    uuid: front.uuid,
    name: front.name,
    description: front.description?.trim() ? cleanText(front.description) : '',
    customFields: buildCustomFieldRows(front, frontFields),
    dangers
  };
};

/**
 * Builds an ArcNode with its resolved locations, participants, monsters, items, lore, ideas,
 * and in-range sessions.
 * @param arc - Source arc.
 * @param setting - Enclosing setting (for hierarchy parent lookups).
 * @param arcFields - Arc custom fields.
 * @param sessionFields - Session custom fields.
 * @returns ArcNode.
 */
export const buildArcNode = async (
  arc: Arc,
  setting: FCBSetting,
  arcFields: CustomFieldDescription[],
  sessionFields: CustomFieldDescription[]
): Promise<ArcNode> => {
  // Vignettes filtered to non-empty descriptions.
  const vignettes: DescRow[] = [];
  for (const v of arc.vignettes || []) {
    const desc = cleanText(v.description, 5);
    if (!desc) {
      continue;
    }
    vignettes.push({ description: desc });
  }

  // Locations resolved via Entry.fromUuid; missing entries are skipped to match current behavior.
  const locations: LocationRow[] = [];
  for (const location of arc.locations || []) {
    const entry = await Entry.fromUuid(location.uuid);
    if (!entry) {
      continue;
    }
    const parentId = setting?.getEntryHierarchy(entry.uuid)?.parentId;
    locations.push({
      uuid: entry.uuid,
      name: entry.name,
      type: entry.type || '',
      parent: parentId ? resolveUuidNameSync(parentId) : '',
      notes: cleanText(location.notes, 5)
    });
  }

  const participants: ParticipantRow[] = [];
  for (const p of arc.participants || []) {
    const entry = await Entry.fromUuid(p.uuid);
    if (!entry) {
      continue;
    }
    participants.push({
      uuid: entry.uuid,
      name: entry.name,
      type: entry.type || '',
      notes: cleanText(p.notes, 5)
    });
  }

  const monsters: ResolvedDocRow[] = [];
  for (const m of arc.monsters || []) {
    const name = resolveFoundryDocumentName(m.uuid, true);
    if (!name) {
      continue;
    }
    monsters.push({ uuid: m.uuid, name, notes: cleanText(m.notes, 5) });
  }

  const magicItems: ResolvedDocRow[] = [];
  for (const it of arc.items || []) {
    const name = resolveFoundryDocumentName(it.uuid, true);
    if (!name) {
      continue;
    }
    magicItems.push({ uuid: it.uuid, name, notes: cleanText(it.notes, 5) });
  }

  const lore: DescRow[] = [];
  for (const l of arc.lore || []) {
    const desc = cleanText(l.description, 5);
    if (!desc) {
      continue;
    }
    lore.push({ description: desc });
  }

  const ideas: DescRow[] = [];
  for (const i of arc.ideas || []) {
    const desc = cleanText(i.text, 5);
    if (!desc) {
      continue;
    }
    ideas.push({ description: desc });
  }

  // Sessions within this arc's session-number range.
  const campaign = await arc.loadCampaign();
  const inRange = await campaign.filterSessions(s =>
    s.number >= arc.startSessionNumber && s.number <= arc.endSessionNumber
  );
  const sessions: SessionNode[] = [];
  for (const session of inRange) {
    sessions.push(await buildSessionNode(session, setting, sessionFields));
  }

  return {
    uuid: arc.uuid,
    name: arc.name,
    description: arc.description?.trim() ? cleanText(arc.description, 5) : '',
    customFields: buildCustomFieldRows(arc, arcFields),
    vignettes,
    locations,
    participants,
    monsters,
    magicItems,
    lore,
    ideas,
    sessions
  };
};

/**
 * Builds a SessionNode with all its tabular sub-blocks.
 * @param session - Source session.
 * @param setting - Enclosing setting (for hierarchy parent lookups).
 * @param sessionFields - Session custom fields.
 * @returns SessionNode.
 */
export const buildSessionNode = async (
  session: Session,
  setting: FCBSetting,
  sessionFields: CustomFieldDescription[]
): Promise<SessionNode> => {
  // Lore: filter empty-description rows.
  const lore: SessionLoreRow[] = [];
  for (const l of session.lore || []) {
    const desc = cleanText(l.description, 5);
    if (!desc) {
      continue;
    }
    lore.push({ used: !!l.delivered, significant: !!l.significant, description: desc });
  }

  // Vignettes: filter empty-description rows.
  const vignettes: SessionVignetteRow[] = [];
  for (const v of session.vignettes || []) {
    const desc = cleanText(v.description, 5);
    if (!desc) {
      continue;
    }
    vignettes.push({ used: !!v.delivered, description: desc });
  }

  // Locations: Entry.fromUuid + hierarchy parent.
  const locations: SessionLocationRow[] = [];
  for (const loc of session.locations || []) {
    const entry = await Entry.fromUuid(loc.uuid);
    if (!entry || !entry.uuid) {
      continue;
    }
    const parentId = setting?.getEntryHierarchy(entry.uuid)?.parentId;
    locations.push({
      used: !!loc.delivered,
      uuid: entry.uuid,
      name: entry.name,
      type: entry.type || '',
      parent: parentId ? resolveUuidNameSync(parentId) : '',
      notes: cleanText(loc.notes, 5)
    });
  }

  const npcs: SessionNPCRow[] = [];
  for (const npc of session.npcs || []) {
    const entry = await Entry.fromUuid(npc.uuid);
    if (!entry) {
      continue;
    }
    npcs.push({
      used: !!npc.delivered,
      uuid: entry.uuid,
      name: entry.name,
      type: entry.type || '',
      notes: cleanText(npc.notes, 5)
    });
  }

  const monsters: SessionMonsterRow[] = [];
  for (const m of session.monsters || []) {
    const name = resolveFoundryDocumentName(m.uuid, true);
    if (!name) {
      continue;
    }
    monsters.push({
      used: !!m.delivered,
      uuid: m.uuid,
      name,
      number: m.number,
      notes: cleanText(m.notes, 5)
    });
  }

  const items: SessionItemRow[] = [];
  for (const it of session.items || []) {
    const name = resolveFoundryDocumentName(it.uuid, true);
    if (!name) {
      continue;
    }
    items.push({
      used: !!it.delivered,
      uuid: it.uuid,
      name,
      notes: cleanText(it.notes, 5)
    });
  }

  return {
    uuid: session.uuid,
    name: session.name,
    number: session.number,
    date: session.date ? session.date.toLocaleDateString() : '',
    notes: session.description?.trim() ? cleanText(session.description, 5) : '',
    customFields: buildCustomFieldRows(session, sessionFields),
    lore,
    vignettes,
    locations,
    npcs,
    monsters,
    items
  };
};

/**
 * Builds the referencedJournals array: collects external JournalEntry references from the setting,
 * loads each journal with its pages, and flattens to nodes.
 * @param setting - Setting to scan.
 * @returns Array of JournalNode sorted by journal UUID (deterministic output).
 */
const buildJournalNodes = async (setting: FCBSetting): Promise<JournalNode[]> => {
  const journalMap = await collectReferencedJournalUuids(setting);
  return buildJournalNodesFromMap(journalMap);
};

/**
 * Loads each journal in the map (with the referenced pages, or all pages when the set is empty)
 * and flattens to JournalNodes. Exported so callers with a narrower journal scope than the whole
 * setting (e.g. AI generation context) can reuse the loading/flattening logic.
 * @param journalMap - Map of journal UUID -> set of page UUIDs (empty set = all pages).
 * @returns Array of JournalNode sorted by journal UUID (deterministic output).
 */
export const buildJournalNodesFromMap = async (journalMap: Map<string, Set<string>>): Promise<JournalNode[]> => {
  const sortedEntries = Array.from(journalMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const nodes: JournalNode[] = [];
  for (const [journalUuid, pageUuids] of sortedEntries) {
    try {
      const journal = await foundry.utils.fromUuid<JournalEntry>(journalUuid);
      if (!journal) {
        nodes.push({ uuid: journalUuid, name: journalUuid, found: false, pages: [] });
        continue;
      }
      const pagesToExport = pageUuids.size > 0
        ? journal.pages.contents.filter(p => pageUuids.has(p.uuid))
        : journal.pages.contents;
      nodes.push({
        uuid: journalUuid,
        name: journal.name,
        found: true,
        pages: pagesToExport.map(p => renderJournalPageNode(p))
      });
    }
    catch (error) {
      console.error(`Error loading journal ${journalUuid}:`, error);
      nodes.push({ uuid: journalUuid, name: journalUuid, found: false, pages: [] });
    }
  }
  return nodes;
};

/**
 * Builds a JournalPageNode carrying the raw page metadata. For text pages the cleaned body lives
 * in `text`; image/pdf/video pages populate `src`, `caption`, and `videoSettings` as applicable.
 * Each renderer decides how to present the page from this metadata.
 * @param page - Source journal page.
 * @returns JournalPageNode.
 */
const renderJournalPageNode = (page: JournalEntryPage): JournalPageNode => {
  const node: JournalPageNode = {
    uuid: page.uuid,
    name: page.name,
    type: page.type,
    text: '',
    src: '',
    caption: '',
    videoSettings: []
  };

  switch (page.type) {
    case 'text':
      node.text = page.text?.content ? cleanText(page.text.content, 5) : '';
      return node;
    case 'image':
      node.src = page.src || '';
      node.caption = page.image?.caption || '';
      return node;
    case 'pdf':
      node.src = page.src || '';
      return node;
    case 'video':
      node.src = page.src || '';
      if (page.video?.autoplay) {
        node.videoSettings.push('autoplay');
      }
      if (page.video?.loop) {
        node.videoSettings.push('loop');
      }
      if (page.video?.controls) {
        node.videoSettings.push('controls');
      }
      return node;
    default:
      return node;
  }
};
