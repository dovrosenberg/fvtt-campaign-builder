import { HandlebarsPartial } from '@/applications/HandlebarsPartial.ts';

describe('HandlebarsPartial', () => {
  let handlebarsPartial: HandlebarsPartial;
  let cp = jest.fn(()=>{});

  beforeEach(() => {
    // declare a derived class
    class Derived extends HandlebarsPartial {
      protected _createPartials() {
        cp();
      }

      public async getData(): Promise<Record<string, any>> { 
        return {}
      }

      public activateListeners(_html): void {}
    }

    handlebarsPartial = new Derived();
  });

  describe('constructor', () => {
    it('should call _createPartials', () => {
      expect(cp).toHaveBeenCalled;
    });
  });

  describe('registerCallback/_makeCallback', () => {
    it('should lookup and call the correct callback', () => {
      const cb =jest.fn(()=>{});

      handlebarsPartial.registerCallback('A', cb);
      handlebarsPartial['_makeCallback']('A', 1, 2, 3);

      expect(cb).toHaveBeenCalledExactlyOnceWith(1, 2, 3);
    });
  });
});