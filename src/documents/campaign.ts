import { FlagSettings } from '@/settings';
import { SessionLore, } from '@/documents/session';
import { ToDoItem } from '@/types';

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
  houseRules = 'houseRules',
  lore = 'lore',
  img = 'img',   // image path for the campaign
  todoItems = 'todoItems',
}

export type CampaignFlagType<K extends CampaignFlagKey> =
  K extends CampaignFlagKey.isCampaign ? true :
  K extends CampaignFlagKey.description ? string :
  K extends CampaignFlagKey.houseRules ? string :
  K extends CampaignFlagKey.lore ? CampaignLore[] :
  K extends CampaignFlagKey.img ? string :
  K extends CampaignFlagKey.todoItems ? ToDoItem[] :
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
    flagId: CampaignFlagKey.houseRules,
    default: '' as string,
  },
  {
    flagId: CampaignFlagKey.lore,
    default: [] as CampaignLore[],
  },
  {
    flagId: CampaignFlagKey.img,
    default: '' as string,
  },
  {
    flagId: CampaignFlagKey.todoItems,
    default: [] as ToDoItem[],
  },
] as FlagSettings<CampaignFlagKey, {[K in CampaignFlagKey]: CampaignFlagType<K>}>[];

