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
  registerNavigationStoreBatch();
  registerPlayingStoreBatch();
  registerRelationshipStoreBatch();
  registerSessionStoreBatch();
  registerSettingDirectoryStoreBatch();
}

const registerMainStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.mainStore',
    '/stores/mainStore',
    registerMainStoreTests
  );
};

const registerStoryWebStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.storyWebStore',
    '/stores/storyWebStore',
    registerStoryWebStoreTests
  );
};

const registerFrontStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.frontStore',
    '/stores/frontStore',
    registerFrontStoreTests
  );
};

const registerPlayingStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.playingStore',
    '/stores/playingStore',
    registerPlayingStoreTests
  );
};

const registerBackendStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.backendStore',
    '/stores/backendStore',
    registerBackendStoreTests
  );
};

const registerRelationshipStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.relationshipStore',
    '/stores/relationshipStore',
    registerRelationshipStoreTests
  );
};

const registerCampaignStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.campaignStore',
    '/stores/campaignStore',
    registerCampaignStoreTests
  );
};

const registerArcStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.arcStore',
    '/stores/arcStore',
    registerArcStoreTests
  );
};

const registerSessionStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.sessionStore',
    '/stores/sessionStore',
    registerSessionStoreTests
  );
};

const registerCampaignDirectoryStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.campaignDirectoryStore',
    '/stores/campaignDirectoryStore',
    registerCampaignDirectoryStoreTests
  );
};

const registerSettingDirectoryStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.settingDirectoryStore',
    '/stores/settingDirectoryStore',
    registerSettingDirectoryStoreTests
  );
};

const registerNavigationStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.navigationStore',
    '/stores/navigationStore',
    registerNavigationStoreTests
  );
};
