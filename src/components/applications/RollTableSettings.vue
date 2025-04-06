<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
      <div class="form-group">
        <label style="flex:8">{{ localize('settings.autoRefreshRollTables') }}</label>
        <div class="form-fields">
          <Checkbox
            v-model="autoRefresh"
            binary
            unstyled
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
          unstyled
          />
        </div>
        <p class="hint">
          {{ localize('settings.rollTableConfig.defaultTypeTavernHelp') }}
        </p>
      </div>

      <footer class="form-footer" data-application-part="footer">
        <button
          @click="onRefreshTablesClick"
        >
          <i class="fas fa-sync"></i>
          <label>{{ localize('applications.rollTableSettings.labels.refreshAll') }}</label>
        </button>
        <!-- <p class="hint">
          {{ localize('applications.rollTableSettings.labels.refreshAllHelp') }}
        </p> -->
        <button 
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
  import { refreshAllRollTables, } from '@/utils/nameGenerators';
  import { rollTableSettingsApp } from '@/applications/settings/RollTableSettingsApplication';
  import { localize } from '@/utils/game';

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

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onSubmitClick = async () => {
    await ModuleSettings.set(SettingKey.autoRefreshRollTables, autoRefresh.value);

    // @ts-ignore - we know that we have a valid config to start with
    await ModuleSettings.set(SettingKey.generatorConfig, {
      ...ModuleSettings.get(SettingKey.generatorConfig),
      defaultTypes: defaultTypes.value,
    });
    rollTableSettingsApp?.close();
  };

  const onRefreshTablesClick = async () => {
    await refreshAllRollTables();
  };

    ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // make sure we have the config object
    if (!ModuleSettings.get(SettingKey.generatorConfig)) {
      throw new Error('No config set up in RollTableSettings.onMounted');
    }

    // load the settings
    autoRefresh.value = ModuleSettings.get(SettingKey.autoRefreshRollTables);
    defaultTypes.value = ModuleSettings.get(SettingKey.generatorConfig)?.defaultTypes || {
      [GeneratorType.NPC]: '',
      [GeneratorType.Town]: '',
      [GeneratorType.Store]: '',
      [GeneratorType.Tavern]: '',
    };
  });

</script>

<style lang="scss">
</style>