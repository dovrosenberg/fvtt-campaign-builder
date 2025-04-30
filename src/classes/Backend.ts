import { version } from '@module'
import { Configuration, FCBApi } from '@/apiClient';
import { ModuleSettings, SettingKey } from '@/settings';
import { notifyGMError, notifyGMInfo, notifyGMWarn } from '@/utils/notifications';
import { localize } from '@/utils/game';

// this is the backend version that needs to be used with this version of the module
// generally, we'll try to keep them more or less in sync, at least at the minor release level
const REQUIRED_VERSION = '0.0.7';

// handles connections to the backend
export class Backend {
  static config: Configuration;
  static available: boolean;
  
  static api: FCBApi;

  static async configure() {
    Backend.available = false;

    Backend.config = new Configuration();
    Backend.config.accessToken = ModuleSettings.get(SettingKey.APIToken);
    Backend.config.basePath = ModuleSettings.get(SettingKey.APIURL);    

    // if both settings are blank, no need to do anything
    if (!Backend.config.accessToken && !Backend.config.basePath) {
      return;
    }

    // make sure credentials are valid by checking the version
    Backend.api = new FCBApi(Backend.config);

    let versionResult: Awaited<ReturnType<FCBApi['apiVersionGet']>>;

    try {
      versionResult = await Backend.api.apiVersionGet();
    } catch (e) {
      if (!ModuleSettings.get(SettingKey.hideBackendWarning)) 
        notifyGMError(localize('notifications.backend.failedConnection'));

      return;
    }

    // see if the backend version matches the front-end and throw an error if it doesn't

    // if the module version is dev - then just deal with it... maybe put up a warning
    switch (versionResult.data.version) {
      case (REQUIRED_VERSION):
        break;
      default:
        if (version === '#{VERSION}#') {
          // development version of front-end... do nothing (can't deploy through store with this version so it can only be a special case)
          notifyGMWarn(`Development module detected.  Connected to backend version ${versionResult.data.version} at ${Backend.config.basePath}`);
        } else {
          // anything else means the version is wrong
          // output a foundry error message
          notifyGMError(localize('notifications.backend.versionMismatch')
            .replace('$1', `${versionResult.data.version}`)
            .replace('$2', `${REQUIRED_VERSION}`));

          return;
        }; break;
      }
    
    // made it here - good to go!
    notifyGMInfo(localize('notifications.backend.successfulConnection'));
    Backend.available = true;
  }
}
