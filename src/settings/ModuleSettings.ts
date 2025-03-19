import { localize } from '@/utils/game';
import { moduleId } from './index';
import { AdvancedSettingsApplication } from '@/applications/settings/AdvancedSettingsApplication';

export enum SettingKey {
  // displayed in settings
  startCollapsed = 'startCollapsed',  // should the sidebar start collapsed when we open

  // internal only
  rootFolderId = 'rootFolderId',  // uuid of the root folder
  groupTreeByType = 'groupTreeByType',  // should the directory be grouped by type?
  advancedSettingsMenu = 'advancedSettingsMenu',  // display the advanced setting menu
  APIURL = 'APIURL',   // URL of backend 
  APIToken = 'APIToken',
}

export type SettingKeyType<K extends SettingKey> =
    K extends SettingKey.startCollapsed ? boolean :
    K extends SettingKey.rootFolderId ? string : 
    K extends SettingKey.groupTreeByType ? boolean : 
    K extends SettingKey.advancedSettingsMenu ? never :
    K extends SettingKey.APIURL ? string :
    K extends SettingKey.APIToken ? string :
    never;  

export class ModuleSettings {
  // note that this returns the object directly, so if it's an object or array, if a reference
  public static get<T extends SettingKey>(setting: T): SettingKeyType<T> {
    return game.settings.get(moduleId, setting) as SettingKeyType<T>;
  }

  // this gets something safe to modify
  public static getClone<T extends SettingKey>(setting: T): SettingKeyType<T> {
    return foundry.utils.deepClone(ModuleSettings.get(setting));
  }

  public static async set<T extends SettingKey>(setting: T, value: SettingKeyType<T>): Promise<void> {
    // @ts-ignore - not sure how to fix the typing
    await game.settings.set(moduleId, setting, value as SettingKeyType<setting>);
  }

  private static registerSetting(settingKey: SettingKey, settingConfig: ClientSettings.RegisterOptions<string | boolean>) {
    game.settings.register(moduleId, settingKey, settingConfig);
  }

  private static registerMenu(settingKey: SettingKey, settingConfig: ClientSettings.RegisterSubmenu) {
    game.settings.registerMenu(moduleId, settingKey, settingConfig);
  }

  // these are global menus (shown at top)
  private static menuParams: (Partial<ClientSettings.SettingSubmenuConfig> & { settingID: SettingKey })[] = [
  ];

  // these are local menus (shown at top)
  private static localMenuParams: (Partial<ClientSettings.SettingSubmenuConfig> & { settingID: SettingKey })[] = [
    // we want this local because we don't want players to be able to see the GM's keys, etc.
    {
      settingID: 'ModuleSettingKeys.advancedSettingsMenu',
      name: 'settings.advanced',
      label: 'wcb.settings.advancedLabel',   // localized by Foundry
      hint: 'settings.advancedHelp',   
      icon: 'fas fa-bars',               // A Font Awesome icon used in the submenu button
      permissions: ['SETTINGS_WRITE'], // Optional: restrict to GM only
      type: AdvancedSettingsApplication,
    }
  ];

  // these are globals shown in the options
  // name and hint should be the id of a localization string
  private static displayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
  ];

  // these are client-specific and displayed in settings
  private static localDisplayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.startCollapsed,
      name: 'settings.startCollapsed',
      hint: 'settings.startCollapsedHelp',
      default: false,
      type: Boolean,
    },
  ];

  // these are globals only used internally
  private static internalParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.rootFolderId,
      default: null,
      type: String,
    },
    {
      settingID: SettingKey.APIURL,
      default: '',
      type: String,
    },
    {
      settingID: SettingKey.APIToken,
      default: '',
      type: String,
    },

  ];
  
  // these are client-specfic only used internally
  private static localInternalParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.groupTreeByType,
      default: false,
      type: Boolean,
    },
  ];

  public static register(): void {
    for (let i=0; i<ModuleSettings.menuParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.menuParams[i];

      ModuleSettings.registerMenu(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        restricted: false,
      });
    }

    for (let i=0; i<ModuleSettings.localMenuParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localMenuParams[i];
      ModuleSettings.registerMenu(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        restricted: true,
      } as ClientSettings.RegisterSubmenu);
    }

    for (let i=0; i<ModuleSettings.displayParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.displayParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'world',
        config: true,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }

    for (let i=0; i<ModuleSettings.localDisplayParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localDisplayParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'client',
        config: true,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }

    for (let i=0; i<ModuleSettings.internalParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.internalParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        scope: 'world',
        config: false,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }

    for (let i=0; i<ModuleSettings.localInternalParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localInternalParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        scope: 'client',
        config: false,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }
  }
}
