import { getGame, localize } from '@/utils/game';
import moduleJson from '@module';

export enum SettingKeys {
  // displayed in settings
  resultLength = 'resultLength',

  // internal only
}

type SettingType<K extends SettingKeys> =
    K extends SettingKeys.resultLength ? number :
    never;  

// the solo instance
export let moduleSettings: ModuleSettings;

// set the main application; should only be called once
export function updateModuleSettings(settings: ModuleSettings): void {
  moduleSettings = settings;
}

export class ModuleSettings {
  constructor() {
    this.registerSettings();
  }

  public isSettingValueEmpty(setting: any): boolean {
    return Object.keys(setting).length === 0 || setting === null || setting === undefined;
  }

  public get<T extends SettingKeys>(setting: T): SettingType<T> {
    return getGame().settings.get(moduleJson.id, setting) as SettingType<T>;
  }

  public async set<T extends SettingKeys>(setting: T, value: SettingType<T>): Promise<void> {
    await getGame().settings.set(moduleJson.id, setting, value);
  }

  private register(settingKey: string, settingConfig: ClientSettings.PartialSettingConfig) {
    getGame().settings.register(moduleJson.id, settingKey, settingConfig);
  }

  private registerMenu(settingKey: string, settingConfig: ClientSettings.PartialSettingSubmenuConfig) {
    getGame().settings.registerMenu(moduleJson.id, settingKey, settingConfig);
  }

  // these are local menus (shown at top)
  private localMenuParams: (ClientSettings.PartialSettingSubmenuConfig & { settingID: string })[] = [
  ];

  // these are globals shown in the options
  // name and hint should be the id of a localization string
  private displayParams: (ClientSettings.PartialSettingConfig & { settingID: string })[] = [
    {
      settingID: SettingKeys.resultLength,
      name: 'acm.settings.resultLength',
      hint: 'acm.settings.resultLengthHelp',
      default: 5,
      type: Number,
    },
  ];

  // these are client-specific and displayed in settings
  private localDisplayParams: (ClientSettings.PartialSettingConfig & { settingID: string })[] = [
  ];

  // these are globals only used internally
  private internalParams: (ClientSettings.PartialSettingConfig & { settingID: string })[] = [
  ];
  
  // these are client-specfic only used internally
  private localInternalParams: (ClientSettings.PartialSettingConfig & { settingID: string })[] = [
  ];

  private registerSettings(): void {
    for (let i=0; i<this.localMenuParams.length; i++) {
      const { settingID, ...settings} = this.localMenuParams[i];
      this.registerMenu(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        restricted: true,
      });
    }

    for (let i=0; i<this.displayParams.length; i++) {
      const { settingID, ...settings} = this.displayParams[i];
      this.register(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'world',
        config: true,
      });
    }

    for (let i=0; i<this.localDisplayParams.length; i++) {
      const { settingID, ...settings} = this.localDisplayParams[i];
      this.register(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'client',
        config: true,
      });
    }

    for (let i=0; i<this.internalParams.length; i++) {
      const { settingID, ...settings} = this.internalParams[i];
      this.register(settingID, {
        ...settings,
        scope: 'world',
        config: false,
      });
    }

    for (let i=0; i<this.localInternalParams.length; i++) {
      const { settingID, ...settings} = this.localInternalParams[i];
      this.register(settingID, {
        ...settings,
        scope: 'client',
        config: false,
      });
    }
  }
}
