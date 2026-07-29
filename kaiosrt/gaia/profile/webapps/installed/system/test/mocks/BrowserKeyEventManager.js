function BrowserKeyEventManager() {}
BrowserKeyEventManager.prototype = {
  screenOff: jest.fn()
};
global.BrowserKeyEventManager = BrowserKeyEventManager;
