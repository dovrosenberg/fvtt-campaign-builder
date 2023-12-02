import { WBHeader } from '@/applications/WorldBuilder/WBHeader';
import { WBFooter } from '@/applications/WorldBuilder/WBFooter';
import { HomePage } from '@/applications/WorldBuilder/content/HomePage';
import { TopicSheet } from '@/applications/WorldBuilder/content/TopicSheet';
import { WBContent } from '@/applications/WorldBuilder/content/WBContent';
import { Directory } from '@/applications/WorldBuilder/directory/Directory';

export function registerHelpers() {
  // register templates parts
  const templatePaths = [
    // main window
    WBHeader.template,
    WBFooter.template,
    WBContent.template,
    Directory.template,

    // content
    HomePage.template,
    TopicSheet.template,
  ];

  // @ts-ignore
  return loadTemplates( templatePaths );  
}