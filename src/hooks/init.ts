import { ModuleSettings, updateModuleSettings } from '@/settings/ModuleSettings';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  updateModuleSettings(new ModuleSettings());  
}
