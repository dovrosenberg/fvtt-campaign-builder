import { test, expect } from '@playwright/test';
import { testData } from '@e2etest/data';
import { confirmSettingInList, fillOutNameDialog, switchToSetting } from '@e2etest/utils';
import { TestContext } from '../types';

export const updateSetting = (context: TestContext, settingName: string) => {
  test('Update a setting', async () => {
    // switch to the setting

    // open the setting page
    await switchToSetting(context, settingName);
    await openSettingContent(context, settingName);

    // edit the fields

    // close and reopen campaign builder

    // make sure the setting is there and the fields are correct

  });
}
