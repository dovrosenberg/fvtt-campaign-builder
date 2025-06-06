import { registerBackendTests } from "./Backend.test";
import { registerCampaignTests } from "./Campaign.test";
import { registerDirectoryTests } from "./Directory";
import { registerEntryTests } from "./Entry.test";
import { registerTopicFolderTests } from "./TopicFolder.test";
import { registerSettingTests } from "./Setting.test";

export const registerClassesTests = () => {
  registerBackendTests();
  registerCampaignTests();
  registerDirectoryTests();
  registerEntryTests();
  registerTopicFolderTests();
  registerSettingTests();
}