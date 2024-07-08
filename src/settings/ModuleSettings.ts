import { getGame, localize } from '@/utils/game';
import moduleJson from '@module';
import { Topic } from '@/types';

export enum SettingKey {
  // displayed in settings
  startCollapsed = 'startCollapsed',  // should the sidebar start collapsed when we open

  // internal only
  rootFolderId = 'rootFolderId',  // uuid of the root folder
  types = 'types',  // object where each key is a Topic and the value is an array of valid types
  packTopNodes = 'packTopNodes',  // maps compendium id to array of top-level nodes 
  packTopics = 'packTopics',    // maps compendium id to the topics it contains
}

type SettingType<K extends SettingKey> =
    K extends SettingKey.startCollapsed ? boolean :
    K extends SettingKey.rootFolderId ? string : 
    K extends SettingKey.types ? Record<Topic, string[]> :
    K extends SettingKey.packTopNodes ? Record<string, string[]> :   // keyed by compendium id
    K extends SettingKey.packTopics ? Record<string, Topic> :   // keyed by compendium id
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
  public get<T extends SettingKey>(setting: T): SettingType<T> {
    return getGame().settings.get(moduleJson.id, setting) as SettingType<T>;
  }

  // this gets something safe to modify
  public getClone<T extends SettingKey>(setting: T): SettingType<T> {
    return foundry.utils.deepClone(this.get(setting));
  }

  public async set<T extends SettingKey>(setting: T, value: SettingType<T>): Promise<void> {
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
  ];

  // these are client-specific and displayed in settings
  private localDisplayParams: (ClientSettings.PartialSettingConfig & { settingID: string })[] = [
    {
      settingID: SettingKey.startCollapsed,
      name: 'acm.settings.startCollapsed',
      hint: 'acm.settings.startCollapsedHelp',
      default: false,
      type: Boolean,
    },
  ];

  // these are globals only used internally
  private internalParams: (ClientSettings.PartialSettingConfig & { settingID: string })[] = [
    {
      settingID: SettingKey.rootFolderId,
      default: null,
      type: String,
    },
    {
      settingID: SettingKey.types,
      default: {
        [Topic.Character]: [],
        [Topic.Location]: [],
        [Topic.Event]: [],
        [Topic.Organization]: [],
      },
      type: Object,
    },
    {
      settingID: SettingKey.packTopNodes,
      default: {},
      type: Object,
    },
    {
      settingID: SettingKey.packTopics,
      default: {},
      type: Object,
    },

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
