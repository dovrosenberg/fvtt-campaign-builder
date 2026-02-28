<!--
ImportExportDialog: Dialog for exporting and importing module data

Purpose
- Provides UI for users to export all module data to a JSON file
- Provides UI for users to import module data from a JSON file

Responsibilities
- Handles export 
- Handles import with confirmation dialog
- Shows progress during export/import operations
- Displays error messages on failure

Props
- None

Emits
- None

Slots
- None

Dependencies
- Stores: None
- Composables: None
- Services/API: importExport.ts

-->

<template>
  <ConfigDialogLayout>
    <template #scrollSection>
      <div class="fcb-import-export-content">
        <!-- Export Section -->
        <div class="fcb-section">
          <h3>{{ localize('applications.importExport.exportTitle') }}</h3>
          <p class="notes">{{ localize('applications.importExport.exportDescription') }}</p>

          <!-- Export Mode Selection -->
          <div class="fcb-export-mode">
            <label class="fcb-label">{{ localize('applications.importExport.exportModeLabel') }}</label>
            <select v-model="selectedExportMode" class="fcb-select">
              <option v-for="option in exportModeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <button
            @click="onExportClick"
            class="fcb-button fcb-button-primary"
            :disabled="isExporting || isImporting"
          >
            <i class="fa-solid fa-file-export"></i>
            {{ localize('applications.importExport.exportButton') }}
          </button>

          <div v-if="exportProgress" class="fcb-progress">
            <div class="fcb-progress-bar">
              <div class="fcb-progress-fill" :style="{ width: `${exportProgress}%` }"></div>
            </div>
            <span class="fcb-progress-text">{{ exportStatus }}</span>
          </div>
        </div>

        <!-- Import Section -->
        <div class="fcb-section">
          <h3>{{ localize('applications.importExport.importTitle') }}</h3>
          <p class="notes">{{ localize('applications.importExport.importDescription') }}</p>

          <div class="fcb-warning">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>{{ localize('applications.importExport.importWarning') }}</span>
          </div>

          <div class="fcb-file-input">
            <input
              type="file"
              ref="fileInput"
              accept=".json"
              @change="onFileSelected"
              style="display: none"
            />
            <button
              @click="selectFile"
              class="fcb-button fcb-button-secondary"
              :disabled="isExporting || isImporting"
            >
              <i class="fa-solid fa-folder-open"></i>
              {{ localize('applications.importExport.selectFile') }}
            </button>
            <span v-if="selectedFileName" class="fcb-file-name">{{ selectedFileName }}</span>
          </div>

          <button
            @click="onImportClick"
            class="fcb-button fcb-button-danger"
            :disabled="!selectedFile || isExporting || isImporting"
          >
            <i class="fa-solid fa-file-import"></i>
            {{ localize('applications.importExport.importButton') }}
          </button>

          <div v-if="importProgress" class="fcb-progress">
            <div class="fcb-progress-bar">
              <div class="fcb-progress-fill" :style="{ width: `${importProgress}%` }"></div>
            </div>
            <span class="fcb-progress-text">{{ importStatus }}</span>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="errorMessage" class="fcb-error">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{{ errorMessage }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <button @click="onCloseClick" class="fcb-button fcb-button-secondary">
        <i class="fa-solid fa-times"></i> {{ localize('labels.close') }}
      </button>
    </template>
  </ConfigDialogLayout>
</template>

<script setup lang="ts">
  // library imports
  import { ref } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { exportModuleJson } from '@/utils/export';
  import { importModuleJson } from '@/utils/import';
  import { ProgressCallback, ExportMode } from '@/utils/importExportCommon';
  import { importExportApp } from '@/applications/settings/ImportExportApplication';
  import { FCBDialog } from '@/dialogs';

  // library components

  // local components
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // types

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const isExporting = ref(false);
  const isImporting = ref(false);
  const exportProgress = ref(0);
  const importProgress = ref(0);
  const exportStatus = ref('');
  const importStatus = ref('');
  const errorMessage = ref('');
  const selectedFile = ref<File | null>(null);
  const selectedFileName = ref('');
  const fileInput = ref<HTMLInputElement | null>(null);
  const selectedExportMode = ref<ExportMode>(ExportMode.SETTINGS_ONLY);

  ////////////////////////////////
  // computed data
  const exportModeOptions = [
    { value: ExportMode.SETTINGS_ONLY, label: localize('applications.importExport.exportModeSettings') },
    { value: ExportMode.CONFIGURATION_ONLY, label: localize('applications.importExport.exportModeConfiguration') },
    { value: ExportMode.ALL, label: localize('applications.importExport.exportModeAll') },
  ];

  ////////////////////////////////
  // methods
  const clearError = () => {
    errorMessage.value = '';
  };

  const handleExportProgress: ProgressCallback = (message, progress) => {
    exportStatus.value = message;
    if (progress !== undefined) {
      exportProgress.value = progress;
    }
  };

  const handleImportProgress: ProgressCallback = (message, progress) => {
    importStatus.value = message;
    if (progress !== undefined) {
      importProgress.value = progress;
    }
  };

  ////////////////////////////////
  // event handlers
  const onExportClick = async () => {
    clearError();
    isExporting.value = true;
    exportProgress.value = 0;
    exportStatus.value = '';

    try {
      await exportModuleJson(selectedExportMode.value, handleExportProgress);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : localize('applications.importExport.exportFailed');
      console.error('Export failed:', error);
      exportProgress.value = 0;
    } finally {
      isExporting.value = false;
    }
  };

  const selectFile = () => {
    fileInput.value?.click();
  };

  const onFileSelected = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      selectedFile.value = file;
      selectedFileName.value = file.name;
      clearError();
    }
  };

  const onImportClick = async () => {
    if (!selectedFile.value) return;

    clearError();

    // Show confirmation dialog
    const confirmed = await FCBDialog.confirmDialog(
      localize('applications.importExport.importConfirmTitle'),
      localize('applications.importExport.importConfirm')
    );

    if (!confirmed) return;

    isImporting.value = true;
    importProgress.value = 0;
    importStatus.value = '';

    try {
      await importModuleJson(selectedFile.value, handleImportProgress);

      // Clear the file selection after successful import
      selectedFile.value = null;
      selectedFileName.value = '';
      if (fileInput.value) {
        fileInput.value.value = '';
      }

      // Reload the page to refresh all data (mostly settings)
      setTimeout(() => {
        foundry.utils.debouncedReload();
      }, 1000);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : localize('applications.importExport.importFailed');
      console.error('Import failed:', error);
      importProgress.value = 0;
    } finally {
      isImporting.value = false;
    }
  };

  const onCloseClick = () => {
    importExportApp?.close();
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks
</script>

<style lang="scss" scoped>
  .fcb-import-export-content {
    padding: 0 8px;

    .fcb-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--fcb-border-color);

      &:last-of-type {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }

      h3 {
        margin: 0 0 8px 0;
        color: var(--fcb-text-primary);
        font-size: var(--fcb-font-size-large);
      }

      .notes {
        margin: 0 0 16px 0;
        color: var(--fcb-text-muted);
        font-size: var(--fcb-font-size-small);
        line-height: 1.4;
      }
    }

    .fcb-export-mode {
      margin-bottom: 16px;

      .fcb-label {
        display: block;
        margin-bottom: 4px;
        color: var(--fcb-text-primary);
        font-size: var(--fcb-font-size-medium);
      }

      .fcb-select {
        width: 100%;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid var(--fcb-border-color);
        background-color: var(--fcb-surface);
        color: var(--fcb-text-primary);
        font-size: var(--fcb-font-size-medium);
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: var(--fcb-primary);
        }
      }
    }

    .fcb-option {
      margin-bottom: 16px;
    }

    .fcb-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: var(--fcb-font-size-medium);

      .fcb-setting-checkbox {
        width: 16px;
        height: 16px;
        accent-color: var(--fcb-primary);
      }
    }

    .fcb-warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background-color: var(--fcb-warning-background, #fff3cd);
      border: 1px solid var(--fcb-warning-border, #ffc107);
      border-radius: 4px;
      margin-bottom: 16px;
      color: var(--fcb-warning-text, #856404);
      font-size: var(--fcb-font-size-small);

      i {
        color: var(--fcb-warning-icon, #ffc107);
        margin-top: 2px;
      }
    }

    .fcb-file-input {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .fcb-file-name {
        color: var(--fcb-text-primary);
        font-size: var(--fcb-font-size-medium);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .fcb-progress {
      margin-top: 16px;

      .fcb-progress-bar {
        height: 8px;
        background-color: var(--fcb-surface-hover);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;

        .fcb-progress-fill {
          height: 100%;
          background-color: var(--fcb-primary);
          transition: width 0.3s ease;
        }
      }

      .fcb-progress-text {
        font-size: var(--fcb-font-size-small);
        color: var(--fcb-text-muted);
      }
    }

    .fcb-error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background-color: var(--fcb-error-background, #f8d7da);
      border: 1px solid var(--fcb-error-border, #f5c6cb);
      border-radius: 4px;
      color: var(--fcb-error-text, #721c24);
      font-size: var(--fcb-font-size-small);

      i {
        color: var(--fcb-error-icon, #dc3545);
        margin-top: 2px;
      }
    }

    .fcb-button {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: var(--fcb-font-size-medium);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s ease;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.fcb-button-primary {
        background-color: var(--fcb-primary);
        color: white;

        &:hover:not(:disabled) {
          background-color: var(--fcb-primary-dark);
        }
      }

      &.fcb-button-secondary {
        background-color: var(--fcb-surface-hover);
        color: var(--fcb-text-primary);

        &:hover:not(:disabled) {
          background-color: var(--fcb-surface-active);
        }
      }

      &.fcb-button-danger {
        background-color: var(--fcb-danger, #dc3545);
        color: white;

        &:hover:not(:disabled) {
          background-color: var(--fcb-danger-dark, #c82333);
        }
      }
    }
  }
</style>
