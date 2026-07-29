global.navigator.getBattery = () => {
  return Promise.resolve({
    charging: false,
    level: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  });
};
