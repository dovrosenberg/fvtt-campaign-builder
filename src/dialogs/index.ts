import { confirmDialog } from './confirm';
import { inputDialog } from './input';
import { createEntryDialog, updateEntryDialog } from './createEntry';

export class FCBDialog {
  static confirmDialog = confirmDialog;
  static inputDialog = inputDialog;
  static createEntryDialog = createEntryDialog;
  static updateEntryDialog = updateEntryDialog;

}