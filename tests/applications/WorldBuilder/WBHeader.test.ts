import { WBHeader } from '@/applications/WorldBuilder/WBHeader.ts';

describe('WBHeader', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('defaults to empty', () => {
      let wbHeader = new WBHeader();

      expect(wbHeader['_tabs']).toEqual([]);
      expect(wbHeader['collapsed']).toBe(false);
      expect(wbHeader['_bookmarks']).toEqual([]);
    });

    it('loads tabs, bookmarks, and collapsed', () => {
      // TODO- change implementation of get()      
      let wbHeader = new WBHeader();

      //expect(wbHeader['_tabs']).toBe();
      //expect(wbHeader['_collpased']).toBe();
      //expect(wbHeader['_bookmarks']).toBe();
    });
  });

});


