if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

let callback = [];
global.navigator.b2g.downloadManager = {
  clearAllDone: jest.fn(),
  addEventListener: (event, cb) => {
    callback.push(cb);
  },
  dispatchEvent: () => {
    for(let i = 0; i < callback.length; i++) {
      callback[i]();
    }
  },
  getDownloads: function () {
    return Promise.resolve()
  },
  remove: jest.fn()
}