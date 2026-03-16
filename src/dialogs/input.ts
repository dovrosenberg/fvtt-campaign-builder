import { vueHost } from '@/libraries/fvtt-vue/VueHost';
import InputDialogComponent from '@/components/dialogs/InputDialog.vue';

// creates a simple input dialog with the given title
// returns the entered value or null if canceled
export async function inputDialog(title: string, prompt: string, initialValue?: string): Promise<string | null> {
  return new Promise<string | null>(async (resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    let portalId: string | null = null;

    // Register the input dialog with VueHost singleton
    portalId = await vueHost.registerPortal(
      InputDialogComponent,
      {
        modelValue: true,
        title,
        message: prompt,
        initialValue: initialValue || '',
        'onUpdate:modelValue': (value: boolean) => {
          if (!value) {
            // Dialog was closed without a definitive answer
            cleanup();
          }
        },
        onResult: (result: string | null) => {
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