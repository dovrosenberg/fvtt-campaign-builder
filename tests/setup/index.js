class StubApplication {
  constructor() {}

  render(_arg) { return; }
}

class StubHooks {
  constructor() {}

  on(_hook, _callback) { return; }
  once(_hook, _callback) { return; }
}

global.Application = StubApplication;
global.Hooks = new StubHooks();
