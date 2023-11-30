// Mock the UserFlags class
jest.mock('@/settings/UserFlags.ts', () => {
  const originalModule = jest.requireActual('@/settings/UserFlags.ts');

  const UserFlagsMock = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));

  return {
    ...originalModule,
    userFlags: UserFlagsMock(),
    UserFlags: UserFlagsMock,
  };
});

