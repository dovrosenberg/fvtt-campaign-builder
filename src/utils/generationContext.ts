/**
 * Service for building the TOON-encoded context snippet sent to the AI text-generation backend.
 *
 * The snippet mirrors the setting export tree (`settingExportTree.ts`) but is heavily filtered to
 * control token cost: no upfront index, no setting genre/feeling (sent as separate API fields),
 * and only the nodes relevant to the primary entity being generated for. The primary entity's
 * node is flagged with `primaryEntity: true` so the backend can target it.
 *
 * Inclusion rules (see the per-type assemblers below):
 *   - Any included entry pulls its full ancestor chain (Location/Organization hierarchy).
 *   - Only the primary entry's relationships are expanded into included entries (1 degree).
 *   - FCB entry UUIDs referenced in the primary entity's raw text fields are included (1 degree).
 *   - Sessions included as context bring their linked locations/NPCs (as full entries) along.
 *   - Referenced Foundry journals are included only when the module setting enables it.
 */

import { encode, type JsonValue } from '@toon-format/toon';

import { Entry, Campaign, Session, Arc, Front, FCBSetting } from '@/classes';
import {
  CustomFieldContentType,
  CustomFieldDescription,
  FieldType,
  RelatedJournal,
  Species,
  Topics
} from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';
import {
  ArcNode,
  CampaignNode,
  EntryNode,
  EntryTopic,
  FrontNode,
  JournalNode,
  ResolvedDocRow,
  SessionItemRow,
  SessionMonsterRow,
  SessionNode,
  SettingNode,
  buildArcNode,
  buildCampaignNode,
  buildEntryNode,
  buildFrontNode,
  buildJournalNodesFromMap,
  buildSessionNode,
  buildSettingNode,
  cleanText,
  collectJournalRefsFromText,
  processRelatedJournals
} from './settingExportTree';
import { toonReplacer } from './toonExport';
import { extractUUIDs } from './uuidExtraction';
import { isFCBUuid } from './importExportCommon';

////////////////////////////////////////////////////////////////////////////////
// Context tree types
////////////////////////////////////////////////////////////////////////////////

/** Node with an optional primary-entity flag; the flag sits right after `uuid` in output. */
type Primary<T> = T & { primaryEntity?: boolean };

export type ContextSettingNode = Primary<Omit<SettingNode, 'genre' | 'feeling'>>;

export type ContextEntryNode = Primary<EntryNode>;

/** Monster/item rows enriched with a description resolved from the Foundry document. */
export type ContextMonsterRow = SessionMonsterRow & { description: string };
export type ContextItemRow = SessionItemRow & { description: string };
export type ContextDocRow = ResolvedDocRow & { description: string };

export type ContextSessionNode = Primary<Omit<SessionNode, 'date' | 'monsters' | 'items'>> & {
  monsters: ContextMonsterRow[];
  items: ContextItemRow[];
};

/**
 * Arc node in the context tree. A full node (arc primary) carries all ArcNode fields; a shell
 * (used to situate context sessions) carries only uuid/name/description plus its sessions.
 */
export type ContextArcNode = Primary<Partial<Omit<ArcNode, 'sessions' | 'monsters' | 'magicItems'>>> & {
  uuid: string;
  name: string;
  description: string;
  monsters?: ContextDocRow[];
  magicItems?: ContextDocRow[];
  sessions: ContextSessionNode[];
};

export type ContextFrontNode = Primary<FrontNode>;

export type ContextCampaignNode = Primary<Omit<CampaignNode, 'arcs' | 'fronts'>> & {
  fronts: ContextFrontNode[] | null;
  arcs: ContextArcNode[];
  sessions: ContextSessionNode[];   // sessions that don't fall inside any arc's range
};

export type GenerationContextTree = {
  setting: ContextSettingNode;
  entries: {
    characters: ContextEntryNode[];
    locations: ContextEntryNode[];
    organizations: ContextEntryNode[];
    pcs: ContextEntryNode[];
  };
  campaigns: ContextCampaignNode[];
  referencedJournals: JournalNode[];   // empty (and therefore omitted from TOON) when disabled
};

/** Any document that can be the primary entity of a generation request. */
export type PrimaryEntity = Entry | Campaign | Session | Arc | Front | FCBSetting;

/**
 * The field currently being generated. It is excluded from the primary entity's node in the
 * snippet — otherwise the model tends to just reproduce the existing value.
 * - builtIn: a document field like 'description' (mapped to the node's property).
 * - custom: a custom field (name identifies the stored field; label identifies its snippet row).
 */
export type ExcludedField =
  | { kind: 'builtIn'; key: string }
  | { kind: 'custom'; name: string; label: string };

////////////////////////////////////////////////////////////////////////////////
// Internal build state
////////////////////////////////////////////////////////////////////////////////

// Everything the assemblers need, threaded through as a single object.
type BuildContext = {
  setting: FCBSetting;
  fieldDefs: Record<CustomFieldContentType, CustomFieldDescription[]>;
  validSpecies: Record<string, string>;
  sessionCount: number;
  includeJournals: boolean;
  entryNodes: Map<string, ContextEntryNode>;
  journalMap: Map<string, Set<string>>;
  excludeField?: ExcludedField;
};

/** Custom-field content type per entry topic (mirrors buildSettingTree's mapping).
 */
const TOPIC_TO_CONTENT_TYPE: Record<EntryTopic, CustomFieldContentType> = {
  [Topics.Character]: CustomFieldContentType.Character,
  [Topics.Location]: CustomFieldContentType.Location,
  [Topics.Organization]: CustomFieldContentType.Organization,
  [Topics.PC]: CustomFieldContentType.PC
};

// Known per-system paths where Foundry Actor/Item documents keep their description text.
const DOC_DESCRIPTION_PATHS = [
  'system.details.biography.value',
  'system.details.biography.public',
  'system.description.value',
  'system.details.description.value',
  'system.notes',
  'system.description'
];

/**
 * Returns the custom field definitions for a content type (empty array when none configured).
 * @param context - Build context.
 * @param contentType - Content type to look up.
 * @returns Custom field definitions.
 */
const fieldsFor = (context: BuildContext, contentType: CustomFieldContentType): CustomFieldDescription[] =>
  context.fieldDefs[contentType] || [];

/**
 * Rebuilds a node so `primaryEntity: true` lands immediately after `uuid` (TOON emits keys in
 * insertion order), and strips the field currently being generated from the node — sending the
 * existing value makes the model reproduce it instead of writing fresh content.
 * @param node - Node to flag.
 * @param context - Build context (carries the excluded field, if any).
 * @returns The same node data with the primary flag inserted and the generated field removed.
 */
const markPrimary = <T extends { uuid: string }>(node: T, context: BuildContext): T => {
  const { uuid, ...rest } = node;
  const marked: Record<string, unknown> = { uuid, primaryEntity: true, ...rest };

  if (context.excludeField?.kind === 'builtIn') {
    // Blank the matching node property; session nodes carry their description as `notes`.
    const key = context.excludeField.key;
    if (typeof marked[key] === 'string') {
      marked[key] = '';
    }
    else if (key === 'description' && typeof marked.notes === 'string') {
      marked.notes = '';
    }
  }
  else if (context.excludeField?.kind === 'custom' && Array.isArray(marked.customFields)) {
    const label = context.excludeField.label;
    marked.customFields = (marked.customFields as { label: string }[]).filter(row => row.label !== label);
  }

  return marked as unknown as T;
};

/**
 * Resolves a human-readable description from an arbitrary Foundry Actor/Item document by probing
 * a list of known per-system paths. Tolerant by design: any failure returns ''.
 * @param uuid - UUID of the Foundry document.
 * @returns Cleaned description text, or '' when none could be resolved.
 */
const getFoundryDocDescription = async (uuid: string): Promise<string> => {
  try {
    const doc = await foundry.utils.fromUuid(uuid);
    if (!doc) {
      return '';
    }
    for (const path of DOC_DESCRIPTION_PATHS) {
      const value = foundry.utils.getProperty(doc, path);
      if (typeof value === 'string' && value.trim()) {
        return cleanText(value, 5);
      }
    }
    return '';
  } catch {
    return '';
  }
};

/**
 * Adds an entry (and its full ancestor chain) to the collected entry nodes. Non-entry UUIDs and
 * entries that fail to load are silently skipped. Already-collected entries are not rebuilt.
 * @param uuid - UUID of the entry to add.
 * @param context - Build context.
 * @returns The collected node, or null when the UUID doesn't resolve to an entry.
 */
const addEntryWithAncestors = async (uuid: string, context: BuildContext): Promise<ContextEntryNode | null> => {
  const existing = context.entryNodes.get(uuid);
  if (existing) {
    return existing;
  }

  const entry = await Entry.fromUuid(uuid);
  if (!entry) {
    return null;
  }

  const topic = entry.topic as EntryTopic;
  if (!TOPIC_TO_CONTENT_TYPE[topic]) {
    return null;
  }

  // Branches (an organization's presence in a location) store their values under the Branch
  // custom-field definitions, not the Organization ones.
  const fieldContentType = topic === Topics.Organization && entry.isBranch
    ? CustomFieldContentType.Branch
    : TOPIC_TO_CONTENT_TYPE[topic];

  const node: ContextEntryNode = buildEntryNode(entry, context.setting, context.validSpecies, fieldsFor(context, fieldContentType));
  context.entryNodes.set(uuid, node);

  // Pull in the full ancestor chain (only Locations/Organizations have hierarchies).
  const ancestors = context.setting.getEntryHierarchy(uuid)?.ancestors || [];
  for (const ancestorUuid of ancestors) {
    await addEntryWithAncestors(ancestorUuid, context);
  }

  // A branch's location (and that location's ancestors) is essential context for the branch.
  if (node.locationParentUuid) {
    await addEntryWithAncestors(node.locationParentUuid, context);
  }

  return node;
};

/**
 * Returns the raw HTML values of Editor-type custom fields configured for a content type.
 * @param content - Document exposing getCustomField.
 * @param contentType - Content type whose field definitions apply.
 * @param context - Build context.
 * @returns Non-empty raw field values.
 */
const editorCustomFieldTexts = (
  content: { getCustomField: (name: string) => unknown },
  contentType: CustomFieldContentType,
  context: BuildContext
): string[] =>
  fieldsFor(context, contentType)
    .filter(def => !def.deleted && def.fieldType === FieldType.Editor)
    // the field being generated is excluded from scanning — its value is about to be replaced
    .filter(def => !(context.excludeField?.kind === 'custom' && context.excludeField.name === def.name))
    .map(def => String(content.getCustomField(def.name) ?? ''))
    .filter(text => text.trim() !== '');

/**
 * Collects every raw (pre-cleanText) text field of the primary entity. These are scanned for
 * `@UUID[...]` references — entry references get included as context, journal references feed
 * the journal map when journal inclusion is enabled.
 * @param primary - The primary entity.
 * @param contentType - Its custom-field content type.
 * @param context - Build context.
 * @returns Raw text blobs.
 */
const collectRawTextFields = (primary: PrimaryEntity, contentType: CustomFieldContentType, context: BuildContext): string[] => {
  const texts: string[] = [...editorCustomFieldTexts(primary, contentType, context)];

  // the built-in field being generated is excluded from scanning — its value is about to be replaced
  const descriptionExcluded = context.excludeField?.kind === 'builtIn' && context.excludeField.key === 'description';

  if (primary instanceof Entry) {
    if (!descriptionExcluded) {
      texts.push(primary.description || '');
    }
  }
  else if (primary instanceof Session) {
    if (!descriptionExcluded) {
      texts.push(primary.description || '');
    }
    texts.push(...(primary.lore || []).map(l => l.description || ''));
    texts.push(...(primary.vignettes || []).map(v => v.description || ''));
    texts.push(...(primary.locations || []).map(l => l.notes || ''));
    texts.push(...(primary.npcs || []).map(n => n.notes || ''));
    texts.push(...(primary.monsters || []).map(m => m.notes || ''));
    texts.push(...(primary.items || []).map(i => i.notes || ''));
  }
  else if (primary instanceof Arc) {
    if (!descriptionExcluded) {
      texts.push(primary.description || '');
    }
    texts.push(...(primary.lore || []).map(l => l.description || ''));
    texts.push(...(primary.vignettes || []).map(v => v.description || ''));
    texts.push(...(primary.ideas || []).map(i => i.text || ''));
    texts.push(...(primary.locations || []).map(l => l.notes || ''));
    texts.push(...(primary.participants || []).map(p => p.notes || ''));
    texts.push(...(primary.monsters || []).map(m => m.notes || ''));
    texts.push(...(primary.items || []).map(i => i.notes || ''));
  }
  else if (primary instanceof Campaign) {
    if (!descriptionExcluded) {
      texts.push(primary.description || '');
    }
    texts.push(...(primary.lore || []).filter(l => !l.delivered).map(l => l.description || ''));
    texts.push(...(primary.ideas || []).map(i => i.text || ''));
    texts.push(...(primary.toDoItems || []).map(t => t.text || ''));
  }
  else if (primary instanceof Front) {
    if (!descriptionExcluded) {
      texts.push(primary.description || '');
    }
    for (const danger of primary.dangers || []) {
      texts.push(danger.description || '', danger.motivation || '', danger.impendingDoom || '');
      texts.push(...(danger.grimPortents || []).map(p => p.description || ''));
    }
  }
  else if (primary instanceof FCBSetting) {
    if (!descriptionExcluded) {
      texts.push(primary.description || '');
    }
  }

  return texts.filter(text => text.trim() !== '');
};

/**
 * Adds journal references from a document's explicit `journals` array to the journal map
 * (no-op when journal inclusion is disabled or the document has no journals array).
 * @param doc - Document possibly carrying a RelatedJournal array.
 * @param context - Build context.
 */
const addDocJournals = (doc: unknown, context: BuildContext): void => {
  if (!context.includeJournals) {
    return;
  }
  const journals = (doc as { journals?: RelatedJournal[] }).journals;
  if (journals && journals.length > 0) {
    processRelatedJournals(journals, context.journalMap);
  }
};

/**
 * Converts an export SessionNode into a context session node: strips the date, enriches
 * monster/item rows with Foundry document descriptions, and registers the session's linked
 * locations/NPCs as included entries.
 * @param node - Export-shaped session node.
 * @param context - Build context.
 * @returns Context session node.
 */
const toContextSessionNode = async (node: SessionNode, context: BuildContext): Promise<ContextSessionNode> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { date: _date, monsters, items, ...rest } = node;

  const contextMonsters: ContextMonsterRow[] = [];
  for (const monster of monsters) {
    contextMonsters.push({ ...monster, description: await getFoundryDocDescription(monster.uuid) });
  }

  const contextItems: ContextItemRow[] = [];
  for (const item of items) {
    contextItems.push({ ...item, description: await getFoundryDocDescription(item.uuid) });
  }

  // Linked entries (and their ancestors) come along with any included session.
  for (const location of node.locations) {
    await addEntryWithAncestors(location.uuid, context);
  }
  for (const npc of node.npcs) {
    await addEntryWithAncestors(npc.uuid, context);
  }

  return { ...rest, monsters: contextMonsters, items: contextItems };
};

/**
 * Builds a context session node straight from a Session document.
 * @param session - Source session.
 * @param context - Build context.
 * @returns Context session node.
 */
const buildSessionContextNode = async (session: Session, context: BuildContext): Promise<ContextSessionNode> => {
  const node = await buildSessionNode(session, context.setting, fieldsFor(context, CustomFieldContentType.Session));
  return toContextSessionNode(node, context);
};

/**
 * Builds a context campaign node: full campaign-level data (pcs, lore, ideas, todos, fronts) but
 * no arcs — relevant arcs/sessions are attached separately by the assemblers. Campaign PCs are
 * registered as included entries, and the campaign's journals feed the journal map.
 * @param campaign - Source campaign.
 * @param context - Build context.
 * @returns Context campaign node.
 */
const buildCampaignContextNode = async (campaign: Campaign, context: BuildContext): Promise<ContextCampaignNode> => {
  const node = await buildCampaignNode(
    campaign,
    context.setting,
    fieldsFor(context, CustomFieldContentType.Campaign),
    fieldsFor(context, CustomFieldContentType.Front),
    fieldsFor(context, CustomFieldContentType.Arc),
    fieldsFor(context, CustomFieldContentType.Session),
    { includeArcs: false }
  );

  for (const pc of node.pcs) {
    await addEntryWithAncestors(pc.uuid, context);
  }

  addDocJournals(campaign, context);

  return { ...node, arcs: [], sessions: [] };
};

/**
 * Finds the arc whose session-number range contains the given session.
 * @param session - Session to place.
 * @param campaign - The session's campaign.
 * @returns The containing arc, or null when the session falls outside every arc.
 */
const resolveSessionArc = async (session: Session, campaign: Campaign): Promise<Arc | null> => {
  for (const arcIndex of campaign.arcIndex) {
    const arc = await Arc.fromUuid(arcIndex.uuid);
    if (arc && session.number >= arc.startSessionNumber && session.number <= arc.endSessionNumber) {
      return arc;
    }
  }
  return null;
};

/**
 * Attaches a context session node to a campaign node, nesting it under a shell of its arc when
 * it has one (creating/reusing the shell) or in the campaign-level sessions array otherwise.
 * @param campaignNode - Campaign node to attach to.
 * @param campaign - Source campaign document.
 * @param session - Source session document.
 * @param sessionNode - Prepared context session node.
 * @param context - Build context.
 */
const attachSessionNode = async (
  campaignNode: ContextCampaignNode,
  campaign: Campaign,
  session: Session,
  sessionNode: ContextSessionNode,
  context: BuildContext
): Promise<void> => {
  const arc = await resolveSessionArc(session, campaign);
  if (!arc) {
    campaignNode.sessions.push(sessionNode);
    return;
  }

  let shell = campaignNode.arcs.find(a => a.uuid === arc.uuid);
  if (!shell) {
    shell = {
      uuid: arc.uuid,
      name: arc.name,
      description: arc.description?.trim() ? cleanText(arc.description, 5) : '',
      sessions: []
    };
    campaignNode.arcs.push(shell);
    addDocJournals(arc, context);
  }
  shell.sessions.push(sessionNode);
};

/**
 * Attaches a campaign's most recent N sessions (by session number) as context session nodes.
 * @param campaignNode - Campaign node to attach to.
 * @param campaign - Source campaign.
 * @param context - Build context.
 */
const attachRecentSessions = async (campaignNode: ContextCampaignNode, campaign: Campaign, context: BuildContext): Promise<void> => {
  if (context.sessionCount <= 0) {
    return;
  }
  const sessions = await campaign.allSessions();
  sessions.sort((a, b) => b.number - a.number);
  for (const session of sessions.slice(0, context.sessionCount)) {
    const sessionNode = await buildSessionContextNode(session, context);
    await attachSessionNode(campaignNode, campaign, session, sessionNode, context);
  }
};

////////////////////////////////////////////////////////////////////////////////
// Per-primary-type assemblers (each returns the campaigns array for the tree)
////////////////////////////////////////////////////////////////////////////////

/**
 * Assembles context for an Entry primary: the entry + ancestors + related entries (1 degree).
 * @param entry - Primary entry.
 * @param context - Build context.
 * @returns Empty campaigns array (entries carry no campaign content).
 */
const assembleForEntry = async (entry: Entry, context: BuildContext): Promise<ContextCampaignNode[]> => {
  const node = await addEntryWithAncestors(entry.uuid, context);
  if (node) {
    context.entryNodes.set(entry.uuid, markPrimary(node, context));
  }

  // 1-degree expansion: only the primary entry's relationships pull entries in.
  for (const topicRelationships of Object.values(entry.relationships)) {
    for (const related of Object.values(topicRelationships as Record<string, { uuid: string }>)) {
      await addEntryWithAncestors(related.uuid, context);
    }
  }

  return [];
};

/**
 * Assembles context for a Session primary: the session (under its arc shell) inside its campaign.
 * @param session - Primary session.
 * @param context - Build context.
 * @returns Campaigns array with the session's campaign.
 */
const assembleForSession = async (session: Session, context: BuildContext): Promise<ContextCampaignNode[]> => {
  const campaign = await session.loadCampaign();
  const campaignNode = await buildCampaignContextNode(campaign, context);
  const sessionNode = markPrimary(await buildSessionContextNode(session, context), context);
  await attachSessionNode(campaignNode, campaign, session, sessionNode, context);
  return [campaignNode];
};

/**
 * Assembles context for an Arc primary: the full arc (with all its sessions) inside its campaign,
 * pulling in arc participants/locations and every session's linked entries.
 * @param arc - Primary arc.
 * @param context - Build context.
 * @returns Campaigns array with the arc's campaign.
 */
const assembleForArc = async (arc: Arc, context: BuildContext): Promise<ContextCampaignNode[]> => {
  const campaign = await arc.loadCampaign();
  const campaignNode = await buildCampaignContextNode(campaign, context);

  const arcNode = await buildArcNode(arc, context.setting, fieldsFor(context, CustomFieldContentType.Arc), fieldsFor(context, CustomFieldContentType.Session));

  // Register the arc's own linked entries.
  for (const location of arcNode.locations) {
    await addEntryWithAncestors(location.uuid, context);
  }
  for (const participant of arcNode.participants) {
    await addEntryWithAncestors(participant.uuid, context);
  }

  // Enrich arc monster/item rows with Foundry document descriptions.
  const monsters: ContextDocRow[] = [];
  for (const monster of arcNode.monsters) {
    monsters.push({ ...monster, description: await getFoundryDocDescription(monster.uuid) });
  }
  const magicItems: ContextDocRow[] = [];
  for (const item of arcNode.magicItems) {
    magicItems.push({ ...item, description: await getFoundryDocDescription(item.uuid) });
  }

  // Convert the arc's sessions to context nodes (strips dates, registers linked entries).
  const sessions: ContextSessionNode[] = [];
  for (const sessionNode of arcNode.sessions) {
    sessions.push(await toContextSessionNode(sessionNode, context));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sessions: _sessions, monsters: _monsters, magicItems: _magicItems, ...arcRest } = arcNode;
  campaignNode.arcs.push(markPrimary({ ...arcRest, monsters, magicItems, sessions }, context));
  addDocJournals(arc, context);

  return [campaignNode];
};

/**
 * Assembles context for a Campaign primary: the campaign plus its most recent N sessions.
 * @param campaign - Primary campaign.
 * @param context - Build context.
 * @returns Campaigns array with just this campaign.
 */
const assembleForCampaign = async (campaign: Campaign, context: BuildContext): Promise<ContextCampaignNode[]> => {
  const campaignNode = markPrimary(await buildCampaignContextNode(campaign, context), context);
  await attachRecentSessions(campaignNode, campaign, context);
  return [campaignNode];
};

/**
 * Assembles context for a Front primary: the front (flagged inside its campaign's fronts list)
 * plus danger participants as included entries.
 * @param front - Primary front.
 * @param context - Build context.
 * @returns Campaigns array with the front's campaign.
 */
const assembleForFront = async (front: Front, context: BuildContext): Promise<ContextCampaignNode[]> => {
  const campaign = await front.loadCampaign();
  const campaignNode = await buildCampaignContextNode(campaign, context);

  // Flag the primary front inside the campaign's fronts list, building it if the list is
  // unavailable (e.g. the fronts feature toggle is off).
  const existing = (campaignNode.fronts || []).find(f => f.uuid === front.uuid);
  if (existing) {
    campaignNode.fronts = (campaignNode.fronts || []).map(f => f.uuid === front.uuid ? markPrimary(f, context) : f);
  }
  else {
    const frontNode = markPrimary(buildFrontNode(front, fieldsFor(context, CustomFieldContentType.Front)), context);
    campaignNode.fronts = [...(campaignNode.fronts || []), frontNode];
  }

  // Danger participants become included entries (non-entry participant UUIDs are skipped).
  for (const danger of front.dangers || []) {
    for (const participant of danger.participants || []) {
      await addEntryWithAncestors(participant.uuid, context);
    }
  }

  return [campaignNode];
};

/**
 * Assembles context for a Setting primary: every active campaign with its recent sessions.
 * @param setting - Primary setting.
 * @param context - Build context.
 * @returns Campaigns array with all active campaigns.
 */
const assembleForSetting = async (setting: FCBSetting, context: BuildContext): Promise<ContextCampaignNode[]> => {
  const campaignNodes: ContextCampaignNode[] = [];
  for (const campaign of Object.values(setting.campaigns)) {
    if (!campaign || campaign.completed) {
      continue;
    }
    const campaignNode = await buildCampaignContextNode(campaign, context);
    await attachRecentSessions(campaignNode, campaign, context);
    campaignNodes.push(campaignNode);
  }
  return campaignNodes;
};

////////////////////////////////////////////////////////////////////////////////
// Service
////////////////////////////////////////////////////////////////////////////////

/**
 * Service for building AI-generation context snippets (TOON-encoded world context centered on a
 * primary entity).
 */
const GenerationContextService = {
  /**
   * Builds the full (pre-encoding) context tree for a primary entity. Exposed separately from
   * buildContextSnippet mainly for tests and debugging.
   * @param primary - The entity text is being generated for.
   * @param contentType - The entity's custom-field content type (disambiguates Branch etc.).
   * @param setting - The current setting; all context is scoped to it.
   * @param excludeField - The field being generated, stripped from the primary node.
   * @returns The assembled context tree.
   */
  buildContextTree: async (
    primary: PrimaryEntity,
    contentType: CustomFieldContentType,
    setting: FCBSetting,
    excludeField?: ExcludedField
  ): Promise<GenerationContextTree> => {
    await setting.loadCampaigns();

    const speciesList = ModuleSettings.get(SettingKey.speciesList) || [];
    const context: BuildContext = {
      excludeField,
      setting,
      fieldDefs: ModuleSettings.get(SettingKey.customFields) || {},
      validSpecies: speciesList.reduce((acc, s: Species) => {
        acc[s.id] = s.name;
        return acc;
      }, {} as Record<string, string>),
      sessionCount: ModuleSettings.get(SettingKey.aiContextSessionCount) ?? 3,
      includeJournals: !!ModuleSettings.get(SettingKey.aiContextIncludeJournals),
      entryNodes: new Map<string, ContextEntryNode>(),
      journalMap: new Map<string, Set<string>>()
    };

    // Assemble the campaign/session/arc/front structure for the primary type.
    let campaigns: ContextCampaignNode[];
    if (primary instanceof Entry) {
      campaigns = await assembleForEntry(primary, context);
    }
    else if (primary instanceof Session) {
      campaigns = await assembleForSession(primary, context);
    }
    else if (primary instanceof Arc) {
      campaigns = await assembleForArc(primary, context);
    }
    else if (primary instanceof Front) {
      campaigns = await assembleForFront(primary, context);
    }
    else if (primary instanceof Campaign) {
      campaigns = await assembleForCampaign(primary, context);
    }
    else {
      campaigns = await assembleForSetting(primary, context);
    }

    // Scan the primary entity's raw text fields: FCB entry references get included as context;
    // journal references feed the journal map when journal inclusion is enabled.
    const rawTexts = collectRawTextFields(primary, contentType, context);
    for (const uuid of extractUUIDs(rawTexts.join('\n'))) {
      if (isFCBUuid(uuid)) {
        await addEntryWithAncestors(uuid, context);
      }
    }
    if (context.includeJournals) {
      for (const text of rawTexts) {
        collectJournalRefsFromText(text, context.journalMap);
      }
      addDocJournals(primary, context);
    }

    // Setting node: always carries custom fields; genre/feeling are omitted (sent as separate
    // API fields); species is the full list only when the setting itself is primary, otherwise
    // filtered to the species of included characters.
    const settingIsPrimary = primary instanceof FCBSetting;
    const fullSettingNode = buildSettingNode(setting, fieldsFor(context, CustomFieldContentType.Setting), speciesList);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { genre: _genre, feeling: _feeling, ...settingRest } = fullSettingNode;
    let settingNode: ContextSettingNode = settingRest;
    if (settingIsPrimary) {
      settingNode = markPrimary(settingNode, context);
    }
    else {
      const usedSpecies = new Set(
        Array.from(context.entryNodes.values()).map(node => node.species).filter(name => name !== '')
      );
      settingNode.species = settingNode.species.filter(s => usedSpecies.has(s.name));
    }

    // Bucket collected entries by topic (mirrors the export tree's entries block).
    const buckets: GenerationContextTree['entries'] = { characters: [], locations: [], organizations: [], pcs: [] };
    for (const node of context.entryNodes.values()) {
      switch (node.topic) {
        case Topics.Character:
          buckets.characters.push(node);
          break;
        case Topics.Location:
          buckets.locations.push(node);
          break;
        case Topics.Organization:
          buckets.organizations.push(node);
          break;
        case Topics.PC:
          buckets.pcs.push(node);
          break;
      }
    }

    const referencedJournals = context.includeJournals && context.journalMap.size > 0
      ? await buildJournalNodesFromMap(context.journalMap)
      : [];

    return { setting: settingNode, entries: buckets, campaigns, referencedJournals };
  },

  /**
   * Builds the TOON-encoded context snippet for a primary entity, ready to send as the
   * `contextSnippet` field of a text-generation request.
   * @param primary - The entity text is being generated for.
   * @param contentType - The entity's custom-field content type (disambiguates Branch etc.).
   * @param setting - The current setting; all context is scoped to it.
   * @param excludeField - The field being generated, stripped from the primary node.
   * @returns TOON-encoded context snippet.
   */
  buildContextSnippet: async (
    primary: PrimaryEntity,
    contentType: CustomFieldContentType,
    setting: FCBSetting,
    excludeField?: ExcludedField
  ): Promise<string> => {
    const tree = await GenerationContextService.buildContextTree(primary, contentType, setting, excludeField);
    return encode(tree as unknown as JsonValue, { replacer: toonReplacer });
  }
};

export default GenerationContextService;
