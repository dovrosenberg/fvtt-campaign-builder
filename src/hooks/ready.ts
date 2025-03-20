import { setupEnricher } from '@/components/Editor/helpers';
import { ModuleSettings, SettingKey } from '@/settings';
import { Species } from '@/types';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  // register handlebars helpers
  await loadTemplates([]);

  // setup the enricher
  setupEnricher();

  // load default species if not defined
  const speciesList = ModuleSettings.get(SettingKey.speciesList);
  if (!speciesList || speciesList.length === 0) {
    await loadDefaultSpecies();
  }
}

const loadDefaultSpecies = async () => {
  // from the SRD to stay within copyright rules
  const defaultSpecies = [
    {
      id: foundry.utils.randomID(),
      name: 'Dwarf',
      description: 'Stout and resilient, dwarves are known for their craftsmanship, endurance, and strong connection to mountains and stonework. They are typically short and stocky, with thick beards and sturdy builds that emphasize their toughness.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Elf',
      description: 'Graceful and long-lived, elves possess keen senses, a natural affinity for magic, and an enduring connection to nature. They are tall and slender, with pointed ears, angular features, and an otherworldly beauty.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Halfling',
      description: 'Small and nimble, halflings are cheerful and resourceful, known for their luck and ability to avoid danger. They are short, standing around three feet tall, with round faces, curly hair, and a friendly demeanor.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Human',
      description: 'Versatile and ambitious, humans adapt to any environment, excelling in a wide range of skills and professions. They vary widely in height, build, skin tone, and facial features, reflecting the diversity of their cultures.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Dragonborn',
      description: 'Proud and powerful, dragonborn are humanoid dragons with a strong sense of honor and an innate breath weapon. They are tall and muscular, covered in colorful scales, with reptilian heads, clawed hands, and tails.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Gnome',
      description: 'Curious and inventive, gnomes are small, intelligent beings with a love for magic and intricate craftsmanship. They are short, with large expressive eyes, pointed ears, and often sport wild or curly hair.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Half-Elf',
      description: 'Blending human versatility with elven grace, half-elves are charismatic and adaptable, fitting into both worlds yet fully belonging to neither. They have slightly pointed ears, angular facial features, and a mix of human and elven traits that vary by ancestry.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Half-Orc',
      description: 'Strong and tenacious, half-orcs inherit the endurance and fighting spirit of their orcish ancestry while often striving to prove themselves beyond it. They are tall and powerfully built, with green or gray skin, prominent lower tusks, and thick brows.'
    },
    {
      id: foundry.utils.randomID(),
      name: 'Tiefling',
      description: 'Marked by infernal heritage, tieflings possess fiendish traits, an innate resilience to fire, and a talent for magic. They have horns, tails, and unusual eye and skin colors, ranging from deep reds to purples and blues.'
    }
  ] as Species[];  

  await ModuleSettings.set(SettingKey.speciesList, defaultSpecies);
}