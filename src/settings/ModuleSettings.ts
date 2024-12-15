import { getGame, localize } from '@/utils/game';
import { moduleId } from './index';

export enum SettingKey {
  // displayed in settings
  startCollapsed = 'startCollapsed',  // should the sidebar start collapsed when we open

  // internal only
  rootFolderId = 'rootFolderId',  // uuid of the root folder
  groupTreeByType = 'groupTreeByType',  // should the directory be grouped by type?
}

export type SettingKeyType<K extends SettingKey> =
    K extends SettingKey.startCollapsed ? boolean :
    K extends SettingKey.rootFolderId ? string : 
    K extends SettingKey.groupTreeByType ? boolean : 
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

  // note that this returns the object directly, so if it's an object or array, if a reference
  public get<T extends SettingKey>(setting: T): SettingKeyType<T> {
    return getGame().settings.get(moduleId, setting) as SettingKeyType<T>;
  }

  // this gets something safe to modify
  public getClone<T extends SettingKey>(setting: T): SettingKeyType<T> {
    return foundry.utils.deepClone(this.get(setting));
  }

  public async set<T extends SettingKey>(setting: T, value: SettingKeyType<T>): Promise<void> {
    await getGame().settings.set(moduleId, setting, value);
  }

  private register(settingKey: SettingKey, settingConfig: ClientSettings.RegisterOptions<string | boolean>) {
    getGame().settings.register(moduleId, settingKey, settingConfig);
  }

  private registerMenu(settingKey: SettingKey, settingConfig: ClientSettings.RegisterSubmenu) {
    getGame().settings.registerMenu(moduleId, settingKey, settingConfig);
  }

  // these are local menus (shown at top)
  private localMenuParams: (Partial<ClientSettings.SettingSubmenuConfig> & { settingID: SettingKey })[] = [
  ];

  // these are globals shown in the options
  // name and hint should be the id of a localization string
  private displayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
  ];

  // these are client-specific and displayed in settings
  private localDisplayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.startCollapsed,
      name: 'acm.settings.startCollapsed',
      hint: 'acm.settings.startCollapsedHelp',
      default: false,
      type: Boolean,
    },
  ];

  // these are globals only used internally
  private internalParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.rootFolderId,
      default: null,
      type: String,
    },

  ];
  
  // these are client-specfic only used internally
  private localInternalParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.groupTreeByType,
      default: false,
      type: Boolean,
    },
  ];

  private registerSettings(): void {
    for (let i=0; i<this.localMenuParams.length; i++) {
      const { settingID, ...settings} = this.localMenuParams[i];
      this.registerMenu(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        restricted: true,
      } as ClientSettings.RegisterSubmenu);
    }

    for (let i=0; i<this.displayParams.length; i++) {
      const { settingID, ...settings} = this.displayParams[i];
      this.register(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'world',
        config: true,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }

    for (let i=0; i<this.localDisplayParams.length; i++) {
      const { settingID, ...settings} = this.localDisplayParams[i];
      this.register(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'client',
        config: true,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }

    for (let i=0; i<this.internalParams.length; i++) {
      const { settingID, ...settings} = this.internalParams[i];
      this.register(settingID, {
        ...settings,
        scope: 'world',
        config: false,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }

    for (let i=0; i<this.localInternalParams.length; i++) {
      const { settingID, ...settings} = this.localInternalParams[i];
      this.register(settingID, {
        ...settings,
        scope: 'client',
        config: false,
      } as ClientSettings.RegisterOptions<string | boolean>);
    }
  }
}
