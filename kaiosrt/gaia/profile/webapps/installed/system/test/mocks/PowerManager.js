global.PowerManager = {
  getScreenBrightness: jest.fn(()=>Promise.resolve(100)),
  setScreenBrightness: jest.fn(),
  setScreenEnabled: jest.fn(),
  setKeyLightEnabled: jest.fn(),
  setKeyLightBrightness: jest.fn()
};
