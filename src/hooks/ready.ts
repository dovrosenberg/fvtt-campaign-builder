import { setupEnricher } from '@/components/Editor/helpers';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  // register handlebars helpers
  await loadTemplates([]);

  // setup the enricher
  setupEnricher();
}