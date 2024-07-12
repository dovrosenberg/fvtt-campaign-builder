// helper functions for the Editor component
// TODO - need to add this to CONFIG.TextEditor.enchrichers;  CONFIG.TextEditor.enrichers.push(fn)

// TODO - make this look for the replaced content links and replace them with a different link that instead calls
//    openEntry (maybe add a custom click handler - including ctrlkey) 

// set the click handler to be at the app level (so only happens inside the app) - then stop progration if
//   the special 'inside worldbuilder' class is there - see https://stackoverflow.com/questions/17352104/multiple-js-event-handlers-on-single-element

static async _enrichContentLinks(text, {relativeTo}={}) {
  const documentTypes = CONST.DOCUMENT_LINK_TYPES.concat(["Compendium", "UUID"]);
  const rgx = new RegExp(`@(${documentTypes.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, "g");
  return this._replaceTextContent(text, rgx, match => this._createContentLink(match, {relativeTo}));
}