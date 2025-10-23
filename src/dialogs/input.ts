import { createApp } from 'vue';
import InputDialogComponent from '@/components/InputDialog.vue';

// creates a simple input dialog with the given title
// returns the entered value or null if canceled
export async function inputDialog(title: string, prompt: string, initialValue?: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Create the Vue app
    const app = createApp(InputDialogComponent, {
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