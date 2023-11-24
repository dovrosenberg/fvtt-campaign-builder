import { getGame } from '@/utils/game';

const messagePrefix = 'autocomplete-mentions | ';

// log the given text, so long as our current log level is at least the one given
export function log(force: boolean, ...args): void {
  try {
    const isDebugging = getGame().modules.get('_dev-mode')?.api?.getPackageDebugValue('autocomplete-mentions') || false;

    if (force || isDebugging) {
      console.log(messagePrefix, ...args);
    }
  } catch (e) {
    // eslint-ignore-next-line
    console.log('ERROR IN LOG FUNCTION:' + e);
  }
}


