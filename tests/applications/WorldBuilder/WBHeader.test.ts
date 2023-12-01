import { WBHeader } from '@/applications/WorldBuilder/WBHeader';
import { userFlags, UserFlagKeys } from '@/settings/UserFlags';
import { moduleSettings } from '@/settings/ModuleSettings';
import { faker } from '@faker-js/faker';
import _ from 'lodash';

const mockEntries = [
  {
    uuid: faker.string.uuid,
    name: faker.person.fullName,
  },
  {
    uuid: faker.string.uuid,
    name: faker.person.fullName,
  },
  {
    uuid: faker.string.uuid,
    name: faker.person.fullName,
  },
];
const mockTabs = [
  {
    id: faker.string.uuid,
    text: 'fwb.labels.newTab',
    active: false,
    entry: null,
    history: [],
    historyIdx: -1,
  },
  {
    id: mockEntries[0].uuid,
    text: mockEntries[0].name,
    active: true,
    entry: mockEntries[0],
    history: [
      {
        entryId: mockEntries[0].uuid,
        name: mockEntries[0].name,
      }
    ],
    historyIdx: 0,
  },
  {
    id: mockEntries[1].uuid,
    text: mockEntries[1].name,
    active: false,
    entry: mockEntries[1],
    history: [
      {
        entryId: mockEntries[0].uuid,
        name: mockEntries[0].name,
      },
      {
        entryId: mockEntries[1].uuid,
        name: mockEntries[1].name,
      }
    ],
    historyIdx: 1,
  },
]
const mockBookmarks = [
  {
    id: faker.string.uuid,
    entryId: mockEntries[0].uuid,
    text: mockEntries[0].name,
    icon: faker.person.firstName
  },
  {
    id: faker.string.uuid,
    entryId: mockEntries[1].uuid,
    text: mockEntries[1].name,
    icon: faker.person.firstName
  }
]

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
    let wbHeader;

    beforeAll(() => {
      wbHeader = new WBHeader();
    });
    beforeEach(() => {
      // setup the current tab structure
      wbHeader['_tabs'] = _.cloneDeep(mockTabs);
      wbHeader['_bookmarks'] = _.cloneDeep(mockBookmarks);
    });
    it('should do nothing if entry already visible', () => {
      wbHeader.openEntry(mockEntries[0].uuid, { newTab: false });
      expect(wbHeader['_tabs']).toEqual(mockTabs);
    });

    it.skip('should open a new tab if option is set', () => {
      // test same case as above, but now should open a tab
      wbHeader.openEntry(mockEntries[0].uuid, { newTab: true });
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


