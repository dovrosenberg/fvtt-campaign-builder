import { TestContext } from '../types';

export async function fillOutNameDialog(context: TestContext, headerText: string, name: string) {
  const page = context.page!;
  
  // Find dialog with the header text
  const dialogs = await page.$$('div.app.window-app.dialog');
  let targetDialog: import('puppeteer').ElementHandle<Element> | null = null;
  
  for (const dialog of dialogs) {
    const header = await dialog.$(`header h4`);
    if (header) {
      const text = await header.evaluate(el => el.textContent);
      if (text?.includes(headerText)) {
        targetDialog = dialog;
        break;
      }
    }
  }

  if (!targetDialog) {
    throw new Error(`Dialog with header "${headerText}" not found`);
  }

  // find the text box - it's in a <section> tag that is in the same <div> as the <header>
  const nameInput = await targetDialog.$('section div p input[type="text"]');
  if (!nameInput) {
    throw new Error('Name input not found in dialog');
  }

  // put in text
  await nameInput.type(name);

  // click the button
  const okButton = await targetDialog.$('.dialog-button.ok');
  if (okButton) {
    await okButton.click();
  }
}

