import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from '@unittest/testUtils';
import { registerAppWindowTests } from "./appWindow.test";
import { registerHierarchyTests } from "./hierarchy.test";
import { registerRelatedContentTests } from "./relatedContent.test";

export const registerAppWindowBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.appWindow',
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
      registerAppWindowTests(context);
    }
  );
};

export const registerHierarchyBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.hierarchy',
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
      registerHierarchyTests(context);
    }
  );
};

export const registerRelatedContentBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.relatedContent',
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
      registerRelatedContentTests(context);
    }
  );
};

// Legacy function for backward compatibility - registers all batches
export const registerUtilsTests = () => {
  registerAppWindowBatch();
  registerHierarchyBatch();
  registerRelatedContentBatch();
};