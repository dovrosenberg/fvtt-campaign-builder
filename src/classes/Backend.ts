import { version } from '@module'
import { Configuration, FCBApi } from '@/apiClient';
import { ModuleSettings, SettingKey } from '@/settings';

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
      versionResult = await Backend._api.apiVersionGet();
    } catch (e) {
      ui.notifications?.notify(`Failed to connect to backend - check your "advanced" settings to make sure they properly match the backend server you deployed.  You'll be unable to used advanced features in the meantime.`, 'error');
      return;
    }

    // see if the backend version matches the front-end and throw an error if it doesn't

    // if the module version is dev - then just deal with it... maybe put up a warning
    switch (versionResult.data.version) {
      case (version):
        break;
      default:
        if (version === '#{VERSION}#') {
          // development version... do nothing (can't deploy through store with this version so it can only be a special case)
          ui.notifications?.notify(`Development module detected.  Connected to backend version ${versionResult.data.version} at ${Backend.config.basePath}`, 'warning');
        } else {
          // anything else means the version is wrong
          // output a foundry error message
          ui.notifications?.notify(`The version of your World & Campaign Builder backend (${versionResult.data.version}) doesn't match the version of the module you have installed (${version}).  Please update one or the other.  You'll be unable to used advanced features in the meantime.`, 'error');
          return;
        }; break;
      }
    
    // made it here - good to go!
    Backend.available = true;
  }
}
