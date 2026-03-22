import { createVueBatch } from '@unittest/vueTestUtils';
import { registerLabelWithHelpTests } from './LabelWithHelp.test';

export const registerComponentBatches = () => {
  registerLabelWithHelpBatch();
};

export const registerLabelWithHelpBatch = () => {
  createVueBatch(
    'campaign-builder.components.LabelWithHelp',
    '/components/LabelWithHelp',
    registerLabelWithHelpTests
  );
};
