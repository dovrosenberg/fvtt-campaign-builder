import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from '../../testUtils';
import { registerMainStoreTests } from './mainStore.test';

export const registerMainStoreBatch = () => {
  quench?.registerBatch(
    'campaign-builder.stores.mainStore',
    (context: QuenchBatchContext) => {
      const { before, after } = context;

      // Batch-level setup
      before(async () => {
        await initializeTestSetting();
      });

      // Batch-level cleanup
      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      // Register tests
      registerMainStoreTests(context);
    },
    { displayName: "/stores/mainStore", preSelected: false },
  );
};
