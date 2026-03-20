import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from '@unittest/testUtils';
import { registerEntryTests } from './Entry.test';

/**
 * Helper function to create and register a test batch with standard setup/teardown
 */
const createBatch = (
  batchName: string,
  displayName: string,
  registerTests: (context: QuenchBatchContext) => void
) => {
  quench?.registerBatch(
    batchName,
    (context: QuenchBatchContext) => {
      const { before, after } = context;

      // Standard batch-level setup
      before(async () => {
        await initializeTestSetting();
      });

      // Standard batch-level cleanup
      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      // Register tests
      registerTests(context);
    },
    { displayName, preSelected: false },
  );
};

export const registerEntryBatch = () => {
  createBatch(
    'campaign-builder.classes.Entry',
    '/classes/Entry',
    registerEntryTests
  );
};
