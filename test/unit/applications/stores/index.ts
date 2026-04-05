import { createBatch } from '@unittest/testUtils';
import { registerMainStoreTests } from './mainStore.test';
import { registerStoryWebStoreTests } from './storyWebStore.test';
import { registerFrontStoreTests } from './frontStore.test';
import { registerPlayingStoreTests } from './playingStore.test';
import { registerBackendStoreTests } from './backendStore.test';
import { registerRelationshipStoreTests } from './relationshipStore.test';
import { registerCampaignStoreTests } from './campaignStore.test';
import { registerArcStoreTests } from './arcStore.test';
import { registerSessionStoreTests } from './sessionStore.test';
import { registerCampaignDirectoryStoreTests } from './campaignDirectoryStore.test';
import { registerSettingDirectoryStoreTests } from './settingDirectoryStore.test';
import { registerNavigationStoreTests } from './navigationStore.test';

export const registerStoreBatches = () => {
  registerArcStoreBatch();
  registerBackendStoreBatch();
  registerCampaignDirectoryStoreBatch();
  registerCampaignStoreBatch();
  registerFrontStoreBatch();
  registerMainStoreBatch();
  registerStoryWebStoreBatch();
  registerNavigationStoreBatch();
  registerPlayingStoreBatch();
  registerRelationshipStoreBatch();
  registerSessionStoreBatch();
  registerSettingDirectoryStoreBatch();
}

const registerMainStoreBatch = () => {
  createBatch(
    'stores.mainStore',
    '/stores/mainStore',
    registerMainStoreTests
  );
};

const registerStoryWebStoreBatch = () => {
  createBatch(
    'stores.storyWebStore',
    '/stores/storyWebStore',
    registerStoryWebStoreTests
  );
};

const registerFrontStoreBatch = () => {
  createBatch(
    'stores.frontStore',
    '/stores/frontStore',
    registerFrontStoreTests
  );
};

const registerPlayingStoreBatch = () => {
  createBatch(
    'stores.playingStore',
    '/stores/playingStore',
    registerPlayingStoreTests
  );
};

const registerBackendStoreBatch = () => {
  createBatch(
    'stores.backendStore',
    '/stores/backendStore',
    registerBackendStoreTests
  );
};

const registerRelationshipStoreBatch = () => {
  createBatch(
    'stores.relationshipStore',
    '/stores/relationshipStore',
    registerRelationshipStoreTests
  );
};

const registerCampaignStoreBatch = () => {
  createBatch(
    'stores.campaignStore',
    '/stores/campaignStore',
    registerCampaignStoreTests
  );
};

const registerArcStoreBatch = () => {
  createBatch(
    'stores.arcStore',
    '/stores/arcStore',
    registerArcStoreTests
  );
};

const registerSessionStoreBatch = () => {
  createBatch(
    'stores.sessionStore',
    '/stores/sessionStore',
    registerSessionStoreTests
  );
};

const registerCampaignDirectoryStoreBatch = () => {
  createBatch(
    'stores.campaignDirectoryStore',
    '/stores/campaignDirectoryStore',
    registerCampaignDirectoryStoreTests
  );
};

const registerSettingDirectoryStoreBatch = () => {
  createBatch(
    'stores.settingDirectoryStore',
    '/stores/settingDirectoryStore',
    registerSettingDirectoryStoreTests
  );
};

const registerNavigationStoreBatch = () => {
  createBatch(
    'stores.navigationStore',
    '/stores/navigationStore',
    registerNavigationStoreTests
  );
};
