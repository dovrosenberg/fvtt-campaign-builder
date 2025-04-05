// helper functions for the Editor component

import { getTabTypeIcon, getTopicIcon } from '@/utils/misc';

// types
import { CampaignDoc, CampaignFlagKey, DOCUMENT_TYPES, EntryDoc, PCDoc, SessionDoc, WorldDoc, WorldFlagKey } from '@/documents';
import { WBWorld, Entry, Campaign, Session, PC } from '@/classes';
import { DOCUMENT_LINK_TYPES, EMBEDDED_DOCUMENT_TYPES, WORLD_DOCUMENT_TYPES } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/constants.mjs';
import { WindowTabType } from '@/types';
import { AnyDocument } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/abstract/client-document.mjs';
import { moduleId } from '@/settings';

let enricherConfig: {
  pattern: RegExp;
  enricher: (match: RegExpMatchArray, options: Record<string, any> | undefined)=>Promise<HTMLElement | null>;
  replaceParent: boolean;
};

export const setupEnricher = (): void => {
  const documentTypes: (DOCUMENT_LINK_TYPES | 'Compendium' | 'UUID')[] = [...CONST.DOCUMENT_LINK_TYPES, 'Compendium', 'UUID'];
  const rgx = new RegExp(`@(${documentTypes.join('|')})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, 'g');

  enricherConfig = { 
    pattern: rgx,
    enricher: customEnrichContentLinks,
    replaceParent: false,
  };
};

// this approach is actually kind of clever... in our application, we call enrichHTML and tell it not to create content links;
//    we then do this instead (which creates the links but makes them special for us).  If someone else uses the default
//    one, all the links will already be done and the uuid's stripped out and this will do nothing.
// to be safe, though, we're going to always turn it on and off around calls to enrichHTML
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

type LinkData = {
  classes: string[];
  attrs: { draggable?: string };
  dataset: { link?: string }
  name: string;
  icon: string;
}
const brokenAnchor = (data: LinkData, name = 'Cross-world links are not supported'): HTMLAnchorElement => {
  // this is a cross-world item; basically treat it like broken
  delete data.dataset.link;
  delete data.attrs.draggable;
  data.icon = 'fas fa-unlink';
  data.name = name;
  data.classes.push('broken');

  return TextEditor.createAnchor(data);
}

/** Only for JournalEntry types */
const goodAnchor = <T extends AnyDocument>(doc: T, linkType: WindowTabType, hash:string, name: string, icon: string): HTMLAnchorElement => {
  return doc.toAnchor({ 
    name: name, 
    dataset: { 
      hash,
      linkType: linkType.toString(),
    }, 
    classes: ['fcb-content-link'],   // clicks on this class are handled 
    icon: icon 
  });
}

// most of this is from TextEditor._createContentLink
/**
   * Create a dynamic document link from a regular expression match
   * @param {RegExpMatchArray} match         The regular expression match
   * @param {object} [options]               Additional options to configure enrichment behaviour
   * @param {Document} [options.relativeTo]  A document to resolve relative UUIDs against.
   * @returns {Promise<HTMLAnchorElement>}   An HTML element for the document link.
   * @protected
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

  let unknownItem: AnyDocument | null = null;
  let broken = false;
  if ( type === 'UUID' ) {
    Object.assign(data.dataset, {link: '', uuid: target});
    unknownItem = await fromUuid(target);
  }
  else {
    broken = createLegacyContentLink(type as WORLD_DOCUMENT_TYPES, target, name, data);
  }

  // for now, we only care about the ones in the current world (for performance purposes and because
  //    I don't think you should be referencing across worlds (and we don't make that easy to do, in any case))
  if (unknownItem) {
    // if we're not in a world builder app, just do the default
    if (!worldId)
      return unknownItem.raw.toAnchor({ name: data.name, dataset: { hash } });

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
            return goodAnchor(unknownItem, WindowTabType.Entry, hash, data.name, `fas ${getTopicIcon(entry.topic)}`); 
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
          return goodAnchor(unknownItem, WindowTabType.PC, hash, data.name, `fas ${getTabTypeIcon(WindowTabType.PC)}`); 
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
          return goodAnchor(unknownItem, WindowTabType.Session, hash, data.name, `fas ${getTabTypeIcon(WindowTabType.Session)}`); 
        }
      }; break;
    }

    // now handle the folder types
    if (unknownItem?.getFlag(moduleId, WorldFlagKey.isWorld)) {
      const world = new WBWorld(unknownItem as unknown as WorldDoc);

      // handle the ones we don't care about
      if (world.uuid !== worldId) {
        return brokenAnchor(data);
      } else {  // this is an fcb item for this world
        return goodAnchor(unknownItem, WindowTabType.World, hash, data.name, `fas ${getTabTypeIcon(WindowTabType.World)}`); 
      }
    } else if (unknownItem?.getFlag(moduleId, CampaignFlagKey.isCampaign)) {
      const campaign = new Campaign(unknownItem as unknown as CampaignDoc); 
      const world = await campaign.getWorld();

      // handle the ones we don't care about
      if (world.uuid !== worldId) {
        return brokenAnchor(data);
      } else {  // this is an fcb item for this world
        return goodAnchor(unknownItem, WindowTabType.Campaign, hash, data.name, `fas ${getTabTypeIcon(WindowTabType.Campaign)}`); 
      }      
    } else
      broken = true;
  } else if (type==='UUID') {
    // The UUID lookup failed so this is a broken link.
    broken = true;
  }

  // Broken links
  return brokenAnchor(data, '');
};

/**
   * Create a dynamic document link from an old-form document link expression.
   * @param {string} type    The matched document type, or "Compendium".
   * @param {string} target  The requested match target (_id or name).
   * @param {string} name    A customized or overridden display name for the link.
   * @param {object} data    Data containing the properties of the resulting link element.
   * @returns {boolean}      Whether the resulting link is broken or not.
   * @private
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