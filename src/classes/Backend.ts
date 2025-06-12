import { version } from '@module'
import { Configuration, FCBApi } from '@/apiClient';
import { ModuleSettings, SettingKey } from '@/settings';
import { notifyGMError, notifyGMInfo, notifyGMWarn } from '@/utils/notifications';
import { localize } from '@/utils/game';
import { Campaign } from '@/classes';
import { useMainStore } from '@/applications/stores';

// this is the backend version that needs to be used with this version of the module
// generally, we'll try to keep them more or less in sync, at least at the minor release level
const REQUIRED_VERSION = '0.0.10';

// handles connections to the backend
export class Backend {
  static config: Configuration;
  static available: boolean = false;
  static inProgress: boolean = false;  // this is used to prevent multiple calls to the backend; if false we're in the process of checking if backend is available
  
  static api: FCBApi;

  /** force will reconnect even if already connected (ex. when changing credentials) */
  static async configure(force: boolean = false) {
    if (Backend.inProgress || (Backend.available && !force)) {
      return;
    }

    Backend.available = false;
    Backend.inProgress = true;

    try {
      Backend.config = new Configuration();
      Backend.config.accessToken = ModuleSettings.get(SettingKey.APIToken);
      Backend.config.basePath = ModuleSettings.get(SettingKey.APIURL);    

      // if both settings are blank, no need to do anything
      if (!Backend.config.accessToken && !Backend.config.basePath) {
        Backend.inProgress = false;
        return;
      }

      // make sure credentials are valid by checking the version
      Backend.api = new FCBApi(Backend.config);

      let versionResult: Awaited<ReturnType<FCBApi['apiVersionGet']>>;

      try {
        versionResult = await Backend.api.apiVersionGet();
      } catch (e) {
        if (!ModuleSettings.get(SettingKey.hideBackendWarning)) 
          notifyGMError(localize('notifications.backend.failedConnection'));

        Backend.inProgress = false;
        return;
      }

      // see if the backend version matches the front-end and throw an error if it doesn't

      // if the module version is dev - then just deal with it... maybe put up a warning
      switch (versionResult.data.version) {
        case (REQUIRED_VERSION):
          break;
        default:
          if (version === '#{VERSION}#') {
            // development version of front-end... do nothing (can't deploy through store with this version so it can only be a special case)
            notifyGMWarn(`Development module detected.  Connected to backend version ${versionResult.data.version} at ${Backend.config.basePath}`);
          } else {
            // anything else means the version is wrong
            // output a foundry error message
            notifyGMError(localize('notifications.backend.versionMismatch')
              .replace('$1', `${versionResult.data.version}`)
              .replace('$2', `${REQUIRED_VERSION}`));

            Backend.inProgress = false;
            return;
          }; break;
        }
      
      // made it here - good to go!
      notifyGMInfo(localize('notifications.backend.successfulConnection'));
      Backend.available = true;

      // let's also poll for email since we just connected
      await Backend.pollForEmail();
    } finally {
      Backend.inProgress = false;
    }
  }

  static async pollForEmail() {
    if (!ModuleSettings.get(SettingKey.useGmailToDos)) 
      return;

    const campaign = await Campaign.fromUuid(ModuleSettings.get(SettingKey.emailDefaultCampaign));

    if (!campaign) {
      notifyGMError(localize('notifications.backend.emailSettingsNotSet'));
      return;
    }

    let ideas: Awaited<ReturnType<typeof Backend.api.apiPollEmailTodoGet>>['data']['items'] | null = null;
    try {
      ideas = (await Backend.api.apiPollEmailTodoGet())?.data?.items || null;
    } catch (error) {
      ui.notifications?.error("Backend threw an error when polling for mail.");
      return;
    }

    if (ideas) {
      for (const idea of ideas) {
        if (idea) {
          await campaign.addIdea(idea.text);
        }
      }

      // if the campaign is showing, refresh
      if (useMainStore().currentCampaign?.uuid === campaign.uuid) {
        await useMainStore().refreshCampaign();
      }
    }
  }
}
