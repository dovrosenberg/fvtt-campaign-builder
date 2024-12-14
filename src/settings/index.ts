import { id as moduleId } from '@module';
import { WorldFlagType, WorldFlagKey } from './WorldFlags';

export * from './UserFlags';
export * from './ModuleSettings';
export * from './WorldFlags';

// define the proper types for settings and flags
type ModuleId = typeof moduleId & { __brand: 'moduleId' };

// flesh out the flag types 
type CampaignFlags = Record<ModuleId, {
  isCampaign: boolean;
  description: string;
}>;

type WorldFlags = Record<ModuleId, {
  [K in WorldFlagKey]: WorldFlagType<K>
}>;

type JournalEntryFlags = CampaignFlags;

declare global {
  interface FlagConfig {
    JournalEntry: JournalEntryFlags;
    Folder: WorldFlags;
  }
}