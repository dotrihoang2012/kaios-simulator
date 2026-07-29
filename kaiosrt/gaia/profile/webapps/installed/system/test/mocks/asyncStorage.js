window.asyncStorage = {
  getItem: (key, callback) => {
    callback();
  },
  removeItem: jest.fn(),
  setItem: (key, value, callback) => {
    if (callback) {
      callback();
    }
  }
};
