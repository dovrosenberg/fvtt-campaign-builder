
// creates a simple input dialog with the given title
// returns the entered value or null if canceled
export async function inputDialog(title: string, prompt: string): Promise<string | null> {
  let response = '';

  let data = {prompt};
  const inputContent = await renderTemplate('modules/world-builder/templates/InputDialog.hbs', data);

  const dialog = {
    title,
    content: inputContent,
    buttons: {
      ok: {
        label: 'OK',
        callback: (html: JQuery<HTMLElement>): void => { response = (html.find('#response')[0] as HTMLInputElement).value },
      },
      cancel: {
        label: 'Cancel',
        callback:  () => {}
      }
    },
    default: 'OK',
  };

  // @ts-ignore
  await Dialog.wait(dialog);

  return response || null;
};