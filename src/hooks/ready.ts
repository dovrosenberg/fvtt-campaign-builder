import { worldBuilder, updateWorldBuilder, } from '@/applications/WorldBuilder';
import { getDefaultFolders } from '@/compendia';
import { getGame, localize } from '@/utils/game';
import { WorldBuilderApplication } from '@/applications/WorldBuilder/WorldBuilder';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  // register handlebars helpers
  if (getGame().user?.isGM) {  
    const navToggleButton = jQuery(document).find('#nav-toggle');
    const toolTip = localize('fwb.tooltips.mainButton');
    navToggleButton.before(
      `<button id='fwb-launch' type="button" class="nav-item flex0" title="${toolTip}"><i class="fas fa-globe"></i></button>`
    );

    jQuery(document).on('click', '#fwb-launch', async (): Promise<void> => {
      if (!worldBuilder) {
        // TODO - what happens if the folder is deleted after this is called?  Do 
        //    we need to continually check or is the user just stupid?  Also, 
        //    can we lock it to prevent that?
        const folders = await getDefaultFolders();
        
        if (folders?.rootFolder && folders?.worldFolder) {
          // create the instance
          updateWorldBuilder(await new WorldBuilderApplication().render());
        } else {
          // we don't have valid folders, so just quit
          return;
        }
      }

      // render the main window
      void worldBuilder.render(true);
    });
  }
}