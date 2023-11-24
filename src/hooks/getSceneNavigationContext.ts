import { getGame, localize } from '@/utils/game';

export function registerForGetSceneNavContextHook() {
  Hooks.once('getSceneNavigationContext', getSceneNavigationContext);
}

async function getSceneNavigationContext(html, contextOptions): Promise<void> {
  //Find the expand/collapse button, we'll be inserting before that
  if (getGame().user?.isGM) {  // TODO : decide what the player view should be, if any
    const navToggleButton = html.find('#nav-toggle');
    const toolTip = localize('fwb.tooltips.main-button');
    navToggleButton.before(
        `<button id='fwb-launch' type="button" class="nav-item flex0" title="${toolTip}"><i class="fas fa-globe"></i></button>`
    );

    html.on('click', '#fwb-launch', (event) => {
      // render the main window
    });
  }
}
