import { version } from '@module'
import { Configuration, FCBApi } from '@/apiClient';
import { ModuleSettings, SettingKey } from '@/settings';

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
        ui.notifications?.notify(`Failed to connect to backend - check your "advanced" settings to make sure they properly match the backend server you deployed.  You'll be unable to used advanced features in the meantime.`, 'error');

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
          ui.notifications?.notify(`Development module detected.  Connected to backend version ${versionResult.data.version} at ${Backend.config.basePath}`, 'warning');
        } else {
          // anything else means the version is wrong
          // output a foundry error message
          ui.notifications?.notify(`The version of your World & Campaign Builder backend (${versionResult.data.version}) doesn't match the version required by 
            the module version you have installed (${REQUIRED_VERSION}).  Please update one or the other (or both).  You'll be unable to used advanced features in the meantime.`, 'error');
          return;
        }; break;
      }
    
    // made it here - good to go!
    Backend.available = true;
  }
}
