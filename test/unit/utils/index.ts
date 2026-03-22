import { createBatch } from '@unittest/testUtils';
import { registerAppWindowTests } from "./appWindow.test";
import { registerHierarchyTests } from "./hierarchy.test";
import { registerRelatedContentTests } from "./relatedContent.test";
import { registerArcIndexTests } from "./arcIndex.test";
import { registerCleanKeysTests } from "./cleanKeys.test";
import { registerCustomFieldsTests } from "./customFields.test";
import { registerDirectoryScrollTests } from "./directoryScroll.test";
import { registerDragDropTests } from "./dragDrop.test";
import { registerNameGeneratorsTests } from "./nameGenerators.test";

export const registerUtilBatches = () => {
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

const registerAppWindowBatch = () => {
  createBatch(
    'campaign-builder.utils.appWindow',
    '/utils/appWindow',
    registerAppWindowTests
  );
};

const registerHierarchyBatch = () => {
  createBatch(
    'campaign-builder.utils.hierarchy',
    '/utils/hierarchy',
    registerHierarchyTests
  );
};

const registerRelatedContentBatch = () => {
  createBatch(
    'campaign-builder.utils.relatedContent',
    '/utils/relatedContent',
    registerRelatedContentTests
  );
};

const registerArcIndexBatch = () => {
  createBatch(
    'campaign-builder.utils.arcIndex',
    '/utils/arcIndex',
    registerArcIndexTests
  );
};

const registerCleanKeysBatch = () => {
  createBatch(
    'campaign-builder.utils.cleanKeys',
    '/utils/cleanKeys',
    registerCleanKeysTests
  );
};

const registerCustomFieldsBatch = () => {
  createBatch(
    'campaign-builder.utils.customFields',
    '/utils/customFields',
    registerCustomFieldsTests
  );
};

const registerDirectoryScrollBatch = () => {
  createBatch(
    'campaign-builder.utils.directoryScroll',
    '/utils/directoryScroll',
    registerDirectoryScrollTests
  );
};

const registerDragDropBatch = () => {
  createBatch(
    'campaign-builder.utils.dragDrop',
    '/utils/dragDrop',
    registerDragDropTests
  );
};

const registerNameGeneratorsBatch = () => {
  createBatch(
    'campaign-builder.utils.nameGenerators',
    '/utils/nameGenerators',
    registerNameGeneratorsTests
  );
};