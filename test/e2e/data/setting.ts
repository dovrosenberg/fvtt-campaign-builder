// contains the data for the tests

import { faker } from '@faker-js/faker';
import { CampaignDescriptor } from './campaign';
import { CharacterDescriptor } from './character';
import { LocationDescriptor } from './location';
import { OrganizationDescriptor } from './organization';
import { PCDescriptor } from './pc';

export class SettingDescriptor {
  public name: string;

  public characters: CharacterDescriptor[];
  public locations: LocationDescriptor[];
  public organizations: OrganizationDescriptor[];
  public pcs: PCDescriptor[];

  public campaigns: CampaignDescriptor[];

  constructor() {
    this.name = faker.lorem.words({ min: 1, max: 4 })

    this.characters = [
      new CharacterDescriptor(),
      new CharacterDescriptor(),
    ]

    this.locations = [
      new LocationDescriptor(),
      new LocationDescriptor(),
    ]

    this.organizations = [
      new OrganizationDescriptor(),
      new OrganizationDescriptor(),
    ]

    this.pcs = [
      new PCDescriptor(),
      new PCDescriptor(),
    ]

    this.campaigns = [
      new CampaignDescriptor(),
      new CampaignDescriptor(),
    ]
  }
}
