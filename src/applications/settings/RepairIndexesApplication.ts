import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { repairAllIndexes } from '@/utils/globalScripts';

const { ApplicationV2 } = foundry.applications.api;

/**
 * Registered as a settings menu so the index repair shows up as a button in the module
 * settings. It never opens a window — clicking the button confirms with the user and
 * then runs the repair directly.
 */
export class RepairIndexesApplication extends ApplicationV2 {
  /**
   * Instead of rendering a window, confirm with the user and run the repair.
   * @returns this
   */
  override async render(): Promise<this> {
    // last-resort operation - make sure the user understands what it can and cannot restore
    const confirmed = await FCBDialog.confirmDialog(
      localize('dialogs.repairIndexes.title'),
      localize('dialogs.repairIndexes.message'),
    );

    if (confirmed) {
      // repairAllIndexes closes the main FCB window itself and reports results via notifications
      await repairAllIndexes();
    }

    return this;
  }
}
