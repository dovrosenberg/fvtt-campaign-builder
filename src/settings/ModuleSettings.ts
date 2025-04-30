import { localize } from '@/utils/game';
import { moduleId } from './index';
import { AdvancedSettingsApplication } from '@/applications/settings/AdvancedSettingsApplication';
import { SpeciesListApplication } from '@/applications/settings/SpeciesListApplication';
import { RollTableSettingsApplication } from '@/applications/settings/RollTableSettingsApplication';
import { GeneratorConfig, SessionDisplayMode, Species, TagList } from '@/types';

export enum SettingKey {
  // displayed in main settings window
  startCollapsed = 'startCollapsed',  // should the sidebar start collapsed when we open
  displaySessionNotes = 'displaySessionNotes',  // should the session notes window automatically open
  sessionDisplayMode = 'sessionDisplayMode',  // how to display sessions in the directory
  hideBackendWarning = 'hideBackendWarning', // don't show the warning about no backend

  // internal only
  rootFolderId = 'rootFolderId',  // uuid of the root folder
  groupTreeByType = 'groupTreeByType',  // should the directory be grouped by type?
  isInPlayMode = 'isInPlayMode',  // stores the prep/play mode state
  generatorConfig = 'generatorConfig',  // stores the configuration for Foundry RollTable generators
  entryTags = 'entryTags',
  sessionTags = 'sessionTags',

  // menus
  advancedSettingsMenu = 'advancedSettingsMenu',  // display the advanced setting menu
  APIURL = 'APIURL',   // URL of backend
  APIToken = 'APIToken',
  defaultToLongDescriptions = 'defaultToLongDescriptions',

  rollTableSettingsMenu = 'rollTableSettingsMenu',  // display the roll table settings menu
  autoRefreshRollTables = 'autoRefreshRollTables',  // should roll tables be automatically refreshed on load

  speciesListMenu = 'speciesListMenu',  // display the species list screen
  speciesList = 'speciesList',
}

export type SettingKeyType<K extends SettingKey> =
    K extends SettingKey.startCollapsed ? boolean :
    K extends SettingKey.displaySessionNotes ? boolean :
    K extends SettingKey.sessionDisplayMode ? SessionDisplayMode :
    K extends SettingKey.rootFolderId ? string :
    K extends SettingKey.groupTreeByType ? boolean :
    K extends SettingKey.isInPlayMode ? boolean :
    K extends SettingKey.generatorConfig ? GeneratorConfig | null:
    K extends SettingKey.advancedSettingsMenu ? never :
    K extends SettingKey.APIURL ? string :
    K extends SettingKey.APIToken ? string :
    K extends SettingKey.defaultToLongDescriptions ? boolean :
    K extends SettingKey.rollTableSettingsMenu ? never :
    K extends SettingKey.autoRefreshRollTables ? boolean :
    K extends SettingKey.speciesList ? Species[] :
    K extends SettingKey.entryTags ? TagList :
    K extends SettingKey.sessionTags ? TagList :
    K extends SettingKey.hideBackendWarning ? boolean :
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
      settingID: SettingKey.advancedSettingsMenu,
      name: 'settings.advanced',
      label: 'fcb.settings.advancedLabel',   // localized by Foundry
      hint: 'settings.advancedHelp',
      icon: 'fas fa-bars',               // A Font Awesome icon used in the submenu button
      permissions: ['SETTINGS_WRITE'], // Optional: restrict to GM only
      type: AdvancedSettingsApplication,
    },
    {
      settingID: SettingKey.speciesListMenu,
      name: 'settings.speciesList',
      label: 'fcb.settings.speciesListLabel',   // localized by Foundry
      hint: 'settings.speciesListHelp',
      icon: 'fas fa-bars',               // A Font Awesome icon used in the submenu button
      permissions: ['SETTINGS_WRITE'], // Optional: restrict to GM only
      type: SpeciesListApplication,
    },
    {
      settingID: SettingKey.rollTableSettingsMenu,
      name: 'settings.rollTableSettings',
      label: 'fcb.settings.rollTableSettingsLabel',   // localized by Foundry
      hint: 'settings.rollTableSettingsHelp',
      icon: 'fas fa-bars',               // A Font Awesome icon used in the submenu button
      permissions: ['SETTINGS_WRITE'], // Optional: restrict to GM only
      type: RollTableSettingsApplication,
    }
  ];

  // these are globals shown in the options
  // name and hint should be the id of a localization string
  private static displayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.hideBackendWarning,
      default: false,
      name: 'settings.hideBackendWarning',   // localized by Foundry
      hint: 'settings.hideBackendWarningHelp',
      type: Boolean,
    },
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
    {
      settingID: SettingKey.displaySessionNotes,
      name: 'settings.displaySessionNotes',
      hint: 'settings.displaySessionNotesHelp',
      default: true,
      type: Boolean,
    },
    {
      settingID: SettingKey.sessionDisplayMode,
      name: 'settings.sessionDisplayMode',
      hint: 'settings.sessionDisplayModeHelp',
      default: SessionDisplayMode.Number,
      type: String,
      requiresReload: true,
      choices: {
        [SessionDisplayMode.Number]: 'fcb.settings.sessionDisplayModeOptions.number',
        [SessionDisplayMode.Date]: 'fcb.settings.sessionDisplayModeOptions.date',
        [SessionDisplayMode.Name]: 'fcb.settings.sessionDisplayModeOptions.name'
      }
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
      settingID: SettingKey.autoRefreshRollTables,
      default: false,
      type: Boolean,
    },
    {
      settingID: SettingKey.speciesList,
      default: [],
      type: Array,
    },
    {
      settingID: SettingKey.generatorConfig,
      default: null,
      type: Object,
    },
    {
      settingID: SettingKey.entryTags,
      default: {},
      type: Object,
    },
    {
      settingID: SettingKey.sessionTags,
      default: {},
      type: Object,
    },
    {
      settingID: SettingKey.APIURL,
      default: '',
      requiresReload: true,
      type: String,
    },
    {
      settingID: SettingKey.APIToken,
      default: '',
      requiresReload: true,
      type: String,
    },
    {
      settingID: SettingKey.defaultToLongDescriptions,
      default: true,
      type: Boolean,
    },
  ];
  
  // these are client-specific only used internally
  private static localInternalParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.groupTreeByType,
      default: false,
      type: Boolean,
    },
    {
      settingID: SettingKey.isInPlayMode,
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
