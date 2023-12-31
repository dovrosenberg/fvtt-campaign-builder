import { WBHeader } from '@/applications/WorldBuilder/WBHeader';
import { WBFooter } from '@/applications/WorldBuilder/WBFooter';
import { HomePage } from '@/applications/WorldBuilder/content/HomePage';
import { WBContent } from '@/applications/WorldBuilder/content/WBContent';
import { Directory } from '@/applications/WorldBuilder/directory/Directory';
import { TypeAhead } from '@/components/TypeAhead';
import { Editor } from '@/components/Editor';
import { Tree } from '@/components/Tree';

export function registerHelpers() {
  // create a "constant" helper for passing constants
  Handlebars.registerHelper({ constant: (v: string | number)=> (v) });

  // register templates parts
  const templatePaths = [
    // main window
    WBHeader.template,
    WBFooter.template,
    Directory.template,

    // content
    WBContent.template,
    HomePage.template,

    // components
    TypeAhead.template,
    Editor.template,
    Tree.template,
  ];

  // @ts-ignore
  return loadTemplates( templatePaths );  
}