import { registerForInitHook } from './init';
import { registerForReadyHook } from './ready';
import { registerForUpdateHooks } from './updateDocuments';

export function registerForHooks() {
  registerForInitHook();
  registerForReadyHook();
  registerForUpdateHooks();
}
