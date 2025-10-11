import { test, Page, } from '@playwright/test';
import { testData } from '@e2etest/data';
import { createInitialSetting, createSettingFromSidebar } from './create';
import { deleteSetting } from './delete';
import { TestContext } from '../types';

export const runSettingsTests = (context: TestContext) => {
  test.describe.serial('Do basic setting tests', () => {
    createInitialSetting(context);
    
    // createSettingFromSidebar(context, testData.settings[1].name);

    // expand the first setting
  });
};
