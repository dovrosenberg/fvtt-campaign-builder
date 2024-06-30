import { OldWorldBuilder } from 'src/applications/WorldBuilder/OldWorldBuilder';

jest.mock('@/settings/UserFlags.ts', () => {
  const originalModule = jest.requireActual('@/settings/UserFlags.ts');

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

// Mock the WBHeader class
jest.mock('@/applications/WorldBuilder/WBHeader.ts', () => {
  const originalModule = jest.requireActual('@/applications/WorldBuilder/WBHeader');

  const WBHeader = jest.fn().mockImplementation(() => ({
    openEntry: jest.fn(),
  }));

  return {
    ...originalModule,
    WBHeader: WBHeader,
  };
});


describe('OldWorldBuilder', () => {
  let worldBuilder: OldWorldBuilder;

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods
    jest.clearAllMocks();
    worldBuilder = new OldWorldBuilder('rootid', 'worldid');
  });

  describe('constructor', () => {
    it('successfully creates', () => {
      // tested in beforeEach, so don't need anything here
      expect(true).toBe(true);
    });
  });

  describe('_onDirectoryEntrySelected', () => {
    it('opens the entry if we just click', () => {
      let e = new MouseEvent('click');
      worldBuilder['_onDirectoryEntrySelected']('entryId', e);

      expect(worldBuilder['_partials'].WBHeader.openEntry).toHaveBeenCalledWith('entryId', {newTab: false});
      expect(worldBuilder['_partials'].WBHeader.openEntry).toHaveBeenCalledTimes(1);
    });

    it('opens a new tab if we held control', () => {
      let e = new MouseEvent('click', {ctrlKey: true});
      worldBuilder['_onDirectoryEntrySelected']('entryId', e);

      expect(worldBuilder['_partials'].WBHeader.openEntry).toHaveBeenCalledWith('entryId', {newTab: true});
      expect(worldBuilder['_partials'].WBHeader.openEntry).toHaveBeenCalledTimes(1);
    });
  });
});


