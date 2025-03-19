import moduleJson from '@module';
import { ModuleSettings, SettingKey } from '@/settings';

export class AdvancedSettingsApplication extends FormApplication {
  constructor(object, options) {
    super(object, options);
  }

  // window options; called by parent class
  static get defaultOptions() {
    const options = super.defaultOptions;
    
    options.template = `modules/${moduleJson.id}/templates/advanced-settings.hbs`;
    // options.popOut = false;  // self-contained window without the extra wrapper
    // options.resizable = false;  // window is fixed size

    return options;
  }

  public async getData(): Promise<any> {
    const data = {
      currentURL: ModuleSettings.get(SettingKey.APIURL),
      currentAPIToken: ModuleSettings.get(SettingKey.APIToken),
    }

    return data;
  }

  public async _updateObject(_event, formData: Record<string, string>): Promise<void> {
    await ModuleSettings.set(SettingKey.APIURL, formData.APIURL);
    await ModuleSettings.set(SettingKey.APIToken, formData.APIToken);
  }
}