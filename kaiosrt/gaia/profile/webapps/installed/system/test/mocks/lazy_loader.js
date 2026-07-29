window.LazyLoader = {
  load: (scripts, cb) => {
    typeof cb === 'function' && cb();
    return Promise.resolve();
  },

  getJSON: () => {
    return Promise.resolve([]);
  }
}
