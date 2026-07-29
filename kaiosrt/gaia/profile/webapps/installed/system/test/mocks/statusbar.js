const MockStatusBar = {
  icons: {
    battery: {
      dataset: { level: 1 },
      removeAttribute: jest.fn()
    }
  }
};

global.StatusBar = MockStatusBar;
