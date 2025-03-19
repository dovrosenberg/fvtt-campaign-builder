import { version } from '@module'
import { Configuration, FCBApi } from 'src/apiClient';
import { ModuleSettings, SettingKey } from 'src/settings';

// handles connections to the backend
export class Backend {
  static config: Configuration;
  static available: boolean;

  private static _api: FCBApi;

  static configure() {
    Backend.config = new Configuration();
    Backend.config.accessToken = ModuleSettings.get(SettingKey.APIToken);
    Backend.config.basePath = ModuleSettings.get(SettingKey.APIURL);    
    Backend._api = new FCBApi(Backend.config);

    Backend.available = true;

    // see if the backend version matches the front-end and throw an error if it doesn't
    const versionResult = await Backend._api.apiVersionGet();

    // if the module version is dev - then just deal with it... maybe put up a warning
    #{VERSION}#
    if (versionResult.data.version !== version) {
      throw
      
    }
    _

  }
}
