import { moduleId } from '@/settings';

// we have to store the globalinstance on the module because importing CampaignBuilderApplication
//    causes a circular dependency with pinia store somehow

export const isCampaignBuilderAppOpen = () => {
  // we use this to track it... we do weird stuff with the window so can't use rendered property
  // @ts-ignore
  return !!game.modules.get(moduleId)?.activeWindow;
};

export const closeCampaignBuilderApp = () => {
  if (isCampaignBuilderAppOpen()) {
    // @ts-ignore
    game.modules.get(moduleId)?.activeWindow?.close();
    // @ts-ignore
    game.modules.get(moduleId)!.activeWindow = null;
  }
}
