require('./mockModuleSettings');
require('./mockUserFlags');

class StubApplication {
  constructor() {}

  render(_arg) { return; }
}

class StubHooks {
  constructor() {}

  on(_hook, _callback) { return; }
  once(_hook, _callback) { return; }
}

class StubGame {
  i18n = {
    localize: (text) => (text),
  }
}

// declare  foundry globals used in the application for testing purposes
global.Application = StubApplication;
global.Hooks = new StubHooks();
global.randomID = function() { 
  let retval = '';
  const values = 'abcdefghijklmnopqrstuvwyxyz';

  for (i=0; i<16; i++)
    retval += values[Math.floor(Math.random()*values.length+1)];

  return retval;
}
global.fromUuid = jest.fn(); // need to implement when ready to use it
Array.prototype.findSplice = function(find, replace) {
    const idx = this.findIndex(find);
    if ( idx === -1 ) return null;
    if ( replace !== undefined ) {
      this.splice(idx, 1, replace);
      return replace;
    } else {
      const item = this[idx];
      this.splice(idx, 1);
      return item;
    }
  }
global.Game = StubGame;
global.game = new global.Game();
