import { FlagSettings } from '@/settings';
import { SessionLore } from '@/documents/session';

// campaigns are journal entries, not documents
export interface CampaignDoc extends JournalEntry {
  __type: 'CampaignDoc';
}

export type CampaignLore = SessionLore & {
  lockedToSessionId: string | null;  
  lockedToSessionName: string | null;  
}

export enum CampaignFlagKey {
  isCampaign = 'isCampaign',    // used to mark the JE as a campaign
  description = 'description',
  lore = 'lore',
  genre = 'genre',
  worldFeeling = 'worldFeeling',
}

export type CampaignFlagType<K extends CampaignFlagKey> =
  K extends CampaignFlagKey.isCampaign ? true :
  K extends CampaignFlagKey.description ? string :
  K extends CampaignFlagKey.lore ? CampaignLore[] :
  K extends CampaignFlagKey.genre ? string :
  K extends CampaignFlagKey.worldFeeling ? string :
  never;  

export const flagSettings = [
  {
    flagId: CampaignFlagKey.isCampaign,
    default: true,
  },
  {
    flagId: CampaignFlagKey.description,
    default: '' as string,
  },
  {
    flagId: CampaignFlagKey.lore,
    default: [] as CampaignLore[],
  },
  {
    flagId: CampaignFlagKey.worldFeeling,
    default: '',
  },
  {
    flagId: CampaignFlagKey.genre,
    default: '',
  },
] as FlagSettings<CampaignFlagKey, {[K in CampaignFlagKey]: CampaignFlagType<K>}>[];

