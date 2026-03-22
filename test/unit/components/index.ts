import { createVueBatch } from '@unittest/vueTestUtils';
import { registerLabelWithHelpTests } from './LabelWithHelp.test';
import { registerRangePickerTests } from './RangePicker.test';

export const registerComponentBatches = () => {
  registerLabelWithHelpBatch();
  registerRangePickerBatch();
};

export const registerLabelWithHelpBatch = () => {
  createVueBatch(
    'campaign-builder.components.LabelWithHelp',
    '/components/LabelWithHelp',
    registerLabelWithHelpTests
  );
};

export const registerRangePickerBatch = () => {
  createVueBatch(
    'campaign-builder.components.RangePicker',
    '/components/RangePicker',
    registerRangePickerTests
  );
};
