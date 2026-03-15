import { vueHost } from '@/libraries/fvtt-vue/VueHost';
import CreateBranchesDialogComponent from '@/components/dialogs/CreateBranchesDialog.vue';
import { Entry } from '@/classes';

/**
 * Creates a dialog for selecting locations to create branches for an organization.
 * The dialog handles the full creation flow including creating branch entries.
 * 
 * @param organizationId - UUID of the parent organization
 * @returns Array of created branch entries, or empty array if canceled
 */
export async function createBranchesDialog(
  organizationId: string
): Promise<Entry[]> {
  return new Promise<Entry[]>(async (resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    let portalId: string | null = null;

    // Register the dialog with VueHost singleton
    portalId = await vueHost.registerPortal(
      CreateBranchesDialogComponent,
      {
        modelValue: true,
        organizationId,
        'onUpdate:modelValue': (value: boolean) => {
          if (!value) {
            // Dialog was closed without a definitive answer
            cleanup();
          }
        },
        onConfirm: (branches: Entry[]) => {
          resolve(branches);
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
