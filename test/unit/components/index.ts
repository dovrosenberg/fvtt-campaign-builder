import { createVueBatch } from '@unittest/vueTestUtils';
import { registerLabelWithHelpTests } from './LabelWithHelp.test';
import { registerRangePickerTests } from './RangePicker.test';
import { registerTypeAheadTests } from './TypeAhead.test';
import { registerAdvancedTextAreaTests } from './AdvancedTextArea.test';
import { registerImagePickerTests } from './ImagePicker.test';
import { registerTagsTests } from './Tags.test';
import { registerSearchTests } from './Search.test';

export const registerComponentBatches = () => {
  registerLabelWithHelpBatch();
  registerRangePickerBatch();
  registerTypeAheadBatch();
  registerAdvancedTextAreaBatch();
  registerImagePickerBatch();
  registerTagsBatch();
  registerSearchBatch();
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

export const registerTypeAheadBatch = () => {
  createVueBatch(
    'campaign-builder.components.TypeAhead',
    '/components/TypeAhead',
    registerTypeAheadTests
  );
};

export const registerAdvancedTextAreaBatch = () => {
  createVueBatch(
    'campaign-builder.components.AdvancedTextArea',
    '/components/AdvancedTextArea',
    registerAdvancedTextAreaTests
  );
};

export const registerImagePickerBatch = () => {
  createVueBatch(
    'campaign-builder.components.ImagePicker',
    '/components/ImagePicker',
    registerImagePickerTests
  );
};

export const registerTagsBatch = () => {
  createVueBatch(
    'campaign-builder.components.Tags',
    '/components/Tags',
    registerTagsTests
  );
};

export const registerSearchBatch = () => {
  createVueBatch(
    'campaign-builder.components.Search',
    '/components/Search',
    registerSearchTests
  );
};
