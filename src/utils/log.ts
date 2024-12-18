import { id as moduleId } from '@module';
import {type DevModeApi} from '@/libraries/foundry/devMode';
const messagePrefix = `${moduleId} | `;

// log the given text, so long as our current log level is at least the one given
declare global {
  interface ModuleConfig {
    '_dev_mode': {
      api: DevModeApi;
    };
  }
}

export function log(force: boolean, ...args): void {
  try {
    const isDebugging = game.modules.get('_dev-mode')?.api?.getPackageDebugValue(moduleId) || false;

    if (force || isDebugging) {
      console.log(messagePrefix, ...args);
    }
  } catch (e) {
    // eslint-ignore-next-line
    console.log('ERROR IN LOG FUNCTION:' + e);
  }
}


