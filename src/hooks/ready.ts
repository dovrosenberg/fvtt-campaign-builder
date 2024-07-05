import { worldBuilder, updateWorldBuilder, WorldBuilderApplication} from '@/applications/WorldBuilder';
import { getDefaultFolders } from '@/compendia';
import { getGame, localize } from '@/utils/game';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  // register handlebars helpers
  await loadTemplates([]);

  if (getGame().user?.isGM) {  
    const navToggleButton = jQuery(document).find('#nav-toggle');
    const toolTip = localize('fwb.tooltips.mainButton');
    navToggleButton.before(
      `<button id='fwb-launch' type="button" class="nav-item flex0" title="${toolTip}"><i class="fas fa-globe"></i></button>`
    );

    jQuery(document).on('click', '#fwb-launch', async (): Promise<void> => {
      if (!worldBuilder) {
        // create the instance
        updateWorldBuilder(await new WorldBuilderApplication());
      }

      // render the main window
      void worldBuilder.render(true);
    });
  }
}