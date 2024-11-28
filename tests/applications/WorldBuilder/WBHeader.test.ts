import { WBHeader } from '@/applications/WorldBuilder/WBHeader';
import { UserFlags, UserFlagKey } from '@/settings/UserFlags';
import { moduleSettings } from '@/settings/ModuleSettings';
import { faker } from '@faker-js/faker';
import _ from 'lodash';
import { Bookmark, WindowTab, WindowTabType } from '@/types';

const mockEntries = [
  {
    uuid: faker.string.uuid(),
    name: faker.person.fullName(),
  },
  {
    uuid: faker.string.uuid(),
    name: faker.person.fullName(),
  },
  {
    uuid: faker.string.uuid(),
    name: faker.person.fullName(),
  },
];
const mockTabs = [
  {
    id: faker.string.uuid(),
    active: false,
    header: { uuid: null, name: 'New Tab' },
    history: [],
    historyIdx: -1,
    tabType: WindowTabType.Entry,
  },
  {
    id: faker.string.uuid(),
    active: true,
    header: mockEntries[0],
    history: [mockEntries[0].uuid],
    historyIdx: 0,
    tabType: WindowTabType.Entry,
  },
  {
    id: faker.string.uuid(),
    active: false,
    header: mockEntries[1],
    history: [mockEntries[0].uuid, mockEntries[1].uuid],
    historyIdx: 1,
    tabType: WindowTabType.Entry,
  },
] as WindowTab[];
const mockBookmarks = [
  {
    id: faker.string.uuid(),
    header: mockEntries[0],
    icon: faker.person.firstName()
  },
  {
    id: faker.string.uuid(),
    header: mockEntries[1],
    icon: faker.person.firstName()
  }
] as Bookmark[];

const createWBHeader = (): WBHeader => {
  const retval = new WBHeader();
  retval['_tabs'] = _.cloneDeep(mockTabs);
  retval['_bookmarks'] = _.cloneDeep(mockBookmarks);

  return retval;
};

describe('WBHeader', () => {
  beforeAll(() => {
    fromUuid.mockImplementation((id)=> {
      return mockEntries.find((e)=>(e.uuid===id));
    });
  });

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    let wbHeader;

    beforeEach(() => {
      wbHeader = new WBHeader();   // use a clean one
    });

    it('should open one tab from blank slate', () => {
      // pretend they're blank
      UserFlags.get.mockImplementation(()=> undefined);
      moduleSettings.get.mockImplementation(()=> undefined);

      expect(wbHeader['collapsed']).toEqual(false);
      expect(wbHeader['_bookmarks']).toEqual([]);
      expect(wbHeader['_tabs'].length).toEqual(1);
      expect(wbHeader['_tabs'][0]).toEqual({
        id: wbHeader['_tabs'][0].id,
        active: true,
        header: { uuid: null, name: 'fwb.labels.newTab' },
        history: [],
        historyIdx: -1,
      });
    });

    it('should load tabs, bookmarks, and collapsed', () => {
      // pretend they have values
      UserFlags.get.mockImplementation((flag) => {
        if (flag===UserFlagKey.tabs)
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

    beforeEach(() => {
      wbHeader = createWBHeader();
    });
    it('should do nothing if entry already active', async () => {
      await wbHeader.openEntry(mockEntries[0].uuid, { newTab: false });
      expect(wbHeader['_tabs']).toEqual(mockTabs);
    });

    // test same case as above, but now should open a tab
    describe('should open a blank tab if option is set', () => {
      it('should add the tab', async () => {
        await wbHeader.openEntry(null);

        const result = {
          active: true,
          header: { uuid: null, name: 'fwb.labels.newTab' },
          history: [],
          historyIdx: -1,
        };

        expect(wbHeader['_tabs'].length).toEqual(mockTabs.length+1);
        expect(wbHeader['_tabs'][mockTabs.length]).toEqual({
            ...result,
            id: wbHeader['_tabs'][mockTabs.length].id,  // use new id
          });
      });

      it('should make the old active tab inactive', async () => {
        await wbHeader.openEntry(null);

        // find old active tab
        const activeIdx = _.findIndex(mockTabs, (t) => (t.active));
        expect(wbHeader['_tabs'][activeIdx].active).toEqual(false);
      });

      it('should save the new tabs',async () => {
        const set = UserFlags.set.mockImplementation((_key, _value) =>{});
        await wbHeader.openEntry(null);

        expect(set).toHaveBeenCalledWith(UserFlagKey.tabs, wbHeader['_tabs']);
      });

      it('should have no history', async () => {
        await wbHeader.openEntry(null);

        expect(wbHeader['_tabs'][mockTabs.length].history).toEqual([]);
        expect(wbHeader['_tabs'][mockTabs.length].historyIdx).toEqual(-1);
      });

      it('should make callbacks to parent', async () => {
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        
        wbHeader.registerCallback(WBHeader.CallbackType.TabsChanged, cb1);
        wbHeader.registerCallback(WBHeader.CallbackType.EntryChanged, cb2);
        await wbHeader.openEntry(null);

        expect(cb1).toHaveBeenCalled();
        expect(cb2).toHaveBeenCalledWith(null);
      });
    });

    describe('should open a new tab if option is set', () => {
      it('should add the tab', async () => {
        await wbHeader.openEntry(mockEntries[0].uuid, { newTab: true });

        const result = {
          active: true,
          header: mockEntries[0],
          history: [mockEntries[0].uuid],
          historyIdx: 0,
        };

        expect(wbHeader['_tabs'].length).toEqual(mockTabs.length+1);
        expect(wbHeader['_tabs'][mockTabs.length]).toEqual({
          ...result,
          id: wbHeader['_tabs'][mockTabs.length].id,  // use new id
        });
      });

      it('should make the old active tab inactive', async () => {
        await wbHeader.openEntry(mockEntries[0].uuid, { newTab: true });

        // find old active tab
        const activeIdx = _.findIndex(mockTabs, (t) => (t.active));
        expect(wbHeader['_tabs'][activeIdx].active).toEqual(false);
      });

      it('should save the new tabs',async () => {
        const set = UserFlags.set.mockImplementation((_key, _value) =>{});
        await wbHeader.openEntry(mockEntries[0].uuid, { newTab: true });

        expect(set).toHaveBeenCalledWith(UserFlagKey.tabs, wbHeader['_tabs']);
      });
  
      it('should update the recent list', async () => {
        const set = UserFlags.set.mockImplementation((key, value) =>{});
        UserFlags.get.mockImplementation((key, value) =>[]);
        await wbHeader.openEntry(mockEntries[0].uuid, { newTab: true });

        expect(set).toHaveBeenCalledWith(UserFlagKey.recentlyViewed, [mockEntries[0]]);
      });
  
      it('should make callbacks to parent', async () => {
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        
        wbHeader.registerCallback(WBHeader.CallbackType.TabsChanged, cb1);
        wbHeader.registerCallback(WBHeader.CallbackType.EntryChanged, cb2);
        await wbHeader.openEntry(mockEntries[0].uuid, { newTab: true });

        expect(cb1).toHaveBeenCalled();
        expect(cb2).toHaveBeenCalledWith(mockEntries[0].uuid);
      });
    });

    describe('should open in a current tab', () => {
      it('should open entry in the active tab', async () => {
        await wbHeader.openEntry(mockEntries[1].uuid, { newTab: false });

        const result = {
          id: mockTabs[1].id,
          active: true,
          header: mockEntries[1],
          history: [mockEntries[0].uuid, mockEntries[1].uuid],
          historyIdx: 1,
        };

        expect(wbHeader['_tabs'].length).toEqual(mockTabs.length);
        expect(wbHeader['_tabs'][1]).toEqual(result);
      });

      it('should save the new tabs', async () => {
        const set = UserFlags.set.mockImplementation((key, value) =>{});
        await wbHeader.openEntry(mockEntries[1].uuid, { newTab: false });

        expect(set).toHaveBeenCalledWith(UserFlagKey.tabs, wbHeader['_tabs']);
      });
  
      it('should update the recent list', async () => {
        const set = UserFlags.set.mockImplementation((key, value) =>{});
        UserFlags.get.mockImplementation((key, value) =>[]);
        await wbHeader.openEntry(mockEntries[1].uuid, { newTab: false });

        expect(set).toHaveBeenCalledWith(UserFlagKey.recentlyViewed, [mockEntries[1]]);
      });
  
      it('should make callbacks to parent', async () => {
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        
        wbHeader.registerCallback(WBHeader.CallbackType.TabsChanged, cb1);
        wbHeader.registerCallback(WBHeader.CallbackType.EntryChanged, cb2);
        await wbHeader.openEntry(mockEntries[1].uuid, { newTab: false });

        expect(cb1).toHaveBeenCalled();
        expect(cb2).toHaveBeenCalledWith(mockEntries[1].uuid);
      });
    });

  });

  describe('_updateRecent', () => {
    let wbHeader;

    beforeEach(() => {
      wbHeader = createWBHeader();
    });
  
    it('should add the entry', async () => {
      UserFlags.set = jest.fn();
      UserFlags.get.mockImplementation((key) => {
        return (key===UserFlagKey.recentlyViewed ? []: null);
      });

      await wbHeader['_updateRecent'](mockEntries[0]);
      expect(UserFlags.set).toHaveBeenCalledWith(UserFlagKey.recentlyViewed, [mockEntries[0]]);
    });
    it('should drop an entry if full', async () => {
      UserFlags.set = jest.fn();
      UserFlags.get.mockImplementation((key) => {
        return (key===UserFlagKey.recentlyViewed ? [
          { uuid: 'abc', name: 'abc' },
          { uuid: 'def', name: 'def' },
          { uuid: 'ghi', name: 'ghi' },
          { uuid: 'jkl', name: 'jkl' },
          { uuid: 'mno', name: 'mno' },
        ]: null);
      });

      await wbHeader['_updateRecent'](mockEntries[0]);
      expect(UserFlags.set).toHaveBeenCalledWith(UserFlagKey.recentlyViewed, 
        [
          mockEntries[0],
          { uuid: 'abc', name: 'abc' },
          { uuid: 'def', name: 'def' },
          { uuid: 'ghi', name: 'ghi' },
          { uuid: 'jkl', name: 'jkl' },
        ]);
    });
  });
  describe('_activateTab', () => {

  });
  describe('_closeTab', () => {

  });
  describe('_saveTabs', () => {

  });
  describe('_addBookmark', () => {

  });
  describe('_removeBookmark', () => {

  });
  describe('_navigateHistory', () => {

  });
});


