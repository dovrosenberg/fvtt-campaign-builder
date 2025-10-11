// contains the data for the tests

import { SettingDescriptor } from './setting';

class DataGenerator {
  public settings: SettingDescriptor[] = [];

  constructor() {
    this.settings = [
      new SettingDescriptor(),
      new SettingDescriptor(),
    ]
  }
}

export const testData = new DataGenerator();
