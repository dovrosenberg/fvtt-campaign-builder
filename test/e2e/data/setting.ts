// contains the data for the tests

import { CampaignDescriptor } from './campaign';
import { CharacterDescriptor } from './character';
import { LocationDescriptor } from './location';
import { OrganizationDescriptor } from './organization';
import { PCDescriptor } from './pc';

export type SettingDescriptor = {
  name: string;
  genre: string;
  settingFeeling: string;
  description: string;

  characters: CharacterDescriptor[];
  locations: LocationDescriptor[];
  organizations: OrganizationDescriptor[];
  pcs: PCDescriptor[];

  campaigns: CampaignDescriptor[];
}
