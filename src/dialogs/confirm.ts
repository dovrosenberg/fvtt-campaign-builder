import { localize } from '@/utils/game';

// creates a simple input dialog with the given title
// returns the entered value or null if canceled
export async function confirmDialog(title: string, prompt: string): Promise<boolean | null> {
  let response = null as boolean | null;

  const data = {prompt};
  const content = await renderTemplate('modules/campaign-builder/templates/ConfirmDialog.hbs', data);

  const dialog = {
    title,
    content: content,
    buttons: {
      yes: {
        label: localize('labels.yes'),
        callback: (html: JQuery<HTMLElement>): void => { response = true; },
      },
      cancel: {
        label: localize('labels.no'),
        callback:  () => { response = false; }
      }
    },
    default: 'yes',
  };

  // this uses the foundry Dialog
  await Dialog.wait(dialog);

  return response;
}