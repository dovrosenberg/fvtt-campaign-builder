export function registerHelpers() {
  // register templates parts
  const templatePaths = [
    // main window
    'modules/world-builder/templates/WBHeader.hbs',
    'modules/world-builder/templates/WBFooter.hbs',
    'modules/world-builder/templates/WBContent.hbs',

    // content
    'modules/world-builder/templates/HomePage.hbs',
  ];

  // @ts-ignore
  return loadTemplates( templatePaths );  
}