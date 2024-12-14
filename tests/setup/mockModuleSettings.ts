// Mock the ModuleSettings class
jest.mock('@/settings', () => {
  const originalModule = jest.requireActual('@/settings');

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
