// Mock the UserFlags class
jest.mock('@/settings', () => {
  const originalModule = jest.requireActual('@/settings');

  const UserFlagsMock = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));

  return {
    ...originalModule,
    UserFlags: UserFlagsMock(),
    UserFlags: UserFlagsMock,
  };
});

