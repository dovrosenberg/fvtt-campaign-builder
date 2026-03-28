import { createBatch } from '@unittest/testUtils';
import { registerModuleSettingsTests } from "./ModuleSettings.test";

export const registerModuleSettingsBatch = () => {
  createBatch(
    'campaign-builder.settings.ModuleSettings',
    '/settings/ModuleSettings',
    registerModuleSettingsTests
  );
};