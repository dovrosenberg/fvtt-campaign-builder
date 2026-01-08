import { registerForInitHook } from './init';
import { registerForReadyHook } from './ready';
import { registerForUpdateHooks } from './updateDocuments';

export function registerForHooks() {
  registerForInitHook();
  registerForReadyHook();
  registerForUpdateHooks();

  // register quench tests in development mode
  if (import.meta.env.MODE === 'development') {
    void import('@unittest/index');
  }
}
