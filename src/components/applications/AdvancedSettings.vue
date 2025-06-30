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
        <label>{{ localize('applications.advancedSettings.labels.textModel') }}</label>
        <div class="form-fields">
          <Select
            v-model="textModel"
            :options="textModelOptions"
            optionLabel="name"
            optionValue="id"
            :placeholder="localize('applications.advancedSettings.labels.selectTextModel')"
            :disabled="!backendAvailable"
            >
            <template #option="slotProps">
              <div class="model-option">
                <div>{{ slotProps.option.name }}</div>
                <small class="description">{{ slotProps.option.description }}</small>
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
            v-model="imageModel"
            :options="imageModelOptions"
            optionLabel="name"
            optionValue="id"
            :placeholder="localize('applications.advancedSettings.labels.selectImageModel')"
            :disabled="!backendAvailable"
            >
            <template #option="slotProps">
              <div class="model-option">
                <div>{{ slotProps.option.name }}</div>
                <small class="description">{{ slotProps.option.description }}</small>
              </div>
            </template>
          </Select>
        </div>
        <p class="hint">
          {{ localize('applications.advancedSettings.labels.imageModelHint') }}
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
  import { onMounted, ref, toRaw, computed } from 'vue';
  
  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import { TextModel, ImageModel } from '@/types/api';
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
  const textModel = ref<TextModel | undefined>(undefined);
  const imageModel = ref<ImageModel | undefined>(undefined);
  const defaultToLongDescriptions = ref<boolean>(true);
  const longDescriptionParagraphs = ref<number>(1);
  const useGmailToDos = ref<boolean>(false);
  const emailDefaultWorld = ref<string>('');
  const emailDefaultCampaign = ref<string>('');
  const worldOptions = ref<{uuid: string, name: string}[]>([]);
  const campaignOptions = ref<{uuid: string, name: string}[]>([]);
  const backendAvailable = computed(() => Backend.available);
  const textModelOptions = computed(() => Backend.textModels);
  const imageModelOptions = computed(() => Backend.imageModels);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const loadWorlds = async () => {
    const defaultFolders = await getDefaultFolders();
    if (!defaultFolders || !defaultFolders.rootFolder)
      worldOptions.value = [];
    else 
      worldOptions.value = (toRaw(defaultFolders.rootFolder) as Folder)?.children?.map(w => ({ uuid: w.folder.uuid, name: w.folder.name })) || [];
  };

  const loadCampaigns = async (worldUuid: string) => {
    if (!worldUuid) {
      campaignOptions.value = [];
      return;
    }

    const world = await Setting.fromUuid(worldUuid);
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
    await ModuleSettings.set(SettingKey.textModel, textModel.value);
    await ModuleSettings.set(SettingKey.imageModel, imageModel.value);
    await ModuleSettings.set(SettingKey.defaultToLongDescriptions, defaultToLongDescriptions.value);
    await ModuleSettings.set(SettingKey.longDescriptionParagraphs, longDescriptionParagraphs.value);
    await ModuleSettings.set(SettingKey.useGmailToDos, useGmailToDos.value);
    await ModuleSettings.set(SettingKey.emailDefaultWorld, emailDefaultWorld.value);
    await ModuleSettings.set(SettingKey.emailDefaultCampaign, emailDefaultCampaign.value);

    // reset the backend
    await Backend.configure(true);

    // close
    advancedSettingsApp?.close();
  }

  const onResetClick = async () => {
    APIURL.value = ModuleSettings.get(SettingKey.APIURL);
    APIToken.value = ModuleSettings.get(SettingKey.APIToken);
    if (!Backend.available) {
      textModel.value = undefined;
      imageModel.value = undefined;
    } else {
      textModel.value = ModuleSettings.get(SettingKey.textModel);
      imageModel.value = ModuleSettings.get(SettingKey.imageModel);
    }
    defaultToLongDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
    longDescriptionParagraphs.value = ModuleSettings.get(SettingKey.longDescriptionParagraphs);
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
    if (!Backend.available) {
      textModel.value = undefined;
      imageModel.value = undefined;
    } else {
      textModel.value = ModuleSettings.get(SettingKey.textModel);
      imageModel.value = ModuleSettings.get(SettingKey.imageModel);
    }
    defaultToLongDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
    longDescriptionParagraphs.value = ModuleSettings.get(SettingKey.longDescriptionParagraphs);
    useGmailToDos.value = ModuleSettings.get(SettingKey.useGmailToDos);
    emailDefaultWorld.value = ModuleSettings.get(SettingKey.emailDefaultWorld);
    emailDefaultCampaign.value = ModuleSettings.get(SettingKey.emailDefaultCampaign);

    // load the worlds and campaigns
    await loadWorlds();
    await loadCampaigns(emailDefaultWorld.value);
  })
  

</script>

<style lang="scss">
  .model-option {
    display: flex;
    flex-direction: column;

    .description {
      font-size: 0.8rem;
      opacity: 0.7;
      max-width: 500px;
      text-wrap: auto;
    }
  }
</style>

