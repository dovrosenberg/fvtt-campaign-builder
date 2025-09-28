import { id } from '@module';
import { SettingKey, SettingKeyType } from './ModuleSettings';
import { CampaignFlagKey, CampaignFlagType, ContentWrapperFlagKey, ContentWrapperFlagType, RollTableFlagKey, RollTableFlagType, } from '@/documents';

export * from './UserFlags';
export * from './ModuleSettings';
// export * from './KeyBindings';     // importing this here creates a circular dependency, since keybindings needs CampaignBuilder which needs moduleId
export * from './DocumentFlags';

// NOTE: if the module ID changes, this needs to change... couldn't figure out how to automate it because
//    needed a static type
// Maybe?  I'm not actually sure it wouldn't keep working properly
export type ModuleId = 'campaign-builder';

// define the proper types for settings and flags
export const moduleId: ModuleId = id as ModuleId;

// flesh out the flag types 

type CampaignFlags = {
  [M in ModuleId]: {
    [K in CampaignFlagKey]: CampaignFlagType<K>; 
  };
}

type ContentWrapperFlags = {
  [M in ModuleId]: {
    [K in ContentWrapperFlagKey]: ContentWrapperFlagType<K>; 
  };
}

type JournalEntryFlags = CampaignFlags | ContentWrapperFlags;

type RollTableFlags = {
  [M in ModuleId]: {
    [K in RollTableFlagKey]: RollTableFlagType<K>; 
  };
}

// settings
type WBSettings = {
  [K in SettingKey as `${ModuleId}.${K}`]: K extends SettingKey ? SettingKeyType<K> : never;
};

declare global {
  interface FlagConfig {
    JournalEntry: JournalEntryFlags;
    RollTable: RollTableFlags;
  }

  interface SettingConfig extends WBSettings {}
}
