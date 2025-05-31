import { createPinia, setActivePinia } from 'pinia';

export * from './mainStore';
export * from './navigationStore';
export * from './settingDirectoryStore';
export * from './campaignDirectoryStore';
export * from './relationshipStore';
export * from './campaignStore';
export * from './sessionStore';

// global pinia instance
const pinia = createPinia();
setActivePinia(pinia);

// expose stores to dev window
// @ts-ignore
if (import.meta.env.MODE === 'development') {
  // @ts-ignore
  window.pinia = pinia;
}

export { pinia };