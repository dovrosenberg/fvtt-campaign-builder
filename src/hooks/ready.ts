import { setupEnricher } from '@/components/Editor/helpers';
import { ModuleSettings, SettingKey } from '@/settings';
import { getCampaignBuilderApp } from '@/applications/CampaignBuilder';
import { localize } from '@/utils/game';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  // register handlebars helpers
  await foundry.applications.handlebars.loadTemplates([]);

  // setup the enricher
  setupEnricher();

  // load default species if not defined
  const speciesList = ModuleSettings.get(SettingKey.speciesList);
  if (!speciesList || speciesList.length === 0) {
    await loadDefaultSpecies();
  }

  await addMainButton();
}

const loadDefaultSpecies = async () => {
  // localized strings are from the SRD to stay within copyright rules
  const list = ['dwarf', 'elf', 'halfling', 'human', 'dragonborn', 'gnome', 'half-elf', 'half-orc', 'tiefling'];
  
  const defaultSpecies = list.map(s => {
    return {
      id: foundry.utils.randomID(),
      name: localize(`applications.speciesList.defaultSpecies.${s}.name`),
      description: localize(`applications.speciesList.defaultSpecies.${s}.description`),
    };
  });

  await ModuleSettings.set(SettingKey.speciesList, defaultSpecies);
}

async function addMainButton(): Promise<void> {
  if (game.user?.isGM) {  
    // make sure it's not there already - sometimes on 1st load this gets called multiple times
    const existingButton = jQuery(document).find('#fcb-launch');

    if (existingButton.length > 0)
      return;

    const sceneNav = jQuery(document).find('#scene-navigation');

    // sometimes this is called before the toolbar is loaded
    if (sceneNav.length === 0)
      return;
    
    const toolTip = localize('tooltips.mainButton');
    const button = jQuery(`<button id='fcb-launch' type="button" class="scene-navigation-menu" style="flex:0 1 20px; pointer-events: auto" title="${toolTip}"><i class="fas fa-globe"></i></button>`);

    // put the button before the nav
    sceneNav.before(button);

    // wrap both in a new flexrow
    button.add(sceneNav).wrapAll(`<div id="fcb-launch-wrapper" class="flexrow" style="align-items: flex-start"></div>`);

    button.on('click', null, async (): Promise<void> => {
      // create the instance and render 
      await getCampaignBuilderApp().render(true);
    });
  }
}