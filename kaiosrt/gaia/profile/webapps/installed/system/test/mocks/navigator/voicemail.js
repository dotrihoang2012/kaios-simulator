if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}
global.navigator.b2g.voicemail = {
  onstatuschange: jest.fn(),
  addEventListener: jest.fn(),
  getNumber: jest.fn(),
  getStatus: jest.fn()
};
