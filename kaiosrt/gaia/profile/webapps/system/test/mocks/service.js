global.Service = {
  mockValues: {},
  query(name) {
    return this.mockValues[name];
  },
  set(name, value) {
    this.mockValues[name] = value;
  },
  currentTime: () => {
    return (new Date().getTime() / 1000).toFixed(3);
  },
  request: jest.fn(),
  register: jest.fn(),
  registerState: jest.fn(),
  unregisterState: jest.fn(),
  currentApp: {
    getTopMostWindow: jest.fn()
  }
};
