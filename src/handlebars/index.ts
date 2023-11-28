import { WBCONTENT_TEMPLATE } from "@/applications/WorldBuilder/WBContent";
import { WBHEADER_TEMPLATE } from "@/applications/WorldBuilder/WBHeader";
import { WBFOOTER_TEMPLATE } from "@/applications/WorldBuilder/WBFooter";
import { HOMEPAGE_TEMPLATE } from "@/applications/WorldBuilder/HomePage";

export function registerHelpers() {
  // register templates parts
  const templatePaths = [
    // main window
    WBHEADER_TEMPLATE,
    WBFOOTER_TEMPLATE,
    WBCONTENT_TEMPLATE,

    // content
    HOMEPAGE_TEMPLATE
  ];

  // @ts-ignore
  return loadTemplates( templatePaths );  
}