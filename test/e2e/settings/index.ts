import { test } from '@playwright/test';
import { createInitialSetting, createSettingFromSidebar } from './create';
import { TestContext } from '../types';
import { testData } from '@e2etest/data';
import { updateSetting } from './update';

export const runSettingsTests = (context: TestContext) => {
  test.describe.serial('Do basic setting tests', () => {
    createInitialSetting(context);
    
    createSettingFromSidebar(context, testData.settings[1].name);

    // this requires switching back to the first setting
    updateSetting(context, testData.settings[0].name);
  });
};
