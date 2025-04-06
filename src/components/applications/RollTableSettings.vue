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

  // local components

  // types

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const autoRefresh = ref<boolean>(ModuleSettings.get(SettingKey.autoRefreshRollTables));
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onSubmitClick = async () => {
    await ModuleSettings.set(SettingKey.autoRefreshRollTables, autoRefresh.value);
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
    // load the settings
    autoRefresh.value = ModuleSettings.get(SettingKey.autoRefreshRollTables);
  });

</script>

<style lang="scss">
</style>