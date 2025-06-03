import { localize } from '@/utils/game';

// creates a simple input dialog with the given title
// returns the entered value or null if canceled
export async function inputDialog(title: string, prompt: string): Promise<string | null> {
  let response = null as string | null;

  const data = {prompt};
  const inputContent = await renderTemplate('modules/campaign-builder/templates/InputDialog.hbs', data);

  const dialog = {
    title,
    content: inputContent,
    buttons: {
      ok: {
        label: localize('labels.ok'),
        callback: (html: JQuery<HTMLElement>): void => { response = (html.find('#response')[0] as HTMLInputElement).value; },
      },
      cancel: {
        label: localize('labels.cancel'),
        callback:  () => { response = null; }
      }
    },
    default: 'ok',
  };

  // this uses the Foundry Dialog
  try {
    await Dialog.wait(dialog);
  } catch (error) {
    // it throws if you close the dialog
    response = null;
  }

  return response;
}