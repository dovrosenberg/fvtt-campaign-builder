import { getWorldBuilderApp } from '@/applications/WorldBuilder';
import { localize } from '@/utils/game';

export function registerForRenderSceneControlsHook() {
  Hooks.on('renderSceneControls', render);
}

async function render(): Promise<void> {
  if (game.user?.isGM) {  
    // make sure it's not there already - sometimes on 1st load this gets called multiple times
    const existingButton = jQuery(document).find('#wcb-launch');

    if (existingButton.length > 0)
      return;

    const navParent = jQuery(document).find('#ui-top #navigation');
    const toolTip = localize('tooltips.mainButton');
    navParent.prepend(
      `<button id='wcb-launch' type="button" class="nav-item flex0" title="${toolTip}"><i class="fas fa-globe"></i></button>`
    );

    jQuery(document).on('click', '#wcb-launch', async (): Promise<void> => {
      // create the instance and render 
      await getWorldBuilderApp().render(true);
    });
  }
}