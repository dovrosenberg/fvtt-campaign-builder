export function registerHelpers() {
  // register templates parts
  const templatePaths = [
    'modules/world-builder/templates/WBHeader.hbs',
    'modules/world-builder/templates/WBFooter.hbs',
    'modules/world-builder/templates/WBContent.hbs',
  ];

  // @ts-ignore
  return loadTemplates( templatePaths );  
}