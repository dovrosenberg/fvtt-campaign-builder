import { WorldBuilder, updateWorldBuilder } from '@/applications/WorldBuilder';
import { worldBuilder } from "@/applications/WorldBuilder";
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

    jQuery(document).on('click', '#fwb-launch', (event) => {
      // render the main window
      worldBuilder.render(true);
    });
  }

  // create the instance
  updateWorldBuilder(new WorldBuilder());
}