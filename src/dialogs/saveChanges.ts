import { createApp } from 'vue';
import SaveChangesDialogComponent from '@/components/SaveChangesDialog.vue';
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
  return new Promise<SaveChangesResult>((resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Create the Vue app
    const app = createApp(SaveChangesDialogComponent, {
      modelValue: true,
      title: title || localize('dialogs.saveChanges.title'),
      message: prompt || localize('dialogs.saveChanges.message'),
      'onUpdate:modelValue': (value: boolean) => {
        if (!value) {
          // Dialog was closed without a definitive answer
          cleanup();
        }
      },
      onResult: (result: SaveChangesResult) => {
        resolve(result);
        cleanup();
      },
    });

    // Mount the app
    app.mount(container);

    // Cleanup function
    function cleanup() {
      app.unmount();
      document.body.removeChild(container);
    }
  });
}
