// helper functions for the Editor component

import { PackFlagKey, PackFlags } from '@/settings/PackFlags';
import { getIcon } from '@/utils/misc';

// types
import Document from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';

// TODO - make this look for the replaced content links and replace them with a different link that instead calls
//    openEntry (maybe add a custom click handler - including ctrlkey) 

// set the click handler to be at the app level (so only happens inside the app) - then stop progration if
//   the special 'inside worldbuilder' class is there - see https://stackoverflow.com/questions/17352104/multiple-js-event-handlers-on-single-element

let enricherConfig: {
  pattern: RegExp,
  enricher: (match: RegExpMatchArray, options: Record<string, any>)=>Promise<HTMLElement | null>
  replaceParent: boolean,
};

export const setupEnricher = (): void => {
  const documentTypes = CONST.DOCUMENT_LINK_TYPES.concat(['Compendium', 'UUID']);
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
    async: true,
    worldId: worldId,
  });    

  CONFIG.TextEditor.enrichers.filter((f): boolean => (f!=enricherConfig));

  return retval;
};

// most of this is from TextEditor._createContentLink
/**
   * Create a dynamic document link from a regular expression match
   * @param {RegExpMatchArray} match         The regular expression match
   * @param {object} [options]               Additional options to configure enrichment behaviour
   * @param {Document} [options.relativeTo]  A document to resolve relative UUIDs against.
   * @returns {Promise<HTMLAnchorElement>}   An HTML element for the document link.
   * @protected
   */

const customEnrichContentLinks = async (match: RegExpMatchArray, options: {worldId?: string, relativeTo?: Document<any>}): Promise<HTMLElement | null> => {
  const [type, target, hash, name] = match.slice(1, 5);
  const { relativeTo, worldId } = options;

  // Prepare replacement data
  const data = {
    classes: ['content-link'],
    attrs: { draggable: 'true' },
    dataset: { link: '' },
    name
  };

  let doc;
  let broken = false;
  if ( type === 'UUID' ) {
    Object.assign(data.dataset, {link: '', uuid: target});
    doc = await fromUuid(target, {relative: relativeTo});
  }
  else 
    broken = createLegacyContentLink(type, target, name, data);

  // for now, we only care about the ones in the current world (for performance purposes and because
  //    I don't think you should be referencing across worlds (and we don't make that easy to do, in any case))
  if (doc) {
    if (doc.documentName) {
      // handle the ones we don't care about; note worldId won't be present if this is called outside of our code
      if (!doc.pack || !worldId) {
        // this is not an fwb item
        return doc.toAnchor({ name: data.name, dataset: { hash } });
      } else {
        return doc.toAnchor({ 
          name: data.name, dataset: { hash }, classes: ['fwb-content-link'], 
          icon: `fas ${getIcon(PackFlags.get(doc.pack, PackFlagKey.topic))}` 
        });
      }
    }
    
    data.name = data.name || doc.name || target;
    const type = game.packs.get(doc.pack)?.documentName;
    Object.assign(data.dataset, {type, id: doc._id, pack: doc.pack});
    if (hash) 
      data.dataset.hash = hash;

    // TODO - see if the document is in one of the fwb compendia

    // TODO - put in the right icons
    data.icon = CONFIG[type].sidebarIcon;
  }

  // The UUID lookup failed so this is a broken link.
  else if ( type === 'UUID' ) broken = true;

  // Broken links
  if ( broken ) {
    delete data.dataset.link;
    delete data.attrs.draggable;
    data.icon = 'fas fa-unlink';
    data.classes.push('broken');
  }
  return TextEditor.createAnchor(data);
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
function createLegacyContentLink (type: string, target: string, name: string, data: any): boolean {
  let broken = false;

  // Get a matched World document
  if ( CONST.WORLD_DOCUMENT_TYPES.includes(type) ) {

    // Get the linked Document
    const config = CONFIG[type];
    const collection = game.collections.get(type);
    const document = foundry.data.validators.isValidId(target) ? collection.get(target) : collection.getName(target);
    if ( !document ) broken = true;

    // Update link data
    data.name = data.name || (broken ? target : document.name);
    data.icon = config.sidebarIcon;
    Object.assign(data.dataset, {type, uuid: document?.uuid});
  }

  // Get a matched PlaylistSound
  else if ( type === 'PlaylistSound' ) {
    const [, playlistId, , soundId] = target.split('.');
    const playlist = game.playlists.get(playlistId);
    const sound = playlist?.sounds.get(soundId);
    if ( !playlist || !sound ) broken = true;

    data.name = data.name || (broken ? target : sound.name);
    data.icon = CONFIG.Playlist.sidebarIcon;
    Object.assign(data.dataset, {type, uuid: sound?.uuid});
    if ( sound?.playing ) data.cls.push('playing');
    if ( !game.user.isGM ) data.cls.push('disabled');
  }

  // Get a matched Compendium document
  else if ( type === 'Compendium' ) {

    // Get the linked Document
    const { collection: pack, id } = foundry.utils.parseUuid(`Compendium.${target}`);
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