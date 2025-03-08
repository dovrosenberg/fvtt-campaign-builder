import type JQuery from '@types/jquery';

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
        label: 'OK',
        callback: (html: JQuery<HTMLElement>): void => { response = (html.find('#response')[0] as HTMLInputElement).value; },
      },
      cancel: {
        label: 'Cancel',
        callback:  () => { response = null; }
      }
    },
    default: 'ok',
  };

  await Dialog.wait(dialog);

  return response;
}