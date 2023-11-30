// Mock the ModuleSettings class
jest.mock('@/settings/ModuleSettings.ts', () => {
  const originalModule = jest.requireActual('@/settings/ModuleSettings.ts');

  const ModuleSettings = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));

  return {
    ...originalModule,
    moduleSettings: ModuleSettings(),
    ModuleSettings: ModuleSettings,
  };
});
