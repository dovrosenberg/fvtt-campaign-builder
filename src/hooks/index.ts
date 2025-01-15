import { registerFori18nInitHook } from './i18Init';
import { registerForInitHook } from './init';
import { registerForReadyHook } from './ready';
import { registerForRenderSceneControlsHook } from './renderSceneControls';

export function registerForHooks() {
  registerForInitHook();
  registerForReadyHook();
  registerFori18nInitHook();
  registerForRenderSceneControlsHook();
}
