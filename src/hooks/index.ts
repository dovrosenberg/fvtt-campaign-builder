import { registerFori18nInitHook } from './i18Init';
import { registerForInitHook } from './init';
import { registerForReadyHook } from './ready';
import { registerForGetSceneNavContextHook } from './getSceneNavigationContext';

export function registerForHooks() {
    registerForInitHook();
    registerForReadyHook();
    registerFori18nInitHook();
    registerForGetSceneNavContextHook();
}
