/**
 * Migration progress dialog for showing migration status to users
 */

import { MigrationResult } from './types';

export interface MigrationProgressOptions {
  title?: string;
  message?: string;
  showProgress?: boolean;
  cancellable?: boolean;
}

export class MigrationProgressDialog {
  private dialog: Dialog | null = null;
  private progressElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;

  /**
   * Show the migration progress dialog
   */
  public async show(options: MigrationProgressOptions = {}): Promise<void> {
    const title = options.title || 'Migrating Campaign Builder to new version';
    const message = options.message || 'Migrating data to new format...';
    const showProgress = options.showProgress !== false;

    const content = this.createDialogContent(message, showProgress);
    
    this.dialog = new Dialog({
      title,
      content,
      buttons: {},
      close: () => {
        this.dialog = null;
      },
      render: (html: JQuery<HTMLElement>) => {
        this.progressElement = html.find('.migration-progress-bar')[0] as HTMLElement;
        this.statusElement = html.find('.migration-status')[0] as HTMLElement;
      }
    }, {
      classes: ['migration-dialog'],
      width: 400,
      height: 'auto',
      resizable: false
    });

    this.dialog.render(true);
    // Return immediately without waiting for dialog closure
    return Promise.resolve();
  }

  /**
   * Update the progress
   */
  public updateProgress(current: number, total: number, status?: string): void {
    if (this.progressElement) {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
      const progressBar = this.progressElement.querySelector('.progress-bar-fill') as HTMLElement;
      const progressText = this.progressElement.querySelector('.progress-text') as HTMLElement;

      if (progressBar) {
        progressBar.style.width = `${percentage}%`;
      }
      if (progressText) {
        progressText.textContent = `${percentage}%`;
      }
    }

    if (this.statusElement && status) {
      this.statusElement.textContent = status;
    }
  }

  /**
   * Update status message
   */
  public updateStatus(status: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = status;
    }
  }

  /**
   * Show completion message
   */
  public async showCompletion(result: MigrationResult): Promise<void> {
    if (this.dialog) {
      await this.dialog.close();
    }

    let content = '';
    let title = '';

    if (result.success) {
      title = 'Migration Complete';
      if (result.migratedCount > 0) {
        content = `<p>Successfully migrated ${result.migratedCount} items.</p>`;
      } else {
        content = '<p>No migration was needed.</p>';
      }
    } else {
      title = 'Migration Failed';
      content = `<p>Migration failed. ${result.migratedCount} items migrated, ${result.failedCount} failed.</p>`;
      
      if (result.errors && result.errors.length > 0) {
        content += '<details><summary>Error Details</summary><ul>';
        result.errors.forEach(error => {
          content += `<li>${error}</li>`;
        });
        content += '</ul></details>';
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      content += '<details><summary>Warnings</summary><ul>';
      result.warnings.forEach(warning => {
        content += `<li>${warning}</li>`;
      });
      content += '</ul></details>';
    }

    return new Promise<void>((resolve) => {
      new Dialog({
        title,
        content,
        buttons: {
          ok: {
            label: 'OK',
            callback: () => resolve()
          }
        },
        default: 'ok'
      }).render(true);
    });
  }

  /**
   * Close the dialog
   */
  public async close(): Promise<void> {
    if (this.dialog) {
      await this.dialog.close();
    }
  }

  /**
   * Create the dialog content HTML
   */
  private createDialogContent(message: string, showProgress: boolean): string {
    let content = `<div class="migration-dialog-content">
      <p>${message}</p>`;

    if (showProgress) {
      content += `
        <div class="migration-status">Initializing...</div>
        <div class="migration-progress-bar">
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">0/0 (0%)</div>
        </div>`;
    }

    content += '</div>';

    return content;
  }

  /**
   * Static method to show migration with progress
   */
  public static async withProgress<T>(
    title: string,
    message: string,
    migrationFn: (progress: MigrationProgressDialog) => Promise<T>
  ): Promise<T> {
    const progress = new MigrationProgressDialog();
    
    try {
      await progress.show({ title, message });
      const result = await migrationFn(progress);
      return result;
    } finally {
      await progress.close();
    }
  }
}
