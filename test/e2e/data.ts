// contains the data for the tests

import { faker } from '@faker-js/faker';

type SettingDescriptor = {
  name: string;
}

class DataGenerator {
  public settings: SettingDescriptor[] = [];

  constructor() {
    this.settings.push({
      name: faker.lorem.words({ min: 1, max: 4 })
    });

    this.settings.push({
      name: faker.lorem.words({ min: 1, max: 4 })
    });
  }
}

export const testData = new DataGenerator();
