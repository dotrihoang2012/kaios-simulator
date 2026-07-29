const MockSettingsURL = jest.fn();

MockSettingsURL.prototype = {
  set: jest.fn(),
  get: jest.fn()
};

global.SettingsURL = MockSettingsURL;
