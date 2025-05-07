import { registerCollapsibleNodeTests } from "./CollapsibleNode.test";
import { registerDirectoryCampaignNodeTests } from "./DirectoryCampaignNode.test";
import { registerDirectoryEntryNodeTests } from "./DirectoryEntryNode.test";
import { registerDirectorySessionNodeTests } from "./DirectorySessionNode.test";
import { registerDirectoryTopicNodeTests } from "./DirectoryTopicNode.test";
import { registerDirectoryTopicTreeNodeTests } from "./DirectoryTopicTreeNode.test";
import { registerDirectoryTypeEntryNodeTests } from "./DirectoryTypeEntryNode.test";
import { registerDirectoryTypeNodeTests } from "./DirectoryTypeNode.test";

export const registerDirectoryTests = () => {
  registerCollapsibleNodeTests();
  registerDirectoryCampaignNodeTests();
  registerDirectoryEntryNodeTests();
  registerDirectorySessionNodeTests();
  registerDirectoryTopicNodeTests();
  registerDirectoryTopicTreeNodeTests();
  registerDirectoryTypeEntryNodeTests();
  registerDirectoryTypeNodeTests();
};