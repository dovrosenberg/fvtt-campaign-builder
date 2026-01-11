<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
      <div class="form-group">
        <label style="flex:8">{{ localize('settings.autoRefreshRollTables') }}</label>
        <div class="form-fields">
          <Checkbox
            v-model="autoRefresh"
            data-testid="auto-refresh-checkbox"
            binary
          />
        </div>
        <p class="hint">
          {{ localize('settings.autoRefreshRollTablesHelp') }}
        </p>
      </div>
      <div class="form-group">
        <label style="flex:8">{{ localize('settings.rollTableConfig.defaultTypeNPC') }}</label>
        <div class="form-fields">
          <Inputtext
            v-model="defaultTypes[GeneratorType.NPC]"
            data-testid="default-type-npc-input"
            unstyled
          />
        </div>
        <p class="hint">
          {{ localize('settings.rollTableConfig.defaultTypeNPCHelp') }}
        </p>
      </div>
      <div class="form-group">
        <label style="flex:8">{{ localize('settings.rollTableConfig.defaultTypeTown') }}</label>
        <div class="form-fields">
          <Inputtext
          v-model="defaultTypes[GeneratorType.Town]"
          data-testid="default-type-town-input"
          unstyled
          />
        </div>
        <p class="hint">
          {{ localize('settings.rollTableConfig.defaultTypeTownHelp') }}
        </p>
      </div>
      <div class="form-group">
        <label style="flex:8">{{ localize('settings.rollTableConfig.defaultTypeStore') }}</label>
        <div class="form-fields">
          <Inputtext
          v-model="defaultTypes[GeneratorType.Store]"
          data-testid="default-type-store-input"
          unstyled
          />
        </div>
        <p class="hint">
          {{ localize('settings.rollTableConfig.defaultTypeStoreHelp') }}
        </p>
      </div>
      <div class="form-group">
        <label style="flex:8">{{ localize('settings.rollTableConfig.defaultTypeTavern') }}</label>
        <div class="form-fields">
          <Inputtext
          v-model="defaultTypes[GeneratorType.Tavern]"
          data-testid="default-type-tavern-input"
          unstyled
          />
        </div>
        <p class="hint">
          {{ localize('settings.rollTableConfig.defaultTypeTavernHelp') }}
        </p>
      </div>

      <footer class="form-footer" data-application-part="footer">
        <button
          data-testid="refresh-tables-button"
          @click="onRefreshTablesClick"
          :disabled="isRefreshing"
        >
          <i :class="isRefreshing ? 'fas fa-spinner fa-spin' : 'fas fa-sync'"></i>
          <label>{{ localize('applications.rollTableSettings.labels.refreshAll') }}</label>
        </button>
        <button 
          data-testid="roll-table-settings-save-button"
          @click="onSubmitClick"
        >
          <i class="fa-solid fa-save"></i>
          <label>{{ localize('labels.saveChanges') }}</label>
        </button>
      </footer>
    </div>
  </section>
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, ref, } from 'vue';

  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import NameGeneratorsService from '@/utils/nameGenerators';
  import { rollTableSettingsApp } from '@/applications/settings/RollTableSettingsApplication';
  import { localize } from '@/utils/game';
  import { notifyError, notifyInfo } from '@/utils/notifications';
  import AppWindowService from '@/utils/appWindow';
  import { useMainStore } from '@/applications/stores';
  
  // library components
  import Checkbox from 'primevue/checkbox';
  import Inputtext from 'primevue/inputtext';

  // local components

  // types
  import { GeneratorType } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const autoRefresh = ref<boolean>(ModuleSettings.get(SettingKey.autoRefreshRollTables));
  const defaultTypes = ref<Record<GeneratorType, string>>({
    [GeneratorType.NPC]: '',
    [GeneratorType.Town]: '',
    [GeneratorType.Store]: '',
    [GeneratorType.Tavern]: '',
  });
  const isRefreshing = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onSubmitClick = async () => {
    await ModuleSettings.set(SettingKey.autoRefreshRollTables, autoRefresh.value);

    // @ts-ignore - we know that we have a valid config to start with
    await ModuleSettings.set(SettingKey.generatorDefaultTypes, {
      ...ModuleSettings.get(SettingKey.generatorDefaultTypes),
      ...defaultTypes.value,
    });

    if (AppWindowService.ilsCampaignBuilderAppOpen()) {
      await useMainStore().refreshCurrentContent();
    }
    rollTableSettingsApp?.close();
  };

  const onRefreshTablesClick = async () => {
    if (isRefreshing.value) return; // Prevent multiple clicks
    
    isRefreshing.value = true;
    
    try {
      // Refresh setting-specific tables for all settings
      await NameGeneratorsService.refreshAllSettingRollTables(true);
      notifyInfo(localize('applications.rollTableSettings.notifications.refreshSuccess'));
    } catch (error) {
      console.error('Error refreshing roll tables:', error);
      notifyError(localize('applications.rollTableSettings.notifications.refreshError'));
    } finally {
      isRefreshing.value = false;
    }
  };

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    autoRefresh.value = ModuleSettings.get(SettingKey.autoRefreshRollTables);
    defaultTypes.value = ModuleSettings.get(SettingKey.generatorDefaultTypes) || {
      [GeneratorType.NPC]: '',
      [GeneratorType.Town]: '',
      [GeneratorType.Store]: '',
      [GeneratorType.Tavern]: '',
    };
  });

</script>

<style lang="scss">
</style>