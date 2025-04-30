<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.backendURL') }}</label>
        <div class="form-fields">
          <InputText
            v-model="APIURL"
            unstyled
          />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.backendURLHint') }}
        </p>
      </div>

      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.APIToken') }}</label>
        <div class="form-fields">
          <InputText
            v-model="APIToken"
            unstyled
          />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.APITokenHint') }}
        </p>
      </div>

      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.defaultToLong') }}</label>
        <div class="form-fields">
          <Checkbox 
              v-model="defaultToLongDescriptions" 
              :binary="true"
            />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.defaultToLongHint') }}
        </p>
      </div>

      <footer class="form-footer" data-application-part="footer">
        <button 
          @click="onResetClick"
        >
          <i class="fa-solid fa-undo"></i>
          <label>{{ localize('labels.reset') }}</label>
        </button>
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
  import { onMounted, ref } from 'vue';
  
  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import { Backend } from '@/classes';
  import { advancedSettingsApp } from '@/applications/settings/AdvancedSettingsApplication';
  import { localize } from '@/utils/game';

  // library components
  import InputText from 'primevue/inputtext';
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
  const APIURL = ref<string>('');
  const APIToken = ref<string>('');
  const defaultToLongDescriptions = ref<boolean>(true);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onSubmitClick = async () => {
    await ModuleSettings.set(SettingKey.APIURL, APIURL.value);
    await ModuleSettings.set(SettingKey.APIToken, APIToken.value);
    await ModuleSettings.set(SettingKey.defaultToLongDescriptions, defaultToLongDescriptions.value);

    // reset the backend
    await Backend.configure();

    // close
    advancedSettingsApp?.close();
  }

  const onResetClick = async () => {
    APIURL.value =  ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    defaultToLongDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
  }

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    APIURL.value =  ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    defaultToLongDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
  })
  

</script>

<style lang="scss">
</style>

