<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
      <div class="form-group">
        <label>{{ localize('settings.autoRefreshRollTables') }}</label>
        <div class="form-fields">
          <Checkbox
            v-model="autoRefresh"
            :binary="true"
            unstyled
          />
        </div>
        <p class="hint">
          {{ localize('settings.autoRefreshRollTablesHelp') }}
        </p>
      </div>

      <div class="form-group">
        <Button
          @click="onClickRefreshTables"
          unstyled
          class="refresh-tables-button"
        >
          <template #icon>
            <i class="fas fa-sync"></i>
          </template>
          {{ localize('applications.rollTableSettings.labels.refreshRollTablesNow') }}
        </Button>
        <p class="hint">
          {{ localize('applications.rollTableSettings.labels.refreshRollTablesHelp') }}
        </p>
      </div>

      <div class="form-group">
        <h3>{{ localize('applications.rollTableSettings.labels.tableStatistics') }}</h3>
        <div v-if="tableStats.length > 0" class="table-stats">
          <div v-for="stat in tableStats" :key="stat.type" class="table-stat">
            <div class="table-header">
              <div class="table-header">
              <div class="table-name">{{ stat.name }}</div>
              <div class="table-actions">
                <InputNumber
                  v-model="entryCounts[stat.type]"
                  :min="5"
                  :max="100"
                  :step="5"
                  size="small"
                  showButtons
                  buttonLayout="horizontal"
                  decrementButtonClass="p-button-secondary"
                  incrementButtonClass="p-button-secondary"
                  incrementButtonIcon="pi pi-plus"
                  decrementButtonIcon="pi pi-minus"
                  class="entry-count-input"
                />
                <Button
                  @click="onRegenerateTable(stat.type)"
                  size="small"
                  unstyled
                  class="regenerate-button"
                >
                  <template #icon>
                    <i class="fas fa-sync"></i>
                  </template>
                  {{ localize('applications.rollTableSettings.labels.regenerateTable') }}
                </Button>
              </div>
            </div>
              <div class="table-actions">
                <InputNumber
                  v-model="entryCounts[stat.type]"
                  :min="5"
                  :max="100"
                  :step="5"
                  size="small"
                  showButtons
                  buttonLayout="horizontal"
                  decrementButtonClass="p-button-secondary"
                  incrementButtonClass="p-button-secondary"
                  incrementButtonIcon="pi pi-plus"
                  decrementButtonIcon="pi pi-minus"
                  class="entry-count-input"
                />
                <Button
                  @click="onRegenerateTable(stat.type)"
                  size="small"
                  unstyled
                  class="regenerate-button"
                >
                  <template #icon>
                    <i class="fas fa-sync"></i>
                  </template>
                  {{ localize('settings.regenerateTable') }}
                </Button>
              </div>
            </div>
            <div class="table-usage">
              {{ stat.used }} / {{ stat.total }} {{ localize('settings.entriesUsed') }}
              ({{ Math.round(stat.percentage) }}%)
            </div>
            <ProgressBar
              :value="stat.percentage"
              :class="{'warning': stat.percentage > 70, 'danger': stat.percentage > 90}"
            />
          </div>
        </div>
        <div v-else class="no-tables">
          {{ localize('settings.noTablesFound') }}
        </div>

        <div class="regenerate-all">
          <Button
            @click="onRegenerateAllTables"
            unstyled
            class="regenerate-all-button"
          >
            <template #icon>
              <i class="fas fa-sync-alt"></i>
            </template>
            {{ localize('settings.regenerateAllTables') }}
          </Button>
          <p class="hint">
            {{ localize('settings.regenerateAllTablesHelp') }}
          </p>
        </div>
      </div>

      <footer class="form-footer" data-application-part="footer">
        <Button 
          @click="onClickReset"
          unstyled
        >
          <template #icon>
            <i class="fa-solid fa-undo"></i>
          </template>
          {{ localize('labels.reset') }}
        </Button>
        <Button 
          @click="onClickSubmit"
          unstyled
        >
          <template #icon>
            <i class="fa-solid fa-save"></i>
          </template>
          {{ localize('labels.saveChanges') }}
        </Button>
      </footer>
    </div>
  </section>
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, ref, reactive } from 'vue';

  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import { refreshAllRollTables, refreshRollTable, TABLE_SIZE } from '@/utils/generators';
  import { rollTableSettingsApp } from '@/applications/settings/RollTableSettingsApplication';
  import { localize } from '@/utils/game';
  import { GeneratorType } from '@/types';

  // library components
  import Checkbox from 'primevue/checkbox';
  import Button from 'primevue/button';
  import ProgressBar from 'primevue/progressbar';
  import InputNumber from 'primevue/inputnumber';

  // local components

  // types
  interface TableStat {
    type: string;
    name: string;
    total: number;
    used: number;
    percentage: number;
  }

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const autoRefresh = ref<boolean>(false);
  const tableStats = ref<TableStat[]>([]);
  const entryCounts = reactive<Record<string, number>>({});
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onClickSubmit = async () => {
    await ModuleSettings.set(SettingKey.autoRefreshRollTables, autoRefresh.value);
    rollTableSettingsApp?.close();
  };

  const onClickReset = async () => {
    autoRefresh.value = ModuleSettings.get(SettingKey.autoRefreshRollTables);
  };

  const onClickRefreshTables = async () => {
    await refreshAllRollTables();
  };

  const onRegenerateTable = async (type: string) => {
    // await refreshRollTable(type as GeneratorType);
  };

  const onRegenerateAllTables = async () => {
    await refreshAllRollTables();
  };

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    autoRefresh.value = ModuleSettings.get(SettingKey.autoRefreshRollTables);
  });

</script>

<style lang="scss">
.table-stats {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  .table-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;

      .table-name {
        font-weight: bold;
        font-size: 1.1em;
      }

      .table-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .entry-count-input {
          width: 80px;

          :deep(.p-inputnumber-input) {
            width: 40px;
            text-align: center;
          }
        }

        .regenerate-button {
          font-size: 0.9em;
          padding: 0.25rem 0.5rem;

          i {
            margin-right: 0.25rem;
          }
        }
      }
    }

    .table-usage {
      font-size: 0.9em;
      color: var(--color-text-dark-secondary);
      margin-bottom: 0.25rem;
    }

    .p-progressbar {
      height: 0.5rem;
      background-color: var(--color-border-light-tertiary);

      &.warning .p-progressbar-value {
        background-color: var(--color-warning);
      }

      &.danger .p-progressbar-value {
        background-color: var(--color-error);
      }
    }
  }
}

.no-tables {
  font-style: italic;
  color: var(--color-text-dark-secondary);
  margin-bottom: 1rem;
}

.refresh-tables-button, .regenerate-all-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.regenerate-all {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}

:deep(.p-button) {
  background-color: transparent;
  color: var(--color-text-hyperlink);
  border: 1px solid var(--color-border-light);

  &:hover {
    background-color: var(--color-border-light-highlight);
    color: var(--color-text-hyperlink-hover);
  }
}

:deep(.p-inputnumber-button) {
  background-color: transparent;
  color: var(--color-text-dark-primary);
  border: 1px solid var(--color-border-light);

  &:hover {
    background-color: var(--color-border-light-highlight);
  }
}
</style>