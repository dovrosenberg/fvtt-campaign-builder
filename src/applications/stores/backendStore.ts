// this store handles activities specific to the backend
// 
// library imports
import { defineStore } from 'pinia';

// local imports
import { ApiCharacterGenerateImagePostRequest, ApiCharacterGeneratePostRequest, ApiLocationGenerateImagePostRequest, ApiLocationGeneratePostRequest, ApiNameCharactersPostRequest, ApiNameStoresPostRequest, ApiNameTavernsPostRequest, ApiNameTownsPostRequest, ApiOrganizationGenerateImagePostRequest, ApiOrganizationGeneratePostRequest, ApiPollEmailTodoGet200Response, Configuration, FCBApi } from '@/apiClient';
import { ModuleSettings, SettingKey } from '@/settings';
import { notifyError, notifyInfo, notifyWarn } from '@/utils/notifications';
import { isClientGM, localize } from '@/utils/game';
import { useMainStore } from './mainStore';
import { version } from '@module'

// types
import { Campaign } from '@/classes';
import { reactive, ref } from 'vue';

// this is the backend version that needs to be used with this version of the module
// generally, we'll try to keep them more or less in sync, at least at the minor release level
const REQUIRED_VERSION = '1.4';

export const useBackendStore = defineStore('backend', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();

  ///////////////////////////////
  // internal state
  let api: FCBApi | null = null;

  ///////////////////////////////
  // external state
  const config = ref<Configuration | null>(null);
  const available = ref<boolean>(false);
  const inProgress = ref<boolean>(false);
  const isGeneratingImage = reactive<Record<string, boolean>>({});

  ///////////////////////////////
  // actions

  /** force will reconnect even if already connected (ex. when changing credentials) */
  const configure = async(force: boolean = false): Promise<void>  => {
    if (!isClientGM() || (inProgress.value || (available.value && !force))) {
      return;
    }

    available.value = false;
    inProgress.value = true;

    try {
      config.value = new Configuration();
      config.value.accessToken = ModuleSettings.get(SettingKey.APIToken);
      config.value.basePath = ModuleSettings.get(SettingKey.APIURL);    

      // if both settings are blank, no need to do anything
      if (!config.value.accessToken && !config.value.basePath) {
        inProgress.value = false;
        return;
      }

      // make sure credentials are valid by checking the version
      api = new FCBApi(config.value);

      let versionResult: Awaited<ReturnType<FCBApi['apiVersionGet']>>;

      try {
        versionResult = await api.apiVersionGet();
      } catch (e) {
        if (!ModuleSettings.get(SettingKey.hideBackendWarning)) 
          notifyError(localize('notifications.backend.failedConnection'));

        inProgress.value = false;
        return;
      }

      // see if the backend version matches the front-end and show an error if it doesn't

      // if the module version is dev - then just deal with it... maybe put up a warning
      switch (versionResult.data.version) {
        case (REQUIRED_VERSION):
          break;
        default:
          if (version === '#{VERSION}#') {
            // development version of front-end... do nothing (can't deploy through store with this version so it can only be a special case)
            notifyWarn(`Development module detected.  Connected to backend version ${versionResult.data.version} at ${config.value.basePath}`);
          } else {
            // anything else means the version is wrong
            // output a foundry error message
            notifyError(localize('notifications.backend.versionMismatch')
              .replace('$1', `${versionResult.data.version}`)
              .replace('$2', `${REQUIRED_VERSION}`));

            inProgress.value = false;
            return;
          }; break;
        }
      
      // made it here - good to go!
      // let's set the default models if they haven't been set yet
      if (!ModuleSettings.get(SettingKey.selectedTextModel)) {
        const models = await api.apiModelsTextGet();

        if ( models.data?.models && models.data?.models[0] ) {
          ModuleSettings.set(SettingKey.selectedTextModel, models.data?.models[0].id);
        }
      }
      if (!ModuleSettings.get(SettingKey.selectedImageModel)) {
        const models = await api.apiModelsImageGet();

        if ( models.data?.models && models.data?.models[0] ) {
          ModuleSettings.set(SettingKey.selectedImageModel, models.data?.models[0].id);
        }
      }

      notifyInfo(localize('notifications.backend.successfulConnection'));
      available.value = true;

      // let's also poll for email since we just connected
      await pollForEmail();
    } finally {
      inProgress.value = false;
    }
  };

  const pollForEmail = async (): Promise<void> => {
    if (!isClientGM() || !ModuleSettings.get(SettingKey.useGmailToDos)) 
      return;

    const campaign = await Campaign.fromUuid(ModuleSettings.get(SettingKey.emailDefaultCampaign));

    if (!campaign) {
      notifyError(localize('notifications.backend.emailSettingsNotSet'));
      return;
    }

    let ideas: ApiPollEmailTodoGet200Response['items'] | null = null;
    try {
      ideas = (await api!.apiPollEmailTodoGet())?.data?.items || null;
    } catch (error) {
      notifyError("Backend threw an error when polling for mail.");
      return;
    }

    if (ideas) {
      for (const idea of ideas) {
        if (idea) {
          await campaign.addIdea(idea.text);
        }
      }

      // if the campaign is showing, refresh
      if (mainStore.currentCampaign?.uuid === campaign.uuid) {
        await mainStore.refreshCampaign();
      }
    }
  };

  const getNamePreview = async (nameStyles: string[], genre: string, settingFeeling: string) => {
    return await api?.apiNamePreviewPost({
      nameStyles,
      genre,
      settingFeeling
    });    
  };

  const getImageModels = async () => {
    return await api?.apiModelsImageGet();
  };

  const getTextModels = async () => {
    return await api?.apiModelsTextGet();
  };

  const generateLocation = async (options: ApiLocationGeneratePostRequest) => {
    return await api?.apiLocationGeneratePost(options)
  }

  const generateOrganization = async (options: ApiOrganizationGeneratePostRequest) => {
    return await api?.apiOrganizationGeneratePost(options)
  }

  const generateCharacter = async (options: ApiCharacterGeneratePostRequest) => {
    return await api?.apiCharacterGeneratePost(options)
  }

  const generateCharacterImage = async (options: ApiCharacterGenerateImagePostRequest) => {
    return await api?.apiCharacterGenerateImagePost(options);
  }

  const generateLocationImage = async (options: ApiLocationGenerateImagePostRequest) => {
    return await api?.apiLocationGenerateImagePost(options);
  }

  const generateOrganizationImage = async (options: ApiOrganizationGenerateImagePostRequest) => {
    return await api?.apiOrganizationGenerateImagePost(options);
  }

  const generateCharacterNames = async (options: ApiNameCharactersPostRequest) => {
    return await api?.apiNameCharactersPost(options);
  } 

  const generateStoreNames = async (options: ApiNameStoresPostRequest) => {
    return await api?.apiNameStoresPost(options);
  } 

  const generateTavernNames = async (options: ApiNameTavernsPostRequest) => {
    return await api?.apiNameTavernsPost(options);
  } 

  const generateTownNames = async (options: ApiNameTownsPostRequest) => {
    return await api?.apiNameTownsPost(options);
  } 

  ///////////////////////////////
  // watchers

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    config,
    available,
    inProgress,
    isGeneratingImage,

    configure,
    pollForEmail,
    getNamePreview,
    getImageModels,
    getTextModels,
    generateLocation,
    generateOrganization,
    generateCharacter,
    generateCharacterImage,
    generateLocationImage,
    generateOrganizationImage,
    generateCharacterNames,
    generateStoreNames,
    generateTavernNames,
    generateTownNames,
  }
});
