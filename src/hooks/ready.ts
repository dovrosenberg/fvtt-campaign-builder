import { WorldBuilder, updateWorldBuilder } from '@/applications/WorldBuilder';
import { worldBuilder } from "@/applications/WorldBuilder";
import { getDefaultFolders } from '@/compendia';
import { registerHelpers } from "@/handlebars";
import { getGame, localize } from "@/utils/game";

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  // register handlebars helpers
  registerHelpers();

  if (getGame().user?.isGM) {  // TODO : decide what the player view should be, if any
    const navToggleButton = jQuery(document).find('#nav-toggle');
    const toolTip = localize('fwb.tooltips.mainButton');
    navToggleButton.before(
        `<button id='fwb-launch' type="button" class="nav-item flex0" title="${toolTip}"><i class="fas fa-globe"></i></button>`
    );

    jQuery(document).on('click', '#fwb-launch', async (event: JQuery.ClickEvent): Promise<void> => {
      if (!worldBuilder) {
        // TODO - what happens if the folder is deleted after this is called?  Do 
        //    we need to continually check or is the user just stupid?  Also, 
        //    can we lock it so prevent that?
        const folders = await getDefaultFolders();
        
        if (folders?.rootId && folders?.worldId) {
          // create the instance
          updateWorldBuilder(new WorldBuilder(folders.rootId, folders.worldId));
        } else {
          // we don't have valid folders, so just quit
          return;
        }
      }

      // render the main window
      worldBuilder.render(true);
    });
  }
}