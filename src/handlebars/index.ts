import { WBHeader } from '@/applications/WorldBuilder/WBHeader';
import { WBFooter } from '@/applications/WorldBuilder/WBFooter';
import { HomePage } from '@/applications/WorldBuilder/content/HomePage';
import { WBContent } from '@/applications/WorldBuilder/content/WBContent';
import { Directory } from '@/applications/WorldBuilder/directory/Directory';

export function registerHelpers() {
  // register templates parts
  const templatePaths = [
    // main window
    WBHeader.template,
    WBFooter.template,
    Directory.template,

    // content
    WBContent.template,
    HomePage.template,
  ];

  // @ts-ignore
  return loadTemplates( templatePaths );  
}