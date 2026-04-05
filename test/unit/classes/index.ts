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
    'classes.Entry',
    '/classes/Entry',
    registerEntryTests
  );
};

const registerFCBJournalEntryPageBatch = () => {
  createBatch(
    'classes.FCBJournalEntryPage',
    '/classes/FCBJournalEntryPage',
    registerFCBJournalEntryPageTests
  );
};

const registerFCBSettingBatch = () => {
  createBatch(
    'classes.FCBSetting',
    '/classes/FCBSetting',
    registerFCBSettingTests
  );
};

const registerCampaignBatch = () => {
  createBatch(
    'classes.Campaign',
    '/classes/Campaign',
    registerCampaignTests
  );
};
