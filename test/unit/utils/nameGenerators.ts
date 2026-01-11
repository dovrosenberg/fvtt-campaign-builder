import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from '@unittest/testUtils';
import { registerNameGeneratorsTests } from './nameGenerators.test';

export const registerNameGeneratorsBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.nameGenerators',
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
      registerNameGeneratorsTests(context);
    },
    { displayName: "/utils/nameGenerators", preSelected: false },
  );
};
