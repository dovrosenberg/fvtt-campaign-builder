import { localize } from '@/utils/game';
import { moduleId } from './index';
import { AdvancedSettingsApplication } from '@/applications/settings/AdvancedSettingsApplication';
import { CustomFieldsApplication } from '@/applications/settings/CustomFieldsApplication';
import { SpeciesListApplication } from '@/applications/settings/SpeciesListApplication';
import { ImageSettingsApplication } from '@/applications/settings/ImageSettingsApplication';
import { RollTableSettingsApplication } from '@/applications/settings/RollTableSettingsApplication';
import { StoryWebSettingsApplication } from '@/applications/settings/StoryWebSettingsApplication';
import { ApiCustomGenerateImagePostRequestImageConfiguration, ApiCustomGenerateImagePostRequestImageModelEnum, ApiCustomGenerateImagePostRequestTextModelEnum } from '@/apiClient';
import { StoryWebNodeTypes, SessionDisplayMode, Species, TagList, GeneratorType, SettingIndex, CustomFieldContentType, CustomFieldDescription, } from '@/types';

export type ImageConfiguration = ApiCustomGenerateImagePostRequestImageConfiguration & {
  descriptionField?: string;
};

export interface ImageVisibility {
  settings: boolean;
  entries: boolean;
  campaigns: boolean;
  arcs: boolean;
  sessions: boolean;
  fronts: boolean;
}

 export interface WindowBounds {
   left: number;
   top: number;
   width: number;
   height: number;
   maximized?: boolean;
 }

export enum SettingKey {
  // displayed in main settings window
  startCollapsed = 'startCollapsed',  // should the sidebar start collapsed when we open
  displaySessionNotes = 'displaySessionNotes',  // should the session notes window automatically open
  sessionDisplayMode = 'sessionDisplayMode',  // how to display sessions in the directory
  hideBackendWarning = 'hideBackendWarning', // don't show the warning about no backend
  defaultAddToSession = 'defaultAddToSession', // default state of "Add to current session" checkbox
  enableToDoList = 'enableToDoList', // whether the to-do list feature is enabled
  autoRelationships = 'autoRelationships', // whether to automatically suggest relationship changes based on editor
  showTypesInTree = 'showTypesInTree', // show the type of the entry in the hierarchy tree
  useFronts = 'useFronts', // allow creation and viewing of fronts
  useWebs = 'useWebs', // allow creation and viewing of story webs
  subTabsSavePosition = 'subTabsSavePosition', // whether sub-tabs remember their last position
  storyWebAutoArrange = 'storyWebAutoArrange', // whether to enable physics in story webs
  genericFoundryTab = 'genericFoundryTab', // whether to show the generic Foundry tab on entries

  // internal only
  rootFolderId = 'rootFolderId',  // uuid of the root folder
  groupTreeByType = 'groupTreeByType',  // should the directory be grouped by type?
  isInPlayMode = 'isInPlayMode',  // stores the prep/play mode state
  contentTags = 'contentTags',  // tags for all content types
  lastKnownVersion = 'lastKnownVersion',  // tracks the last known module version - used for tracking migrations
  settingIndex = 'settingIndex',  // array of high-level setting info (name, packId)
  mainWindowBounds = 'mainWindowBounds',

  // menus
  advancedSettingsMenu = 'advancedSettingsMenu',  // display the advanced setting menu
  APIURL = 'APIURL',   // URL of backend
  APIToken = 'APIToken',
  selectedTextModel = 'selectedTextModel', // selected text generation model
  selectedImageModel = 'selectedImageModel', // selected image generation model
  useGmailToDos = 'useGmailToDos', // whether to use Gmail for todos
  emailDefaultSetting = 'emailDefaultWorld', // default setting for email features
  emailDefaultCampaign = 'emailDefaultCampaign', // default campaign for email features

  customFieldsMenu = 'customFieldsMenu',
  customFields = 'customFields',  // mapping of CustCustomFieldContentType to CustomFieldType
  aiImagePrompts = 'aiImagePrompts', // AI image generation prompts per content type
  aiImageConfigurations = 'aiImageConfigurations', // AI image generation configurations per content type

  rollTableSettingsMenu = 'rollTableSettingsMenu',  // display the roll table settings menu
  autoRefreshRollTables = 'autoRefreshRollTables',  // should roll tables be automatically refreshed on load
  generatorDefaultTypes = 'generatorDefaultTypes',  // default types for generators when creating entries

  speciesListMenu = 'speciesListMenu',  // display the species list screen
  speciesList = 'speciesList',

  // image visibility settings
  imageMenu = 'imageMenu', // display the image visibility menu
  showImages = 'showImages', // whether to show images on settings, campaigns, etc

  // story graph connections settings
  storyWebSettingsMenu = 'storyWebSettingsMenu', // display the story graph connections menu
  storyWebConnectionColors = 'storyWebConnectionColors', // predefined colors for edges
  storyWebConnectionStyles = 'storyWebConnectionStyles', // predefined styles for edges
  storyWebNodeFields = 'storyWebNodeFields', // selected fields to display in node tooltips by content type
}

export type SettingKeyType<K extends SettingKey> =
    K extends SettingKey.startCollapsed ? boolean :
    K extends SettingKey.displaySessionNotes ? boolean :
    K extends SettingKey.sessionDisplayMode ? SessionDisplayMode :
    K extends SettingKey.rootFolderId ? string :
    K extends SettingKey.groupTreeByType ? boolean :
    K extends SettingKey.isInPlayMode ? boolean :
    K extends SettingKey.autoRelationships ? boolean :
    K extends SettingKey.showTypesInTree ? boolean :
    K extends SettingKey.useFronts ? boolean :
    K extends SettingKey.useWebs ? boolean :
    K extends SettingKey.subTabsSavePosition ? boolean :
    K extends SettingKey.storyWebAutoArrange ? boolean :
    K extends SettingKey.genericFoundryTab ? boolean :
    K extends SettingKey.advancedSettingsMenu ? never :
    K extends SettingKey.customFieldsMenu ? never :
    K extends SettingKey.APIURL ? string :
    K extends SettingKey.APIToken ? string :
    K extends SettingKey.selectedTextModel ? ApiCustomGenerateImagePostRequestTextModelEnum :
    K extends SettingKey.selectedImageModel ? ApiCustomGenerateImagePostRequestImageModelEnum :
    K extends SettingKey.defaultAddToSession ? boolean :
    K extends SettingKey.rollTableSettingsMenu ? never :
    K extends SettingKey.autoRefreshRollTables ? boolean :
    K extends SettingKey.generatorDefaultTypes ? Record<GeneratorType, string> :
    K extends SettingKey.speciesList ? Species[] :
    K extends SettingKey.imageMenu ? never :
    K extends SettingKey.showImages ? ImageVisibility :
    K extends SettingKey.storyWebSettingsMenu ? never :
    K extends SettingKey.storyWebConnectionColors ? { id: string; name: string; value: string }[] :
    K extends SettingKey.storyWebConnectionStyles ? { id: string; name: string; value: string }[] :
    K extends SettingKey.storyWebNodeFields ? Partial<Record<StoryWebNodeTypes, string[]>> :
    K extends SettingKey.aiImagePrompts ? Record<CustomFieldContentType, string> :
    K extends SettingKey.aiImageConfigurations ? Record<CustomFieldContentType, ImageConfiguration> :
    K extends SettingKey.contentTags ? TagList :
    K extends SettingKey.lastKnownVersion ? string :
    K extends SettingKey.settingIndex ? SettingIndex[] :
    K extends SettingKey.customFields ? Record<CustomFieldContentType, CustomFieldDescription[]> :
    K extends SettingKey.hideBackendWarning ? boolean :
    K extends SettingKey.enableToDoList ? boolean :
    K extends SettingKey.useGmailToDos ? boolean :
    K extends SettingKey.emailDefaultSetting ? string :
    K extends SettingKey.emailDefaultCampaign ? string :
    K extends SettingKey.mainWindowBounds ? WindowBounds | null :
    never;  

export class ModuleSettings {
  // note that this returns the object directly, so if it's an object or array, it's a reference
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

  private static registerSetting(settingKey: SettingKey, settingConfig: ClientSettings.RegisterData<string | boolean, 'campaign-builder', any>) {
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
      settingID: SettingKey.customFieldsMenu,
      name: 'settings.customFields',
      label: 'fcb.settings.customFieldsLabel',   // localized by Foundry
      hint: 'settings.customFieldsHelp',
      icon: 'fas fa-list',
      permissions: ['SETTINGS_WRITE'],
      type: CustomFieldsApplication,
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
    },
    {
      settingID: SettingKey.imageMenu,
      name: 'settings.images',
      label: 'fcb.settings.imagesLabel',   // localized by Foundry
      hint: 'settings.imagesHelp',
      icon: 'fas fa-image',               // A Font Awesome icon used in the submenu button
      permissions: ['SETTINGS_WRITE'], // Optional: restrict to GM only
      type: ImageSettingsApplication,
    },
    {
      settingID: SettingKey.storyWebSettingsMenu,
      name: 'settings.storyWebSettings',
      label: 'fcb.settings.storyWebSettingsLabel',   // localized by Foundry
      hint: 'settings.storyWebSettingsHelp',
      icon: 'fa-solid fa-project-diagram',
      permissions: ['SETTINGS_WRITE'],
      type: StoryWebSettingsApplication,
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
    {
      settingID: SettingKey.useFronts,
      name: 'settings.useFronts',
      hint: 'settings.useFrontsHelp',
      requiresReload: true,
      default: true,
      type: Boolean,
    },
    {
      settingID: SettingKey.useWebs,
      name: 'settings.useWebs',
      hint: 'settings.useWebsHelp',
      requiresReload: true,
      default: true,
      type: Boolean,
    },
  ];

  // these are client-specific and displayed in settings
  private static localDisplayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      settingID: SettingKey.showTypesInTree,
      name: 'settings.showTypesInTree',
      hint: 'settings.showTypesInTreeHelp',
      default: false,
      type: Boolean,
    },
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
      settingID: SettingKey.defaultAddToSession,
      name: 'settings.defaultAddToSession',
      hint: 'settings.defaultAddToSessionHelp',
      default: true,
      type: Boolean,
    },
    {
      settingID: SettingKey.enableToDoList,
      name: 'settings.enableToDoList',
      hint: 'settings.enableToDoListHelp',
      default: true,
      type: Boolean,
    },
    {
      settingID: SettingKey.autoRelationships,
      name: 'settings.autoRelationships',
      hint: 'settings.autoRelationshipsHelp',
      default: true,
      type: Boolean,
    },
    {
      settingID: SettingKey.subTabsSavePosition,
      name: 'settings.subTabsSavePosition',
      hint: 'settings.subTabsSavePositionHelp',
      default: true,
      type: Boolean,
    },
    {
      settingID: SettingKey.storyWebAutoArrange,
      name: 'settings.storyWebAutoArrange',
      hint: 'settings.storyWebAutoArrangeHelp',
      default: true,
      requiresReload: true,
      type: Boolean,
    },
    {
      settingID: SettingKey.genericFoundryTab,
      name: 'settings.genericFoundryTab',
      hint: 'settings.genericFoundryTabHelp',
      default: false,
      requiresReload: true,
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
      settingID: SettingKey.generatorDefaultTypes,
      default: {
        [GeneratorType.NPC]: 'NPC',
        [GeneratorType.Town]: 'Town',
        [GeneratorType.Store]: 'Store',
        [GeneratorType.Tavern]: 'Tavern',
      },
      type: Object,
    },
    {
      settingID: SettingKey.contentTags,
      default: {},
      type: Object,
    },
    {
      settingID: SettingKey.lastKnownVersion,
      default: '',
      type: String,
    },
    {
      settingID: SettingKey.settingIndex,
      default: [],
      type: Array,
    },
    {
      settingID: SettingKey.customFields,
      default: {},  // note: this is important to default to this so that ready hook can know to reset it
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
      settingID: SettingKey.selectedTextModel,
      default: '',
      type: String,
    },
    {
      settingID: SettingKey.selectedImageModel,
      default: '',
      type: String,
    },
    {
      settingID: SettingKey.useGmailToDos,
      default: false,
      type: Boolean,
    },
    {
      settingID: SettingKey.emailDefaultSetting,
      default: '',
      type: String,
    },
    {
      settingID: SettingKey.emailDefaultCampaign,
      default: '',
      type: String,
    },
    {
      settingID: SettingKey.showImages,
      default: {
        settings: true,
        entries: true,
        campaigns: true,
        arcs: true,
        sessions: true,
        fronts: true,
      },
      type: Object,
    },
    {
      settingID: SettingKey.aiImagePrompts,
      default: {},
      type: Object,
    },
    {
      settingID: SettingKey.aiImageConfigurations,
      default: {},
      type: Object,
    },
    {
      settingID: SettingKey.storyWebConnectionColors,
      default: [
        // get the primary color from the theme
        { id: 'normal', name: 'Normal', value: getComputedStyle(document.body).getPropertyValue('--fcb-primary') },
      ],
      type: Array,
    },
    {
      settingID: SettingKey.storyWebConnectionStyles,
      default: [
        { id: 'solid', name: 'Solid', value: 'solid' },
        { id: 'dashed', name: 'Dashed', value: 'dashed' },
        { id: 'dotted', name: 'Dotted', value: 'dotted' },
        { id: 'dash_dot', name: 'Dash-Dot', value: 'dash_dot' },
        { id: 'long_dash', name: 'Long Dash', value: 'long_dash' },
        { id: 'dense_dot', name: 'Dense Dot', value: 'dense_dot' },
      ],
      type: Array,
    },
    {
      settingID: SettingKey.storyWebNodeFields,
      default: {},
      type: Object,
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
    {
      settingID: SettingKey.mainWindowBounds,
      default: null,
      type: Object,
    },
  ];

  public static register(): void {
    for (let i=0; i<ModuleSettings.menuParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.menuParams[i];

      ModuleSettings.registerMenu(settingID, {
        ...settings,        
        name: settings.name ? localize(settings.name) as string : '',
        hint: settings.hint ? localize(settings.hint) as string : '',
        restricted: false,
      } as ClientSettings.RegisterSubmenu);
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
      } as ClientSettings.RegisterData<string | boolean, 'campaign-builder', any>);
    }

    for (let i=0; i<ModuleSettings.localDisplayParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localDisplayParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'client',
        config: true,
      } as ClientSettings.RegisterData<string | boolean, 'campaign-builder', any>);
    }

    for (let i=0; i<ModuleSettings.internalParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.internalParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        scope: 'world',
        config: false,
      } as ClientSettings.RegisterData<string | boolean, 'campaign-builder', any>);
    }

    for (let i=0; i<ModuleSettings.localInternalParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localInternalParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        scope: 'client',
        config: false,
      } as ClientSettings.RegisterData<string | boolean, 'campaign-builder', any>);
    }
  }
}
