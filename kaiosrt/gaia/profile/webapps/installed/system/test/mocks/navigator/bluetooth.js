global.navigator.b2g.bluetooth = {
  addEventListener: jest.fn(),
  defaultAdapter: {
    enable: jest.fn(),
    disable: jest.fn(),
    getPairedDevices: () => {
      return ['fakebt']
    },
    getConnectedDevices: () => {
      return {
        onsuccess: jest.fn(),
        onerror: jest.fn()
      }
    },
    pair: jest.fn(),
    isScoConnected: () => {
      return {
        onsuccess: jest.fn(),
        onerror: jest.fn()
      }
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    connect: () => Promise.resolve()
  }
};
