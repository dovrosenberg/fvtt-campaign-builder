import { id } from '@module';
import { WorldFlagType, WorldFlagKey, WorldFolderFlagStorageType } from './WorldFlags';
import { SettingKey, SettingKeyType } from './ModuleSettings';
import { CampaignFlags } from 'src/documents';

export * from './UserFlags';
export * from './ModuleSettings';
export * from './WorldFlags';
export * from './KeyBindings';

// NOTE: if the module ID changes, this needs to change... couldn't figure out how to automate it because
//    needed a static type
// Maybe?  I'm not actually sure it wouldn't keep working properly
export type ModuleId = 'world-builder';

// define the proper types for settings and flags
export const moduleId: ModuleId = id as ModuleId;

// flesh out the flag types 

type WorldFolderFlags = Record<ModuleId, WorldFolderFlagStorageType>;

type JournalEntryFlags = CampaignFlags;

// settings
type WBSettings = {
  [K in SettingKey as `${ModuleId}.${K}`]: K extends SettingKey ? SettingKeyType<K> : never;
};

declare global {
  interface FlagConfig {
    JournalEntry: JournalEntryFlags;
    Folder: WorldFolderFlags;
  }

  interface SettingConfig extends WBSettings {}
}
