var MockNavigatorFinancing = {
  info: {},
  get: () => {
    return new Promise(function(resolve) {
      resolve(MockNavigatorFinancing.info);
    });
  },
  set: function(info) {
    this.info = info;
  },
  addEventListener: function(type, cb) {
    if (type === 'configChanged') {
      this._cb = cb;
    }
  },

  removeEventListener: function() {
    this._cb = null;
  },
};

export default MockNavigatorFinancing;
