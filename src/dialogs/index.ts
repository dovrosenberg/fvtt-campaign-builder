import { confirmDialog } from './confirm';
import { inputDialog } from './input';
import { createEntryDialog, updateEntryDialog } from './createEntry';
import { saveChangesDialog } from './saveChanges';
import { arcManagerDialog } from './arcManager';

export class FCBDialog {
  static confirmDialog = confirmDialog;
  static inputDialog = inputDialog;
  static createEntryDialog = createEntryDialog;
  static updateEntryDialog = updateEntryDialog;
  static saveChangesDialog = saveChangesDialog;
  static arcManagerDialog = arcManagerDialog;

}