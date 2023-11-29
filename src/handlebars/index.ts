import { WBCONTENT_TEMPLATE } from '@/applications/WorldBuilder/content/WBContent';
import { HOMEPAGE_TEMPLATE } from '@/applications/WorldBuilder/content/HomePage';
import { DIRECTORY_TEMPLATE } from '@/applications/WorldBuilder/directory/Directory';
import { WBHEADER_TEMPLATE } from '@/applications/WorldBuilder/WBHeader';
import { WBFOOTER_TEMPLATE } from '@/applications/WorldBuilder/WBFooter';

export function registerHelpers() {
  // register templates parts
  const templatePaths = [
    // main window
    WBHEADER_TEMPLATE,
    WBFOOTER_TEMPLATE,
    WBCONTENT_TEMPLATE,
    DIRECTORY_TEMPLATE,

    // content
    HOMEPAGE_TEMPLATE
  ];

  // @ts-ignore
  return loadTemplates( templatePaths );  
}