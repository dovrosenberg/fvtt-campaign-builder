import { test } from '@playwright/test';
import { confirmSettingInList, openSettingContent, switchToSetting } from '@e2etest/utils';
import { TestContext } from '../types';

export const updateSetting = (context: TestContext, settingName: string) => {
  test('Update setting name', async () => {  
    await updateName(context, settingName);
  });

  test('Update setting fields', async () => {
    // open the setting page
    await switchToSetting(context, settingName);
    await openSettingContent(context, settingName);

    // edit the fields

    // other fields
    // close and reopen campaign builder

    // make sure the setting is there and the fields are correct

  });
}

const updateName = async (context: TestContext, name: string) => {
  const page = context.page!;

  const newName = 'Temporary Test Name';
  await page.getByTestId('setting-name-header')
    .locator('input')
    .fill(newName);

  // make sure it updated in the tree
  await confirmSettingInList(context, newName);

  // change it back
  await page.getByTestId('setting-name-header')
    .locator('input')
    .fill(name);

  // make sure it updated again
  await confirmSettingInList(context, name);
}
  