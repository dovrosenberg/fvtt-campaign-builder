import { createBatch } from '@unittest/testUtils';
import { registerEntryTests } from './Entry.test';

export const registerEntryBatch = () => {
  createBatch(
    'campaign-builder.classes.Entry',
    '/classes/Entry',
    registerEntryTests
  );
};
