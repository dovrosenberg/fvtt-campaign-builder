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
    'utils.appWindow',
    '/utils/appWindow',
    registerAppWindowTests
  );
};

const registerHierarchyBatch = () => {
  createBatch(
    'utils.hierarchy',
    '/utils/hierarchy',
    registerHierarchyTests
  );
};

const registerRelatedContentBatch = () => {
  createBatch(
    'utils.relatedContent',
    '/utils/relatedContent',
    registerRelatedContentTests
  );
};

const registerArcIndexBatch = () => {
  createBatch(
    'utils.arcIndex',
    '/utils/arcIndex',
    registerArcIndexTests
  );
};

const registerCleanKeysBatch = () => {
  createBatch(
    'utils.cleanKeys',
    '/utils/cleanKeys',
    registerCleanKeysTests
  );
};

const registerCustomFieldsBatch = () => {
  createBatch(
    'utils.customFields',
    '/utils/customFields',
    registerCustomFieldsTests
  );
};

const registerDirectoryScrollBatch = () => {
  createBatch(
    'utils.directoryScroll',
    '/utils/directoryScroll',
    registerDirectoryScrollTests
  );
};

const registerDragDropBatch = () => {
  createBatch(
    'utils.dragDrop',
    '/utils/dragDrop',
    registerDragDropTests
  );
};

const registerNameGeneratorsBatch = () => {
  createBatch(
    'utils.nameGenerators',
    '/utils/nameGenerators',
    registerNameGeneratorsTests
  );
};