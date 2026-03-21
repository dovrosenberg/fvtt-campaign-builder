import { createBatch } from '@unittest/testUtils';
import { registerMainStoreTests } from './mainStore.test';

export const registerMainStoreBatch = () => {
  createBatch(
    'campaign-builder.stores.mainStore',
    '/stores/mainStore',
    registerMainStoreTests
  );
};
