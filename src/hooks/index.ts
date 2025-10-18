import { registerForInitHook } from './init';
import { registerForReadyHook } from './ready';
import { registerForUpdateHooks } from './updateDocuments';
import { registerFori18nHook } from './i18n';

export function registerForHooks() {
  registerForInitHook();
  registerForReadyHook();
  registerForUpdateHooks();
  registerFori18nHook();
}
