/**
 * Helper functions for the Editor component
 * 
 * This module provides custom text enrichment functionality for Foundry VTT's TextEditor system.
 * It implements a custom enricher that handles content links in the read-only version of the editor
 * for campaign builder documents (Entries, PCs, Sessions, Campaigns, Worlds) and ensures they open
 * within the campaign builder application rather than using Foundry's default document handling.
 * 
 * The enrichment system works by:
 * 1. Registering a custom enricher pattern that matches @UUID[...] and legacy @Type[...] links
 * 2. Temporarily adding this enricher to Foundry's CONFIG.TextEditor.enrichers array
 * 3. Processing text through TextEditor.enrichHTML with the custom enricher active
 * 4. Removing the custom enricher to avoid conflicts with other applications
 * 
 * @see https://foundryvtt.com/api/v11/classes/client.TextEditor.html#enrichHTML
 * @see https://foundryvtt.com/article/v10-text-editor/ for enricher documentation
 */

// helper functions for the Editor component
import { getTabTypeIcon, getTopicIcon } from '@/utils/misc';
import { localize } from '@/utils/game';

// types
import { CampaignDoc, CampaignFlagKey, DOCUMENT_TYPES, EntryDoc, PCDoc, SessionDoc, WorldDoc, WorldFlagKey } from '@/documents';
import { Setting, Entry, Campaign, Session, PC } from '@/classes';
import { DOCUMENT_LINK_TYPES, EMBEDDED_DOCUMENT_TYPES, WORLD_DOCUMENT_TYPES } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/constants.mjs';
import { WindowTabType } from '@/types';
import { InternalClientDocument } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/abstract/client-document.mjs';
import { moduleId } from '@/settings';

/**
 * Configuration object for the custom enricher that gets registered with Foundry's TextEditor system.
 * This follows the TextEditorEnricher interface expected by CONFIG.TextEditor.enrichers.
 */
let enricherConfig: {
  pattern: RegExp;
  enricher: (match: RegExpMatchArray, options: Record<string, any> | undefined)=>Promise<HTMLElement | null>;
  replaceParent: boolean;
};

/**
 * Sets up the custom enricher configuration for campaign builder content links.
 * 
 * This function creates a regex pattern that matches both modern @UUID[...] links and legacy
 * @Type[...] links (like @Actor[id], @Scene[id], etc.). The enricher is configured to handle
 * these links specially when they reference campaign builder documents.
 * 
 * The pattern matches:
 * - @UUID[uuid]{optional label}
 * - @Actor[id]{optional label}
 * - @Scene[id]{optional label}
 * - etc. for all DOCUMENT_LINK_TYPES
 * 
 * Must be called during module initialization before any text enrichment occurs.
 * 
 */
export const setupEnricher = (): void => {
  const documentTypes: (DOCUMENT_LINK_TYPES | 'Compendium' | 'UUID')[] = [...CONST.DOCUMENT_LINK_TYPES, 'Compendium', 'UUID'];
  const rgx = new RegExp(`@(${documentTypes.join('|')})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, 'g');

  enricherConfig = { 
    pattern: rgx,
    enricher: customEnrichContentLinks,
    replaceParent: false,
  };
};

/**
 * Enriches HTML text with custom campaign builder content links.
 * 
 * This is the main function used throughout the application to process text that may contain
 * document links. It temporarily registers the custom enricher, processes the text through
 * Foundry's TextEditor.enrichHTML, then removes the custom enricher to avoid conflicts.
 * 
 * 1. We tell enrichHTML not to create default content links (documents: false)
 * 2. Our custom enricher runs instead and creates special links for campaign builder docs
 * 3. Regular Foundry documents still get processed normally by other enrichers
 * 4. The custom enricher is safely removed after processing
 * 
 * @param worldId - UUID of the current world/setting being viewed. Required to determine
 *                  if links should be handled by the campaign builder or fall back to default behavior.
 * @param text - Raw HTML/text content that may contain @UUID[...] or @Type[...] links
 * @returns Promise resolving to enriched HTML with clickable content links
 * 
 * @example
 * const enriched = await enrichFwbHTML(world.uuid, "See @UUID[Entry.abc123]{this character}");
 * // Returns HTML with a clickable link that opens in the campaign builder
 * 
 * @example
 * const enriched = await enrichFwbHTML(null, "Some text");
 * // Returns original text unchanged when no worldId provided
 */
export const enrichFwbHTML = async(worldId: string | null, text: string): Promise<string> => {
  // have to have a worldId
  if (!worldId)
    return text;

  CONFIG.TextEditor.enrichers.push(enricherConfig);

  const retval = await TextEditor.enrichHTML(text || '', {
    secrets: true,    //this.document.isOwner,
    documents: false,
    // async: true,
    worldId: worldId,
  });    

  CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.filter((f): boolean => (f!=enricherConfig && f!==undefined));

  return retval;
};

/**
 * Type definition for link data used in anchor creation
 */
type LinkData = {
  classes: string[];
  attrs: { draggable?: string };
  dataset: { link?: string }
  name: string;
  icon: string;
}

/**
 * Creates a "broken" anchor element for links that cannot be resolved or are cross-world references.
 * 
 * This function is used when a content link references a document that:
 * - Doesn't exist
 * - Is from a different world/setting than the current one
 * - Has invalid data
 * 
 * The resulting anchor appears broken (with unlink icon) and is not clickable.
 * 
 * @param data - Link data object containing classes, attributes, dataset, name, and icon
 * @param name - Optional custom name to display instead of "Cross-Setting links are not supported"
 * @returns HTMLAnchorElement configured as a broken/disabled link
 */
const brokenAnchor = (data: LinkData, name = 'Cross-Setting links are not supported'): HTMLAnchorElement => {
  // this is a cross-world item; basically treat it like broken
  delete data.dataset.link;
  delete data.attrs.draggable;
  data.icon = 'fas fa-unlink';
  data.name = name;
  data.classes.push('broken');

  return TextEditor.createAnchor(data);
}

/**
 * Creates a valid, clickable anchor element for campaign builder entries, sessions, etc.
 * 
 * This function creates anchor elements that integrate with the campaign builder's
 * navigation system. When clicked, these links will open the referenced document
 * within the campaign builder application rather than using Foundry's default
 * document sheets.
 * 
 * The anchor includes:
 * - Custom CSS classes for styling and click handling
 * - Data attributes for document identification and routing
 * - Appropriate icons based on document type and topic
 * - Tooltip text for user guidance
 * 
 * @param doc - The Foundry document being linked to
 * @param linkType - Type of window/tab to open (Entry, PC, Session, Campaign, World)
 * @param hash - Optional hash fragment for linking to specific sections
 * @param name - Display name for the link
 * @param icon - CSS icon class to display
 * @param topic - Optional topic for Entry documents (Character, Location, etc.)
 * @returns HTMLAnchorElement configured for campaign builder navigation
 * 
 * @example
 * const anchor = goodAnchor(entryDoc, WindowTabType.Entry, "", "John Smith", "fas fa-user", Topics.Character);
 * // Creates: <a class="content-link fcb-content-link" data-uuid="..." data-link-type="1">John Smith</a>
 */
const goodAnchor = <T extends InternalClientDocument>(doc: T, linkType: WindowTabType, hash:string, name: string, icon: string, topic?: ValidTopic): HTMLAnchorElement => {
  const attrs = { draggable: 'true' };
  const dataset = {
    hash,
    linkType: linkType.toString(),
    link: '',
    uuid: doc.uuid,
    id: doc.id,
    type: doc.documentName,
    pack: doc.pack,
    tooltip: linkType === WindowTabType.Entry ? localize(`tooltips.contentLinks.${linkType}.${topic}`) : localize(`tooltips.contentLinks.${linkType}`)
  };

  const classes = ['content-link','fcb-content-link'];   // clicks on this class are handled 
  return TextEditor.createAnchor({ attrs, dataset, name, classes, icon });
}

/**
 * Custom enricher function that processes content link matches and creates appropriate anchor elements.
 * 
 * This is the core enricher function that gets called by Foundry's TextEditor.enrichHTML for each
 * content link match found in the text. It determines whether the link should be handled by the
 * campaign builder or fall back to default Foundry behavior.
 * 
 * The function handles:
 * 1. UUID links (@UUID[...]) - Modern Foundry format
 * 2. Legacy links (@Actor[...], @Scene[...], etc.) - Older Foundry format
 * 3. Campaign builder documents (Entry, PC, Session, Campaign, World)
 * 4. Cross-world references (marked as broken)
 * 5. Regular Foundry documents (passed through to default handling)
 * 
 * Processing logic:
 * - If no worldId provided, use default Foundry behavior
 * - If document is from different world, create broken link
 * - If document is campaign builder type, create custom navigation link
 * - Otherwise, use default Foundry document link
 * 
 * @param match - RegExp match array from the enricher pattern:
 *                [0] = full match, [1] = type, [2] = target, [3] = hash, [4] = name
 * @param options - Enrichment options including worldId for context
 * @returns Promise resolving to HTMLElement for the content link, or null if no match
 * 
 * @example
 * // Called automatically by TextEditor.enrichHTML when it finds:
 * // "@UUID[Entry.abc123]{John Smith}"
 * // match = ["@UUID[Entry.abc123]{John Smith}", "UUID", "Entry.abc123", undefined, "John Smith"]
 * 
 * @see https://foundryvtt.com/api/v11/classes/client.TextEditor.html#_createContentLink
 */
const customEnrichContentLinks = async (match: RegExpMatchArray, options?: {worldId?: string}): Promise<HTMLElement | null> => {
  const [type, target, hash, name] = match.slice(1, 5);
    const { worldId } = options || { worldId: undefined };

  // Prepare replacement data
  const data = {
    classes: ['content-link'],
    attrs: { draggable: 'true' },
    dataset: { link: '' },
    name,
    icon: '',
  } as LinkData;

  let unknownItem: InternalClientDocument | null = null;
  let broken = false;
  if ( type === 'UUID' ) {
    Object.assign(data.dataset, {link: '', uuid: target});
    unknownItem = await fromUuid(target) as unknown as InternalClientDocument;
  }
  else {
    broken = createLegacyContentLink(type as WORLD_DOCUMENT_TYPES, target, name, data);
  }

  // for now, we only care about the ones in the current world (for performance purposes and because
  //    I don't think you should be referencing across worlds (and we don't make that easy to do, in any case))
  if (unknownItem && !broken) {
    // if we're not in a world builder app, just do the default
    if (!worldId)
      return unknownItem.toAnchor({ name: data.name, dataset: { hash } });

    switch (unknownItem.type) {
      case DOCUMENT_TYPES.Entry: {
        const entry = new Entry(unknownItem as unknown as EntryDoc);

        if (entry.topic) {
          const world = await entry.getWorld();

          // handle the ones we don't care about
          if (world.uuid !== worldId) {
            // we're in the wrong world
            return brokenAnchor(data);
          } else {  // this is an fcb item for this world
            return goodAnchor(unknownItem, WindowTabType.Entry, hash, data.name || entry.name, `fas ${getTopicIcon(entry.topic)}`, entry.topic); 
          }
        } else 
          return brokenAnchor(data, 'Invalid topic');
      }; break;
      case DOCUMENT_TYPES.PC: {
        const pc = new PC(unknownItem as unknown as PCDoc);

        // check if it's the right world
        const world = await pc.getWorld();
  
        // handle the ones we don't care about
        if (world.uuid !== worldId) {
          return brokenAnchor(data);
        } else {  // this is an fcb item for this world
          return goodAnchor(unknownItem, WindowTabType.PC, hash, data.name || pc.name, `fas ${getTabTypeIcon(WindowTabType.PC)}`); 
        }
      }; break;
      case DOCUMENT_TYPES.Session: {
        const session = new Session(unknownItem as unknown as SessionDoc);

        // check if it's the right world
        const world = await session.getWorld();
  
        // handle the ones we don't care about
        if (world.uuid !== worldId) {
          return brokenAnchor(data);
        } else {  // this is an fcb item for this world
          return goodAnchor(unknownItem, WindowTabType.Session, hash, data.name || session.name, `fas ${getTabTypeIcon(WindowTabType.Session)}`); 
        }
      }; break;
    }

    // now handle the folder types
    if (unknownItem?.getFlag(moduleId, WorldFlagKey.isWorld)) {
      const world = new Setting(unknownItem as unknown as WorldDoc);

      // handle the ones we don't care about
      if (world.uuid !== worldId) {
        return brokenAnchor(data);
      } else {  // this is an fcb item for this world
        return goodAnchor(unknownItem, WindowTabType.World, hash, data.name || world.name, `fas ${getTabTypeIcon(WindowTabType.World)}`); 
      }
    } else if (unknownItem?.getFlag(moduleId, CampaignFlagKey.isCampaign)) {
      const campaign = new Campaign(unknownItem as unknown as CampaignDoc); 
      const world = await campaign.getWorld();

      // handle the ones we don't care about
      if (world.uuid !== worldId) {
        return brokenAnchor(data);
      } else {  // this is an fcb item for this world
        return goodAnchor(unknownItem, WindowTabType.Campaign, hash, data.name || campaign.name, `fas ${getTabTypeIcon(WindowTabType.Campaign)}`); 
      }      
    } else if (type==='UUID' && unknownItem) {
      // handle like default
      return unknownItem.toAnchor({ name: data.name, dataset: { hash } });
    }
  }

  // Broken links
  return brokenAnchor(data, '');
};

/**
 * Creates a dynamic document link from an old-form document link expression.
 * 
 * This function handles legacy Foundry content link formats like @Actor[id], @Scene[id], etc.
 * It's adapted from Foundry's TextEditor._createLegacyContentLink to work with the custom
 * enricher system.
 * 
 * The function:
 * 1. Looks up the document in the appropriate collection
 * 2. Populates the link data with document information
 * 3. Returns whether the link is broken (document not found)
 * 
 * Supported legacy formats:
 * - @Actor[id] - References actors
 * - @Scene[id] - References scenes  
 * - @Item[id] - References items
 * - @PlaylistSound[playlist.sound] - References playlist sounds
 * - @Compendium[pack.id] - References compendium documents
 * 
 * @param type - The matched document type (Actor, Scene, Item, etc.) or "Compendium"
 * @param target - The requested match target (document _id or name)
 * @param _name - A customized or overridden display name for the link (unused in current implementation)
 * @param data - Data object that gets populated with link properties
 * @returns boolean indicating whether the resulting link is broken (true) or valid (false)
 * 
 * @example
 * const data = { classes: [], attrs: {}, dataset: {}, name: "", icon: "" };
 * const broken = createLegacyContentLink("Actor", "abc123", "John", data);
 * // data is now populated with actor information, broken indicates if actor was found
 * 
 * @private
 * @see https://foundryvtt.com/api/v11/classes/client.TextEditor.html#_createLegacyContentLink
 */
function createLegacyContentLink (type: WORLD_DOCUMENT_TYPES | EMBEDDED_DOCUMENT_TYPES | 'Compendium', target: string, _name: string, data: any): boolean {
  let broken = false;

  // Get a matched World document
  if ( CONST.WORLD_DOCUMENT_TYPES.includes(type as unknown as WORLD_DOCUMENT_TYPES) ) {
    // Get the linked Document
    const config = CONFIG[type];
    const collection = game.collections?.get(type);
    let document;

    if (!collection) {
      broken = true;
    } else {
      document = foundry.data.validators.isValidId(target) ? collection.get(target) : collection.getName(target);
      if (!document) 
        broken = true;
    }

    // Update link data
    data.name = data.name || (broken ? target : document.name);
    data.icon = config.sidebarIcon;
    Object.assign(data.dataset, {type, uuid: document?.uuid});
  }

  // Get a matched PlaylistSound
  else if ( type === 'PlaylistSound' ) {
    const [, playlistId, , soundId] = target.split('.');
    const playlist = game.playlists?.get(playlistId);
    const sound = playlist?.sounds.get(soundId);
    if ( !playlist || !sound ) broken = true;

    data.name = data.name || (broken ? target : sound.name);
    data.icon = CONFIG.Playlist.sidebarIcon;
    Object.assign(data.dataset, {type, uuid: sound?.uuid});
    if ( sound?.playing ) data.cls.push('playing');
    if ( !game?.user?.isGM ) data.cls.push('disabled');
  }

  // Get a matched Compendium document
  else if ( type === 'Compendium' ) {

    // Get the linked Document
    const uuid = foundry.utils.parseUuid(`Compendium.${target}`);
    const pack = uuid.collection as CompendiumCollection<any>;
    const id = uuid.id;

    if ( pack ) {
      Object.assign(data.dataset, {pack: pack.collection, uuid: pack.getUuid(id)});
      data.icon = CONFIG[pack.documentName].sidebarIcon;

      // If the pack is indexed, retrieve the data
      if ( pack.index.size ) {
        const index = pack.index.find(i => (i._id === id) || (i.name === id));
        if ( index ) {
          if ( !data.name ) data.name = index.name;
          data.dataset.id = index._id;
          data.dataset.uuid = index.uuid;
        }
        else broken = true;
      }

      // Otherwise assume the link may be valid, since the pack has not been indexed yet
      if ( !data.name ) data.name = data.dataset.lookup = id;
    }
    else broken = true;
  }
  return broken;
}