import { WorldBuilderApplication} from '@/applications/WorldBuilder';
import { localize } from '@/utils/game';
import { setupEnricher } from '@/components/Editor/helpers';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  // register handlebars helpers
  await loadTemplates([]);

  if (game.user?.isGM) {  
    const navToggleButton = jQuery(document).find('#nav-toggle');
    const toolTip = localize('tooltips.mainButton');
    navToggleButton.before(
      `<button id='fwb-launch' type="button" class="nav-item flex0" title="${toolTip}"><i class="fas fa-globe"></i></button>`
    );

    jQuery(document).on('click', '#fwb-launch', async (): Promise<void> => {
      // create the instance and render 
      await (await new WorldBuilderApplication()).render(true);
    });
  }

  // setup the enricher
  setupEnricher();
}