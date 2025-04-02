import { createPinia, setActivePinia } from 'pinia';

export * from './mainStore';
export * from './navigationStore';
export * from './topicDirectoryStore';
export * from './campaignDirectoryStore';
export * from './relationshipStore';
export * from './campaignStore';
export * from './sessionStore';

// global pinia instance
const pinia = createPinia();
setActivePinia(pinia);

// expose stores to dev window
if (import.meta.env.MODE === 'development') {
  window.pinia = pinia;
}

export { pinia };