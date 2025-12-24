import { vueHost } from '@/libraries/fvtt-vue/VueHost';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

// creates a simple confirm dialog with the given title
// returns true if confirmed, false if canceled
export async function confirmDialog(title: string, prompt: string): Promise<boolean> {
  return new Promise<boolean>(async (resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    let portalId: string | null = null;

    const onConfirm = () => {
      resolve(true);
      cleanup();
    };

    const onCancel = () => {
      resolve(false);
      cleanup();
    };

    const onUpdateModelValue = (value: boolean) => {
      if (!value) {
        // Dialog was closed without a definitive answer
        cleanup();
      }
    };

    const refCallback = () => {
      // Optionally store instance if needed
    };

    // Register dialog with VueHost singleton
    portalId = await vueHost.registerPortal(
      ConfirmDialog,
      {
        modelValue: true,
        title,
        message: prompt,
        'onUpdate:modelValue': onUpdateModelValue,
        onConfirm,
        onCancel,
      },
      container,
      refCallback
    );

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