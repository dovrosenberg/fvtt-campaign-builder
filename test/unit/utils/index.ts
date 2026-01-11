import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from '@unittest/testUtils';
import { registerAppWindowTests } from "./appWindow.test";
import { registerHierarchyTests } from "./hierarchy.test";
import { registerRelatedContentTests } from "./relatedContent.test";
import { registerArcIndexTests } from "./arcIndex.test";
import { registerCleanKeysTests } from "./cleanKeys.test";
import { registerCustomFieldsTests } from "./customFields.test";
import { registerDirectoryScrollTests } from "./directoryScroll.test";
import { registerDragDropTests } from "./dragDrop.test";
import { registerNameGeneratorsTests } from "./nameGenerators.test";

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

export const registerAppWindowBatch = () => {
  createBatch(
    'campaign-builder.utils.appWindow',
    '/utils/appWindow',
    registerAppWindowTests
  );
};

export const registerHierarchyBatch = () => {
  createBatch(
    'campaign-builder.utils.hierarchy',
    '/utils/hierarchy',
    registerHierarchyTests
  );
};

export const registerRelatedContentBatch = () => {
  createBatch(
    'campaign-builder.utils.relatedContent',
    '/utils/relatedContent',
    registerRelatedContentTests
  );
};

// Legacy function for backward compatibility - registers all batches
export const registerUtilsTests = () => {
  registerAppWindowBatch();
  registerHierarchyBatch();
  registerRelatedContentBatch();
  registerArcIndexBatch();
  registerCleanKeysBatch();
  registerCustomFieldsBatch();
  registerDirectoryScrollBatch();
  registerDragDropBatch();
  registerNameGeneratorsBatch();
};

export const registerArcIndexBatch = () => {
  createBatch(
    'campaign-builder.utils.arcIndex',
    '/utils/arcIndex',
    registerArcIndexTests
  );
};

export const registerCleanKeysBatch = () => {
  createBatch(
    'campaign-builder.utils.cleanKeys',
    '/utils/cleanKeys',
    registerCleanKeysTests
  );
};

export const registerCustomFieldsBatch = () => {
  createBatch(
    'campaign-builder.utils.customFields',
    '/utils/customFields',
    registerCustomFieldsTests
  );
};

export const registerDirectoryScrollBatch = () => {
  createBatch(
    'campaign-builder.utils.directoryScroll',
    '/utils/directoryScroll',
    registerDirectoryScrollTests
  );
};

export const registerDragDropBatch = () => {
  createBatch(
    'campaign-builder.utils.dragDrop',
    '/utils/dragDrop',
    registerDragDropTests
  );
};

export const registerNameGeneratorsBatch = () => {
  createBatch(
    'campaign-builder.utils.nameGenerators',
    '/utils/nameGenerators',
    registerNameGeneratorsTests
  );
};