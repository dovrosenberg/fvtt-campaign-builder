import { vueHost } from '@/libraries/fvtt-vue/VueHost';
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
  return new Promise<SaveChangesResult>(async (resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    let portalId: string | null = null;

    // Register the save changes dialog with VueHost singleton
    portalId = await vueHost.registerPortal(
      SaveChangesDialogComponent,
      {
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
      },
      container,
      () => {} // No ref callback needed
    ) || null;

    // Cleanup function
    function cleanup() {
      if (portalId) {
        vueHost.unregisterPortal(portalId);
        portalId = null;
      }
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  });
}
