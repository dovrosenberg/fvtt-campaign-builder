import { Page } from 'playwright';
import { expect } from 'playwright/test';

export async function fillOutNameDialog(page: Page, headerText: string, name: string) {
  const dialog = await page.locator('div.app.window-app.dialog', { 
    has: page.locator(`header h4:has-text("${headerText}")`)
  });

  // find the text box - it's in a <section> tag that is in the same <div> as the <header>
  //   that contains the <h4>
  const nameInput = await dialog.locator('section div p input[type="text"]');
  await expect(nameInput).toBeVisible();

  // put in text
  await nameInput.fill(name);

  // click the button
  await dialog.locator('.dialog-button.ok').click();
}

