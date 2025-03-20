<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
      <div class="form-group">
        <label>Backend URL</label>
        <div class="form-fields">
          <InputText
            v-model="APIURL"
          />
        </div>
        <p class="hint">
          When you run the script to deploy the backend, it outputs this.
        </p>
      </div>

      <div class="form-group">
        <label>API Token</label>
        <div class="form-fields">
          <InputText
            v-model="APIToken"
          />
        </div>
        <p class="hint">
          When you run the script to deploy the backend, it outputs this.
        </p>
      </div>

      <footer class="form-footer" data-application-part="footer">
        <button 
          @click="onClickReset"
        >
          <i class="fa-solid fa-undo"></i>
          <label>Reset</label>
        </button>
        <button 
          @click="onClickSubmit"
        >
          <i class="fa-solid fa-save"></i>
          <label>Save Changes</label>
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
  import { Backend } from '@/classes/Backend';
  import { advancedSettingsApp } from '@/applications/settings/AdvancedSettingsApplication';
    
  // library components
  import InputText from 'primevue/inputtext';


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

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onClickSubmit = async () => {
    await ModuleSettings.set(SettingKey.APIURL, APIURL.value);
    await ModuleSettings.set(SettingKey.APIToken, APIToken.value);

    // reset the backend
    await Backend.configure();

    // close
    advancedSettingsApp?.close();
  }

  const onClickReset = async () => {
    APIURL.value =  ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
  }

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    APIURL.value =  ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
  })
  

</script>

<style lang="scss">
</style>

