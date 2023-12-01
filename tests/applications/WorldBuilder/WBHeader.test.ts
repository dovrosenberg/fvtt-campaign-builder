import { WBHeader } from '@/applications/WorldBuilder/WBHeader';
import { userFlags, UserFlagKeys } from '@/settings/UserFlags';
import { moduleSettings } from '@/settings/ModuleSettings';
import { faker } from '@faker-js/faker';

describe('WBHeader', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should open one tab from blank slate', () => {
      // pretend they're blank
      userFlags.get.mockImplementation(()=> undefined);
      moduleSettings.get.mockImplementation(()=> undefined);
      let wbHeader = new WBHeader();

      expect(wbHeader['collapsed']).toEqual(false);
      expect(wbHeader['_bookmarks']).toEqual([]);
      expect(wbHeader['_tabs'].length).toEqual(1);
      expect(wbHeader['_tabs'][0]).toEqual({
        id: wbHeader['_tabs'][0].id,
        text: 'fwb.labels.newTab',
        active: true,
        entry: null,
        history: [],
        historyIdx: -1,
      });
    });

    it('should load tabs, bookmarks, and collapsed', () => {
      const mockTabs = [
        {
          id: faker.string.uuid(),
          text: faker.person.firstName,
          active: true,
          entry: null,
          history: [],
          historyIdx: -1,
        },
        {
          id: faker.string.uuid(),
          text: faker.person.firstName,
          active: true,
          entry: null,
          history: [],
          historyIdx: -1,
        },
      ]
      const mockBookmarks = [
        {
          id: faker.string.uuid,
          entryId: faker.string.uuid,
          text: faker.person.firstName,
          icon: faker.person.firstName
        },
        {
          id: faker.string.uuid,
          entryId: faker.string.uuid,
          text: faker.person.firstName,
          icon: faker.person.firstName
        }
      ]

      // pretend they have values
      userFlags.get.mockImplementation((flag) => {
        if (flag===UserFlagKeys.tabs)
          return mockTabs;
        else  
          return mockBookmarks;
      });

      // mock for collapsed setting
      moduleSettings.get.mockImplementation(()=> true);
      let wbHeader = new WBHeader();

      expect(wbHeader['collapsed']).toEqual(true);
      expect(wbHeader['_bookmarks']).toEqual(mockBookmarks);
      expect(wbHeader['_tabs']).toEqual(mockTabs);
    });
  });
  describe('openEntry', () => {
    it.skip('should do nothing if entry already visible', () => {
    });

    it.skip('should open a new tab if option is set', () => {
      // test same case as above, but now should open a tab
    });

    it.skip('should update the history', () => {
    });

    it.skip('should activate the new tab', () => {
    });

    it.skip('should save the new tabs', () => {
    });

    it.skip('should update the recent list', () => {
    });

    it.skip('should make callbacks to parent', () => {
    });
  });
});


