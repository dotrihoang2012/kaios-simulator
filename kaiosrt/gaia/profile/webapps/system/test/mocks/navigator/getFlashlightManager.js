if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

global.navigator.b2g.getFlashlightManager = () => {
  return Promise.resolve({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    flashlightEnabled: false
  });
};