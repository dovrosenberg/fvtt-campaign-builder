import { confirmDialog } from './confirm';
import { inputDialog } from './input';
import { createEntryDialog, updateEntryDialog } from './createEntry';
import { saveChangesDialog } from './saveChanges';
import { arcManagerDialog } from './arcManager';
import { relatedItemDialog } from './relatedItem';
import { selectOptionDialog } from './selectOption';
import { createBranchesDialog, } from './createBranches';

export class FCBDialog {
  static confirmDialog = confirmDialog;
  static inputDialog = inputDialog;
  static createEntryDialog = createEntryDialog;
  static updateEntryDialog = updateEntryDialog;
  static saveChangesDialog = saveChangesDialog;
  static arcManagerDialog = arcManagerDialog;
  static relatedItemDialog = relatedItemDialog;
  static selectOptionDialog = selectOptionDialog;
  static createBranchesDialog = createBranchesDialog;
}