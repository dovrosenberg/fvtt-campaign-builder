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

      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.useGmailToDos') }}</label>
        <div class="form-fields">
          <Checkbox 
              v-model="useGmailToDos" 
              :binary="true"
            />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.useGmailToDosHint') }}
        </p>
      </div>

      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.emailDefaultWorld') }}</label>
        <div class="form-fields">
          <Select
            v-model="emailDefaultWorld"
            :options="worldOptions"
            optionLabel="name"
            optionValue="uuid"
            :placeholder="localize('applications.advancedSettings.labels.selectWorld')"
            :disabled="!useGmailToDos"
            @change="onWorldChange"
          />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.emailDefaultWorldHint') }}
        </p>
      </div>

      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.emailDefaultCampaign') }}</label>
        <div class="form-fields">
          <Select
            v-model="emailDefaultCampaign"
            :options="campaignOptions"
            optionLabel="name"
            optionValue="uuid"
            :placeholder="localize('applications.advancedSettings.labels.selectCampaign')"
            :disabled="!emailDefaultWorld"
          />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.emailDefaultCampaignHint') }}
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
          :disabled="useGmailToDos && (!emailDefaultWorld || !emailDefaultCampaign)"
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
  import { onMounted, ref, toRaw } from 'vue';
  
  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import { Backend, WBWorld } from '@/classes';
  import { advancedSettingsApp } from '@/applications/settings/AdvancedSettingsApplication';
  import { localize } from '@/utils/game';
  import { getDefaultFolders } from '@/compendia';

  // library components
  import InputText from 'primevue/inputtext';
  import Checkbox from 'primevue/checkbox';
  import Select from 'primevue/select';


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
  const useGmailToDos = ref<boolean>(false);
  const emailDefaultWorld = ref<string>('');
  const emailDefaultCampaign = ref<string>('');
  const worldOptions = ref<{uuid: string, name: string}[]>([]);
  const campaignOptions = ref<{uuid: string, name: string}[]>([]);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const loadWorlds = async () => {
    const defaultFolders = await getDefaultFolders();
    if (!defaultFolders || !defaultFolders.rootFolder)
      worldOptions.value = [];
    else 
      worldOptions.value = (toRaw(defaultFolders.rootFolder) as Folder)?.children?.map(w => ({ uuid: w.folder.uuid, name: w.folder.name }));
  };

  const loadCampaigns = async (worldUuid: string) => {
    if (!worldUuid) {
      campaignOptions.value = [];
      return;
    }

    const world = await WBWorld.fromUuid(worldUuid);
    if (!world) {
      campaignOptions.value = [];
      return;
    }

    await world.loadCampaigns();
    campaignOptions.value = Object.entries(world.campaignNames).map(([uuid, name]) => ({ uuid, name: name as string }));
  };

  ////////////////////////////////
  // event handlers
  const onWorldChange = async () => {
    emailDefaultCampaign.value = '';
    await loadCampaigns(emailDefaultWorld.value);
  };

  const onSubmitClick = async () => {
    await ModuleSettings.set(SettingKey.APIURL, APIURL.value);
    await ModuleSettings.set(SettingKey.APIToken, APIToken.value);
    await ModuleSettings.set(SettingKey.defaultToLongDescriptions, defaultToLongDescriptions.value);
    await ModuleSettings.set(SettingKey.useGmailToDos, useGmailToDos.value);
    await ModuleSettings.set(SettingKey.emailDefaultWorld, emailDefaultWorld.value);
    await ModuleSettings.set(SettingKey.emailDefaultCampaign, emailDefaultCampaign.value);

    // reset the backend
    await Backend.configure();

    // close
    advancedSettingsApp?.close();
  }

  const onResetClick = async () => {
    APIURL.value = ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    defaultToLongDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
    useGmailToDos.value = ModuleSettings.get(SettingKey.useGmailToDos);
    emailDefaultWorld.value = ModuleSettings.get(SettingKey.emailDefaultWorld);
    emailDefaultCampaign.value = ModuleSettings.get(SettingKey.emailDefaultCampaign);
    await loadCampaigns(emailDefaultWorld.value);
  }

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    APIURL.value = ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    defaultToLongDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
    useGmailToDos.value = ModuleSettings.get(SettingKey.useGmailToDos);
    emailDefaultWorld.value = ModuleSettings.get(SettingKey.emailDefaultWorld);
    emailDefaultCampaign.value = ModuleSettings.get(SettingKey.emailDefaultCampaign);

    // load the worlds and campaigns
    await loadWorlds();
    await loadCampaigns(emailDefaultWorld.value);
  })
  

</script>

<style lang="scss">
</style>

