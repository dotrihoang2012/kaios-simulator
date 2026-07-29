/* global asyncStorage, SettingsObserver */

const Utils = {
  async getSettings(deviceInfoQuery) {
    this.deviceInfo = {};

    for (let key of Object.keys(deviceInfoQuery)) {
      this.deviceInfo[key] =
        await SettingsObserver.getValue(key) || deviceInfoQuery[key];
    }
  },

  setItem(key, value) {
    return new Promise((resolve) => {
      asyncStorage.setItem(key, value, resolve);
    });
  },

  getItem(key) {
    return new Promise((resolve) => {
      asyncStorage.getItem(key, resolve);
    });
  },

  uuid() {
    return 'xxxxxxxxxx'.replace(/[x]/g, () => {
      return (Math.random() * 16 | 0).toString(16);
    });
  }
};

export default Utils;
