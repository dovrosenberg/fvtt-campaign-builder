import {type DevModeApi} from '@/libraries/foundry/devMode';
import { moduleId } from '@/settings';

// log the given text, so long as our current log level is at least the one given
declare global {
  interface RequiredModules {
    '_dev-mode': true;
  }

  interface ModuleConfig {
    '_dev_mode': {
      api: DevModeApi;
    };
  }
}

export function log(force: boolean, ...args): void {
  try {
    const messagePrefix = `${moduleId} | `;
    const isDebugging = game.modules.get('_dev-mode')?.api?.getPackageDebugValue(moduleId) || false;

    if (force || isDebugging) {
      console.log(messagePrefix, ...args);
    }
  } catch (e) {
    // eslint-ignore-next-line
    console.log('ERROR IN LOG FUNCTION:' + e);
  }
}


