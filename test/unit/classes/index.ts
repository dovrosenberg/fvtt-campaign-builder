import { createBatch } from '@unittest/testUtils';
import { registerEntryTests } from './Entry.test';
import { registerFCBJournalEntryPageTests } from './FCBJournalEntryPage.test';
import { registerFCBSettingTests } from './FCBSetting.test';
import { registerCampaignTests } from './Campaign.test';

export const registerClassBatches = () => {
  registerEntryBatch();
  registerFCBJournalEntryPageBatch();
  registerFCBSettingBatch();
  registerCampaignBatch();
};


const registerEntryBatch = () => {
  createBatch(
    'campaign-builder.classes.Entry',
    '/classes/Entry',
    registerEntryTests
  );
};

const registerFCBJournalEntryPageBatch = () => {
  createBatch(
    'campaign-builder.classes.FCBJournalEntryPage',
    '/classes/FCBJournalEntryPage',
    registerFCBJournalEntryPageTests
  );
};

const registerFCBSettingBatch = () => {
  createBatch(
    'campaign-builder.classes.FCBSetting',
    '/classes/FCBSetting',
    registerFCBSettingTests
  );
};

const registerCampaignBatch = () => {
  createBatch(
    'campaign-builder.classes.Campaign',
    '/classes/Campaign',
    registerCampaignTests
  );
};
