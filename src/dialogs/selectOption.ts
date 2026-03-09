import { vueHost } from '@/libraries/fvtt-vue/VueHost';
import SelectOptionDialogComponent from '@/components/dialogs/SelectOptionDialog.vue';

export interface SelectOption {
  label: string;
  id: string;
}

/**
 * Creates a dialog for selecting an option from a dropdown list.
 * 
 * @param title - Dialog title
 * @param message - Optional message shown above dropdown
 * @param options - Array of options with label and id
 * @param placeholder - Optional placeholder text for dropdown
 * @returns The selected option id or null if canceled
 */
export async function selectOptionDialog(
  title: string,
  message: string,
  options: SelectOption[],
  placeholder?: string
): Promise<string | null> {
  return new Promise<string | null>(async (resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    let portalId: string | null = null;

    // Register the dialog with VueHost singleton
    portalId = await vueHost.registerPortal(
      SelectOptionDialogComponent,
      {
        modelValue: true,
        title,
        message,
        options,
        placeholder: placeholder || '',
        'onUpdate:modelValue': (value: boolean) => {
          if (!value) {
            // Dialog was closed without a definitive answer
            cleanup();
          }
        },
        onSelect: (result: string | null) => {
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
