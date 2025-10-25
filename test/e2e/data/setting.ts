// contains the data for the tests

import { Topics } from '@/types';
import { CampaignDescriptor } from './campaign';
import { CharacterDescriptor } from './character';
import { LocationDescriptor } from './location';
import { OrganizationDescriptor } from './organization';
import { PCDescriptor } from './pc';

export interface SettingDescriptor {
  name: string;
  genre: string;
  settingFeeling: string;
  description: string;

  topics: {
    [Topics.Character]: CharacterDescriptor[];
    [Topics.Location]: LocationDescriptor[];
    [Topics.Organization]: OrganizationDescriptor[];
    [Topics.PC]: PCDescriptor[];
  };

  campaigns: CampaignDescriptor[];
}
