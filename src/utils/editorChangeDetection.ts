/**
 * Utility functions for detecting unsaved changes in editors across the application
 */

/**
 * Interface for components that have editors with unsaved changes
 */
export interface EditorComponent {
  isDirty?: () => boolean;
  saveEditor?: (options?: any) => Promise<void>;
  closeEditor?: () => Promise<void>;
}

// Global registry to track editor instances
const editorRegistry = {} as Record<string, EditorComponent>;

/**
 * Register an editor instance for change tracking
 */
export function registerEditor(id: string, editor: EditorComponent): void {
  editorRegistry[id] = editor;
}

/**
 * Unregister an editor instance
 */
export function unregisterEditor(id: string): void {
  delete editorRegistry[id];
}

/**
 * Checks if there are any unsaved changes in editors across the application
 * @returns true if there are unsaved changes, false otherwise
 */
export function hasUnsavedChanges(): boolean {
  for (const id of Object.keys(editorRegistry)) {
    const editor = editorRegistry[id]
    try {
      if (editor.isDirty && editor.isDirty()) {
        return true;
      }
    } catch (error) {
      console.warn(`Error checking dirty state for editor ${id}:`, error);
      // Remove invalid editor from registry
      delete editorRegistry[id];
    }
  }
  
  return false;
}

/**
 * Attempts to save and close all active editors in the application
 * @returns Promise that resolves when all editors have been saved
 */
export async function saveAndCloseAllActiveEditors(): Promise<void> {
  const savePromises: Promise<void>[] = [];
  
  for (const id of Object.keys(editorRegistry)) {
    const editor = editorRegistry[id];

    try {
      if (editor.isDirty && editor.isDirty() && editor.saveEditor) {
        // remove=true will also close it
        savePromises.push(editor.saveEditor({ remove: true }));
      }
    } catch (error) {
      console.warn(`Error saving editor ${id}:`, error);
      // Remove invalid editor from registry
      delete editorRegistry[id];
    }
  }
  
  await Promise.all(savePromises);
}

/**
 * Closes all active editors in the application
 * @returns Promise that resolves when all editors have been closed
 */
export async function closeAllActiveEditors(): Promise<void> {
  const closePromises: Promise<void>[] = [];
  
  for (const id of Object.keys(editorRegistry)) {
    const editor = editorRegistry[id];

    try {
      if (editor.closeEditor) {
        // Close and cleanup the editor
        closePromises.push(editor.closeEditor());
      }
    } catch (error) {
      console.warn(`Error closing editor ${id}:`, error);
      // Remove invalid editor from registry
      delete editorRegistry[id];
    }
  }
  
  await Promise.all(closePromises);
}
