import { registerForHooks } from '@/hooks';
import { moduleId } from '@/settings';
import { DevModeApi } from '@/libraries/foundry/devMode';


/**
* Register module in Developer Mode module (https://github.com/League-of-Foundry-Developers/foundryvtt-devMode)
* No need to spam the console more than it already is, we hide them between a flag.
*/
// note: for the logs to actually work, you have to activate it in the UI under the config for the developer mode module
Hooks.once('devModeReady', async ({ registerPackageDebugFlag: registerPackageDebugFlag }: DevModeApi) => {
  void registerPackageDebugFlag(moduleId, 'boolean');
  //CONFIG.debug.hooks = true;
});

registerForHooks();
