import { Page } from 'puppeteer';

export const getSetting = async (page: Page, settingName: string): Promise<string> => {
  return await page.evaluate((settingName: string) => {
    return (game as any).settings?.get('campaign-builder', settingName);
  }, settingName);
};

export const setSetting = async (page: Page, settingName: string, value: any): Promise<void> => {
  await page.evaluate(async (settingName: string, value: any) => {
    await (game as any).settings?.set('campaign-builder', settingName, value);
  }, settingName, value);
};
