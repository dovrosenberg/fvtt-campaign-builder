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
import { registerDragDropTests } from "./dragdrop.test";

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
    },
    { displayName: "/utils/appWindow", preSelected: false },
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
    },
    { displayName: "/utils/hierarchy", preSelected: false },
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
    },
    { displayName: "/utils/relatedContent", preSelected: false },
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
};

export const registerArcIndexBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.arcIndex',
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
      registerArcIndexTests(context);
    },
    { displayName: "/utils/arcIndex", preSelected: false },
  );
};

export const registerCleanKeysBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.cleanKeys',
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
      registerCleanKeysTests(context);
    },
    { displayName: "/utils/cleanKeys", preSelected: false },
  );
};

export const registerCustomFieldsBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.customFields',
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
      registerCustomFieldsTests(context);
    },
    { displayName: "/utils/customFields", preSelected: false },
  );
};

export const registerDirectoryScrollBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.directoryScroll',
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
      registerDirectoryScrollTests(context);
    },
    { displayName: "/utils/directoryScroll", preSelected: false },
  );
};

export const registerDragDropBatch = () => {
  quench?.registerBatch(
    'campaign-builder.utils.dragdrop',
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
      registerDragDropTests(context);
    },
    { displayName: "/utils/dragdrop", preSelected: false },
  );
};