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
        <label>{{ localize('applications.advancedSettings.labels.longDescriptionParagraphs') }}</label>
        <div class="form-fields">
          <RangePicker
            v-model="longDescriptionParagraphs"
            name="longDescriptionParagraphs"
            :min="1"
            :max="4"
            :step="1"
          />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.longDescriptionParagraphsHint') }}
        </p>
      </div>

      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.useGmailIdeas') }}</label>
        <div class="form-fields">
          <Checkbox 
              v-model="useGmailToDos" 
              :binary="true"
            />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.useGmailIdeasHint') }}
        </p>
      </div>

      <div class="form-group">
        <label>{{ localize('applications.advancedSettings.labels.emailDefaultSetting') }}</label>
        <div class="form-fields">
          <Select
            v-model="emailDefaultSetting"
            :options="settingOptions"
            optionLabel="name"
            optionValue="uuid"
            :placeholder="localize('applications.advancedSettings.labels.selectSetting')"
            :disabled="!useGmailToDos"
            @change="onSettingChange"
          />
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.emailDefaultSettingHint') }}
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
            :disabled="!emailDefaultSetting"
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
          :disabled="useGmailToDos && (!emailDefaultSetting || !emailDefaultCampaign)"
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
  import { Backend, Setting } from '@/classes';
  import { advancedSettingsApp } from '@/applications/settings/AdvancedSettingsApplication';
  import { localize } from '@/utils/game';
  import { getDefaultFolders } from '@/compendia';

  // library components
  import InputText from 'primevue/inputtext';
  import Checkbox from 'primevue/checkbox';
  import Select from 'primevue/select';

  // local components
  import RangePicker from '@/components/RangePicker.vue';

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
  const longDescriptionParagraphs = ref<number>(1);
  const useGmailToDos = ref<boolean>(false);
  const emailDefaultSetting = ref<string>('');
  const emailDefaultCampaign = ref<string>('');
  const settingOptions = ref<{uuid: string, name: string}[]>([]);
  const campaignOptions = ref<{uuid: string, name: string}[]>([]);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const loadSettings = async () => {
    const defaultFolders = await getDefaultFolders();
    if (!defaultFolders || !defaultFolders.rootFolder)
      settingOptions.value = [];
    else 
      settingOptions.value = (toRaw(defaultFolders.rootFolder) as Folder)?.children?.map(w => ({ uuid: w.folder.uuid, name: w.folder.name }));
  };

  const loadCampaigns = async (settingUuid: string) => {
    if (!settingUuid) {
      campaignOptions.value = [];
      return;
    }

    const setting = await Setting.fromUuid(settingUuid);
    if (!setting) {
      campaignOptions.value = [];
      return;
    }

    await setting.loadCampaigns();
    campaignOptions.value = Object.entries(setting.campaignNames).map(([uuid, name]) => ({ uuid, name: name as string }));
  };

  ////////////////////////////////
  // event handlers
  const onSettingChange = async () => {
    emailDefaultCampaign.value = '';
    await loadCampaigns(emailDefaultSetting.value);
  };

  const onSubmitClick = async () => {
    await ModuleSettings.set(SettingKey.APIURL, APIURL.value);
    await ModuleSettings.set(SettingKey.APIToken, APIToken.value);
    await ModuleSettings.set(SettingKey.defaultToLongDescriptions, defaultToLongDescriptions.value);
    await ModuleSettings.set(SettingKey.longDescriptionParagraphs, longDescriptionParagraphs.value);
    await ModuleSettings.set(SettingKey.useGmailToDos, useGmailToDos.value);
    await ModuleSettings.set(SettingKey.emailDefaultSetting, emailDefaultSetting.value);
    await ModuleSettings.set(SettingKey.emailDefaultCampaign, emailDefaultCampaign.value);

    // reset the backend
    await Backend.configure(true);

    // close
    advancedSettingsApp?.close();
  }

  const onResetClick = async () => {
    APIURL.value = ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    defaultToLongDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
    longDescriptionParagraphs.value = ModuleSettings.get(SettingKey.longDescriptionParagraphs);
    useGmailToDos.value = ModuleSettings.get(SettingKey.useGmailToDos);
    emailDefaultSetting.value = ModuleSettings.get(SettingKey.emailDefaultSetting);
    emailDefaultCampaign.value = ModuleSettings.get(SettingKey.emailDefaultCampaign);
    await loadCampaigns(emailDefaultSetting.value);
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
    longDescriptionParagraphs.value = ModuleSettings.get(SettingKey.longDescriptionParagraphs);
    useGmailToDos.value = ModuleSettings.get(SettingKey.useGmailToDos);
    emailDefaultSetting.value = ModuleSettings.get(SettingKey.emailDefaultSetting);
    emailDefaultCampaign.value = ModuleSettings.get(SettingKey.emailDefaultCampaign);

    // load the settings and campaigns
    await loadSettings();
    await loadCampaigns(emailDefaultSetting.value);
  })
  

</script>

<style lang="scss">
</style>

