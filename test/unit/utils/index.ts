import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from './testUtils';
// import { registerAppWindowTests } from "./appWindow.test";
import { registerHierarchyTests } from "./hierarchy.test";
import { registerRelatedContentTests } from "./relatedContent.test";

export const registerUtilsTests = () => {
  quench?.registerBatch(
    'campaign-builder.utils',
    (context: QuenchBatchContext) => {
      const { describe, before, after, } = context;

      // Batch-level setup - create once for all tests
      before(async () => {
        // Initialize the shared test setting
        await initializeTestSetting();
      });

      // Batch-level cleanup - delete once after all tests
      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      // Register individual test suites with their own describe blocks
      describe('relatedContent', () => {
        registerRelatedContentTests(context);
      });
      
      // describe('appWindow', () => {
      //   registerAppWindowTests(context);
      // });
      // 
      describe('hierarchy', () => {
        registerHierarchyTests(context);
      });
    }
  );
};