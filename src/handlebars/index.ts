export function registerHelpers() {
  // register templates parts
  const templatePaths = [
    "systems/pf2e/templates/actors/main/actor-header.html"
  ];
  
  return loadTemplates( templatePaths );  
}