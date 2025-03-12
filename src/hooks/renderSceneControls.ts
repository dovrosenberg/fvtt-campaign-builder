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

    const sceneNav = jQuery(document).find('#scene-navigation');

    // sometimes this is called before the toolbar is loaded
    if (sceneNav.length === 0)
      return;
    
    const toolTip = localize('tooltips.mainButton');
    const button = jQuery(`<button id='wcb-launch' type="button" class="scene-navigation-menu" style="flex:0 1 20px; pointer-events: auto" title="${toolTip}"><i class="fas fa-globe"></i></button>`);

    // put the button before the nav
    sceneNav.before(button);

    // wrap both in a new flexrow
    button.add(sceneNav).wrapAll(`<div id="wcb-launch-wrapper" class="flexrow" style="align-items: flex-start"></div>`);

    button.on('click', null, async (): Promise<void> => {
      // create the instance and render 
      await getWorldBuilderApp().render(true);
    });
  }
}