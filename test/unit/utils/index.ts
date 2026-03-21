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