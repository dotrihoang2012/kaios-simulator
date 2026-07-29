if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}
global.navigator.b2g.getDeviceStorage = () => {
  return {
    storageName: 'sdcard',
    addEventListener: jest.fn(),
    freeSpace() {
      return {
        set onsuccess(cb) {
          cb({
            target: {
              result: 'freeSpaceResult'
            }
          });
        },
        set onerror(cb) {
          cb();
        }
      };
    },
    get(path) {
      return {
        set onsuccess(cb) {
          cb();
        },
        set onerror(cb) {
          cb();
        },
        get result() {
          const file = {
            name: path,
            size: 1
          };
          return file;
        }
      };
    },
    available() {
      return {
        set onsuccess(cb) {
          return new Promise((resolve,reject) => {
            resolve();
          }).then(() => {
            cb();
          });
        },
        set onerror(cb) {
          return new Promise((resolve,reject) => {
            resolve();
          }).then(() => {
            cb();
          });
        },
        get result() {
          return 'available';
        }
      };
    },
    delete(name) {
      return {
        set onsuccess(cb) {
          cb();
        },
        get result() {
          return name;
        }
      };
    },
  }
};