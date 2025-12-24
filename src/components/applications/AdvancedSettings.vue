<template>
  <section class="standard-form">
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <div class="fcb-sheet-subtab-container flexrow">
        <div class="fcb-subtab-wrapper">
          <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
            <a class="item" data-tab="backend">{{ localize('applications.advancedSettings.tabs.backend') }}</a>
            <a class="item" data-tab="models">{{ localize('applications.advancedSettings.tabs.models') }}</a>
           <a class="item" data-tab="email">{{ localize('applications.advancedSettings.tabs.email') }}</a>
          </nav>
          <div class="fcb-tab-body flexrow">
            <!-- API Settings Tab -->
            <div class="tab flexcol" data-group="primary" data-tab="backend">
              <div class="standard-form scrollable">
                <div class="form-group">
                  <label>{{ localize('applications.advancedSettings.labels.backendURL') }}</label>
                  <div class="form-fields">
                    <InputText
                      v-model="APIURL"
                      data-testid="api-url-input"
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
                      data-testid="api-token-input"
                      unstyled
                    />
                  </div>
                  <p class="hint">
                    {{ localize('applications.advancedSettings.labels.APITokenHint') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Models Settings Tab -->
            <div class="tab flexcol" data-group="primary" data-tab="models">
              <div class="standard-form scrollable">
                <div class="form-group">
                  <label>{{ localize('applications.advancedSettings.labels.textModel') }}</label>
                  <div class="form-fields">
                    <Select
                      v-model="selectedTextModel"
                      data-testid="text-model-select"
                      :options="textModelOptions"
                      optionLabel="name"
                      optionValue="id"
                    >
                      <template #option="slotProps">
                        <div style="max-width: 300px">
                          <div>{{ slotProps.option.name }}</div>
                          <div style="font-size: var(--fcb-font-size); text-wrap: auto;" class="text-gray-600">{{ slotProps.option.description }}</div>
                        </div>
                      </template>
                    </Select>
                  </div>
                  <p class="hint">
                    {{ localize('applications.advancedSettings.labels.textModelHint') }}
                  </p>
                </div>

                <div class="form-group">
                  <label>{{ localize('applications.advancedSettings.labels.imageModel') }}</label>
                  <div class="form-fields">
                    <Select
                      v-model="selectedImageModel"
                      data-testid="image-model-select"
                      :options="imageModelOptions"
                      optionLabel="name"
                      optionValue="id"
                    >
                      <template #option="slotProps">
                        <div style="max-width: 300px">
                          <div>{{ slotProps.option.name }}</div>
                          <div style="font-size: var(--fcb-font-size); text-wrap: auto;" class="text-gray-600">{{ slotProps.option.description }}</div>
                        </div>
                      </template>
                    </Select>
                  </div>
                  <p class="hint">
                    {{ localize('applications.advancedSettings.labels.imageModelHint') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Email Settings Tab -->
            <div class="tab flexcol" data-group="primary" data-tab="email">
              <div class="standard-form scrollable">
                <div class="form-group">
                  <label>{{ localize('applications.advancedSettings.labels.useGmailIdeas') }}</label>
                  <div class="form-fields">
                    <Checkbox 
                        v-model="useGmailToDos" 
                        data-testid="use-gmail-checkbox"
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
                      data-testid="email-default-setting-select"
                      :options="settingOptions"
                      optionLabel="name"
                      optionValue="uuid"
                      @change="onSettingChange"
                    />
                  </div>
                  <p class="hint">
                    {{ localize('applications.advancedSettings.labels.emailDefaultSettingHint') }}
                  </p>
                </div>

                <div class="form-group" v-if="emailDefaultSetting">
                  <label>{{ localize('applications.advancedSettings.labels.emailDefaultCampaign') }}</label>
                  <div class="form-fields">
                    <Select
                      v-model="emailDefaultCampaign"
                      data-testid="email-default-campaign-select"
                      :options="campaignOptions"
                      optionLabel="name"
                      optionValue="uuid"
                      :disabled="!emailDefaultSetting"
                    />
                  </div>
                  <p class="hint">
                    {{ localize('applications.advancedSettings.labels.emailDefaultCampaignHint') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer class="form-footer" data-application-part="footer">
        <button 
          data-testid="advanced-settings-reset-button"
          @click="onResetClick"
        >
          <i class="fa-solid fa-undo"></i>
          <label>{{ localize('labels.reset') }}</label>
        </button>
        <button 
          class="fcb-save-button"
          data-testid="advanced-settings-save-button"
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
  import { onMounted, ref, nextTick } from 'vue';
  
  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import { useBackendStore } from '@/applications/stores';
  import { useMainStore } from '@/applications/stores';
  import { advancedSettingsApp } from '@/applications/settings/AdvancedSettingsApplication';
  import { localize } from '@/utils/game';
  import { getGlobalSetting } from '@/utils/globalSettings';
  import { isCampaignBuilderAppOpen } from '@/utils/appWindow';
  
  // library components
  import InputText from 'primevue/inputtext';
  import Checkbox from 'primevue/checkbox';
  import Select from 'primevue/select';

  // local components
  import RangePicker from '@/components/RangePicker.vue';

  // types
  import { Campaign, } from '@/classes';
  import { ApiLocationGenerateImagePostRequestImageModelEnum, ApiLocationGenerateImagePostRequestTextModelEnum } from '@/apiClient';
  
  ////////////////////////////////
  // props
  
  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const backendStore = useBackendStore();
  
  ////////////////////////////////
  // data
  const APIURL = ref<string>('');
  const APIToken = ref<string>('');
  const useGmailToDos = ref<boolean>(false);
  const emailDefaultSetting = ref<string>('');
  const emailDefaultCampaign = ref<string>('');
  const settingOptions = ref<{uuid: string, name: string}[]>([]);
  const campaignOptions = ref<{uuid: string, name: string}[]>([]);
  const selectedTextModel = ref<string>('');
  const selectedImageModel = ref<string>('');
  const textModelOptions = ref<{id: string, name: string, description: string}[]>([]);
  const imageModelOptions = ref<{id: string, name: string, description: string}[]>([]);
  const contentRef = ref<HTMLElement | null>(null);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const loadSettings = () => {
    const allSettings = ModuleSettings.get(SettingKey.settingIndex);
    settingOptions.value = allSettings.map(setting => ({ uuid: setting.settingId, name: setting.name })) || [];
  };

  const loadTextModels = async () => {
    try {
      const response = await backendStore.getTextModels();
      textModelOptions.value = response.data.models || [];
      selectedTextModel.value = ModuleSettings.get(SettingKey.selectedTextModel) || textModelOptions.value[0]?.id || '';
    } catch (error) {
      console.error('Failed to load text models:', error);
      textModelOptions.value = [];
    }
  };

  const loadImageModels = async () => {
    try {
      const response = await backendStore.getImageModels();
      imageModelOptions.value = response.data.models || [];
      selectedImageModel.value = ModuleSettings.get(SettingKey.selectedImageModel) || imageModelOptions.value[0]?.id || '';
    } catch (error) {
      console.error('Failed to load image models:', error);
      imageModelOptions.value = [];
    }
  };

  const loadCampaigns = async (settingUuid: string) => {
    if (!settingUuid) {
      campaignOptions.value = [];
      return;
    }

    const setting = await getGlobalSetting(settingUuid);
    if (!setting) {
      campaignOptions.value = [];
      return;
    }

    await setting.loadCampaigns();
    for (const index of setting.campaignIndex) {
      const campaign = await Campaign.fromUuid(index.uuid);
      if (campaign && !campaign.completed) {
        campaignOptions.value.push({ uuid: campaign.uuid, name: campaign.name });
      }
    }
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
    await ModuleSettings.set(SettingKey.useGmailToDos, useGmailToDos.value);
    await ModuleSettings.set(SettingKey.emailDefaultSetting, emailDefaultSetting.value);
    await ModuleSettings.set(SettingKey.emailDefaultCampaign, emailDefaultCampaign.value);
    await ModuleSettings.set(SettingKey.selectedTextModel, selectedTextModel.value as ApiLocationGenerateImagePostRequestTextModelEnum);
    await ModuleSettings.set(SettingKey.selectedImageModel, selectedImageModel.value as ApiLocationGenerateImagePostRequestImageModelEnum);

    // reset the backend
    await useBackendStore().configure(true);

    if (isCampaignBuilderAppOpen()) {
      await useMainStore().refreshCurrentContent();
    }

    // close
    advancedSettingsApp?.close();
  }

  const onResetClick = async () => {
    APIURL.value = ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    useGmailToDos.value = ModuleSettings.get(SettingKey.useGmailToDos);
    emailDefaultSetting.value = ModuleSettings.get(SettingKey.emailDefaultSetting);
    emailDefaultCampaign.value = ModuleSettings.get(SettingKey.emailDefaultCampaign);
    selectedTextModel.value = ModuleSettings.get(SettingKey.selectedTextModel);
    selectedImageModel.value = ModuleSettings.get(SettingKey.selectedImageModel);
    await loadCampaigns(emailDefaultSetting.value);
  }

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // Initialize tabs
    const tabs = new foundry.applications.ux.Tabs({
      navSelector: '.tabs',
      contentSelector: '.fcb-tab-body',
      initial: 'backend'
    });
    await nextTick();
    if (contentRef.value)
      tabs.bind(contentRef.value);

    // load the settings
    APIURL.value = ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    useGmailToDos.value = ModuleSettings.get(SettingKey.useGmailToDos);
    emailDefaultSetting.value = ModuleSettings.get(SettingKey.emailDefaultSetting);
    emailDefaultCampaign.value = ModuleSettings.get(SettingKey.emailDefaultCampaign);

    // load the settings and campaigns
    await loadSettings();
    await loadCampaigns(emailDefaultSetting.value);
    await loadTextModels();
    await loadImageModels();
  })
  

</script>

<style lang="scss">
</style>

