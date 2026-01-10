import { createPinia, setActivePinia, defineStore } from 'pinia';

import { mainStore } from './mainStore';
import { navigationStore } from './navigationStore';
import { settingDirectoryStore } from './settingDirectoryStore';
import { campaignDirectoryStore } from './campaignDirectoryStore';
import { relationshipStore } from './relationshipStore';
import { campaignStore } from './campaignStore';
import { sessionStore } from './sessionStore';
import { playingStore } from './playingStore';
import { frontStore } from './frontStore';
import { storyWebStore } from './storyWebStore';
import { arcStore } from './arcStore';
import { backendStore } from './backendStore';

export const useMainStore = defineStore('main', mainStore);
export const useNavigationStore = defineStore('navigation', navigationStore);
export const useSettingDirectoryStore = defineStore('settingDirectory', settingDirectoryStore);
export const useCampaignDirectoryStore = defineStore('campaignDirectory', campaignDirectoryStore);
export const useRelationshipStore = defineStore('relationship', relationshipStore);
export const useSessionStore = defineStore('session', sessionStore);
export const usePlayingStore = defineStore('playing', playingStore);
export const useFrontStore = defineStore('front', frontStore);
export const useStoryWebStore = defineStore('storyWeb', storyWebStore);
export const useArcStore = defineStore('arc', arcStore);
export const useBackendStore = defineStore('backend', backendStore);
export const useCampaignStore = defineStore('campaign', campaignStore);

// global pinia instance
const pinia = createPinia();
setActivePinia(pinia);

// expose stores to dev window
if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
  // @ts-ignore
  window.pinia = pinia;
}

export { pinia };