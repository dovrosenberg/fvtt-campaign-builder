/* eslint-disable @typescript-eslint/no-unused-vars */
StubApplication = {
  render: function(arg) { return; }
}

StubHooks = {
  on: function (hook, callback) { return; },
  once: function (hook, callback) { return; }
}

global.Application = StubApplication;
global.Hooks = StubHooks;
