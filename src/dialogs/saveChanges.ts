import { localize } from '@/utils/game';

export enum SaveChangesResult {
  Save = 'save',
  Discard = 'discard', 
  Cancel = 'cancel'
}

/** Creates a dialog asking the user whether to save, discard, or cancel when there are unsaved changes
 * @return The user's choice (or cancel if the dialog was closed)
 */
export async function saveChangesDialog(title?: string, prompt?: string): Promise<SaveChangesResult> {
  // so if they don't hit anything, cancel gets returned
  let response = SaveChangesResult.Cancel as SaveChangesResult;

  const data = {
    prompt: prompt || localize('dialogs.saveChanges.message')
  };
  
  const content = await renderTemplate('modules/campaign-builder/templates/SaveChangesDialog.hbs', data);

  const dialog = {
    title: title || localize('dialogs.saveChanges.title'),
    content: content,
    buttons: {
      save: {
        label: localize('dialogs.saveChanges.save'),
        callback: (): void => { response = SaveChangesResult.Save; },
      },
      discard: {
        label: localize('dialogs.saveChanges.discard'),
        callback: (): void => { response = SaveChangesResult.Discard; },
      },
      cancel: {
        label: localize('dialogs.saveChanges.cancel'),
        callback: (): void => { response = SaveChangesResult.Cancel; }
      }
    },
    default: 'save',
    close: (): void => { }
  };

  // this uses the foundry Dialog
  await Dialog.wait(dialog);

  return response;
}
