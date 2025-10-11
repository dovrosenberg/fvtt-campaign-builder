// contains the data for the tests

import { faker } from '@faker-js/faker';
import { CampaignDescriptor } from './campaign';
import { CharacterDescriptor } from './character';
import { LocationDescriptor } from './location';
import { OrganizationDescriptor } from './organization';
import { PCDescriptor } from './pc';

export class SettingDescriptor {
  public name: string;
  public genre: string;
  public settingFeeling: string;
  public description: string;

  public characters: CharacterDescriptor[];
  public locations: LocationDescriptor[];
  public organizations: OrganizationDescriptor[];
  public pcs: PCDescriptor[];

  public campaigns: CampaignDescriptor[];

  constructor() {
    this.name = faker.lorem.words({ min: 1, max: 4 })
    this.genre = faker.lorem.words({ min: 1, max: 1 })
    this.settingFeeling = faker.lorem.sentence()
    this.description = faker.lorem.sentences({ min: 3, max: 5 })

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
