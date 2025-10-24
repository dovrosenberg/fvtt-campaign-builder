// just configures our flags on RollTables
import { FlagSettings } from '@/settings';
import { GeneratorType } from '@/types';

export enum RollTableFlagKey {
  type = 'type',  // the type of generator this table is for (ex. NPC, Tavern)
  settingId = 'settingId',  // the Setting this table belongs to
}

export type RollTableFlagType<K extends RollTableFlagKey> =
  K extends RollTableFlagKey.type ? GeneratorType :
  K extends RollTableFlagKey.settingId ? string :
  never;  

export const flagSettings = [
  {
    flagId: RollTableFlagKey.type,
    default: GeneratorType.NPC,
  },
  {
    flagId: RollTableFlagKey.settingId,
    default: '',
  },
] as FlagSettings<RollTableFlagKey, {[K in RollTableFlagKey]: RollTableFlagType<K>}>[];

