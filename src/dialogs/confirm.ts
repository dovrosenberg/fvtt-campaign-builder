import { createApp } from 'vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

// creates a simple confirm dialog with the given title
// returns true if confirmed, false if canceled
export async function confirmDialog(title: string, prompt: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Create the Vue app
    const app = createApp(ConfirmDialog, {
      modelValue: true,
      title,
      message: prompt,
      'onUpdate:modelValue': (value: boolean) => {
        if (!value) {
          // Dialog was closed without a definitive answer
          cleanup();
        }
      },
      onConfirm: () => {
        resolve(true);
        cleanup();
      },
      onCancel: () => {
        resolve(false);
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