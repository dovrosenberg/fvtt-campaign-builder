import { registerFori18nInitHook } from './i18Init';
import { registerForInitHook } from './init';
import { registerForReadyHook } from './ready';
import { registerForUpdateActorHook } from './updateActor';

export function registerForHooks() {
  registerForInitHook();
  registerForReadyHook();
  registerFori18nInitHook();
  registerForUpdateActorHook();
}
