if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

global.navigator.b2g.mobileConnections = [
  {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    data: {},
    voice: {},
    getDeviceIdentities: jest.fn(),
    imsHandler: {
      addEventListener: jest.fn(),
    }
  },
  {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    data: {},
    voice: {}
  }
]
