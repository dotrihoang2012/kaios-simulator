if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

global.navigator.b2g.iccManager= {
  iccIds: [],
  getIccById: jest.fn(),
  addEventListener: jest.fn()
};
