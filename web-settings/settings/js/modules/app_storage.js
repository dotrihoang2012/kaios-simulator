/* Global*/


define(['require','modules/mvvm/observable'],function(require) { //eslint-disable-line

  const Observable = require('modules/mvvm/observable');

  const AppStorage = function AppStorage() {
    this.enabledState = false;
    this.appStorage = navigator.b2g.getDeviceStorage('apps');

    this.storage = Observable({
      usedPercentage: 0,
      totalSize: 0,
      usedSize: 0,
      freeSize: 0
    });
  };

  AppStorage.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false,
     * the UI stops reflecting the updates from the app storage.
     *
     * @access public
     * @memberOf AppStorage.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this.enabledState;
    },

    set enabled(value) {
      // Early return if the value is not changed
      if (this.enabledState === value) {
        return;
      }
      this.enabledState = value;

      if (value) {
        this.attachListeners();
        this.getSpaceInfo();
      } else {
        this.detachListeners();
      }
    },

    attachListeners: function attachListeners() {
      this.appStorage.addEventListener('change', this);
    },

    detachListeners: function detachListeners() {
      this.appStorage.removeEventListener('change', this);
    },

    handleEvent: function handleEvent(evt) {
      switch (evt.type) {
        case 'change':
          this.getSpaceInfo();
          break;
        default:
          break;
      }
    },

    getSpaceInfo: function getSpaceInfo() {
      const deviceStorage = this.appStorage;

      if (!deviceStorage) {
        console.error('Cannot get DeviceStorage for: app');
        return;
      }
      deviceStorage.freeSpace().onsuccess = function freeSpace(evt) {
        this.storage.freeSize = evt.target.result;
        deviceStorage.usedSpace().onsuccess = function usedSpace(e) {
          this.storage.usedSize = e.target.result;
          // Calculate the percentage to show a space usage bar
          this.storage.totalSize =
            this.storage.usedSize + this.storage.freeSize;
          let usedPercentage =
            this.storage.totalSize === 0
              ? 0
              : (this.storage.usedSize * 100) / this.storage.totalSize;
          if (usedPercentage > 100) {
            usedPercentage = 100;
          }
          this.storage.usedPercentage = usedPercentage;
        }.bind(this);
      }.bind(this);
    }
  };

  // Return singleton
  const instance = new AppStorage();
  instance.enabled = true;
  return instance;
});
