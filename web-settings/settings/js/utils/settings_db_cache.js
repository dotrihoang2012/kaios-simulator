/* global SettingsObserver ServiceManager */

(function (exports) { //eslint-disable-line
  let settingsReady = false;

  const SettingsDB = {
    setInitComplete(initComplete) {
      settingsReady = initComplete;
    },

    getInitComplete() {
      return settingsReady;
    },

    getSetting: function getSetting(key) {
      return new Promise(resolve => {
        SettingsObserver.getValue(key).then(
          val => {
            DebugHelper.debug(
              `settings_db_cache getSetting success:${JSON.stringify(val)}`
            );
            resolve(val);
          },
          reject => {
            DebugHelper.debug(
              `settings_db_cache getSetting rejected:=${JSON.stringify(reject)}`
            );
            resolve(null);
          }
        );
      });
    },

    getSettings: function getSettings(list, callback) {
      const dbCache = {};
      SettingsObserver.getBatch(list).then(resultList => {
        DebugHelper.debug(
          `settings_db_cache getSetting success:${JSON.stringify(resultList)}`
        );
        for (let i = 0; i < resultList.length; i++) {
          dbCache[resultList[i].name] = resultList[i].value;
        }
        callback(dbCache);
      });
    },

    saveSettings: function saveSettings(obj) {
      const saveObj = [];
      for (let key in obj) { //eslint-disable-line
        const tmp = {};
        tmp.name = key;
        /*
         * The value can't be undefined, Otherwise, something of settings api
         * Can't works. It will removed if gecko fixed it or apn restructure.
         */
        tmp.value = typeof obj[key] === Constants.UNDEFINED ? null : obj[key];
        saveObj.push(tmp);
      }
      SettingsObserver.setValue(saveObj).then(
        val => {
          DebugHelper.debug(
            `settings_db_cache saveSettings success:${JSON.stringify(val)}`
          );
        },
        reject => {
          DebugHelper.debug(
            `settings_db_cache saveSettings reject:${JSON.stringify(reject)}`
          );
        }
      );
    },

    observe: function observe(name, defaultValue, callback, observeOnly) {
      SettingsObserver.observe(name, defaultValue, callback, observeOnly);
    },

    unobserve: function unobserve(name, callback) {
      SettingsObserver.unobserve(name, callback);
    }
  };

  exports.SettingsDBCache = SettingsDB;
  DebugHelper.log(`settings_db_cache isComplete->${ServiceManager.isComplete}`);
  if (ServiceManager.isComplete) {
    SettingsDB.setInitComplete(true);
    DebugHelper.init();
  } else {
    window.addEventListener('services-init-complete', function onChangeEvent() {
      window.removeEventListener('services-init-complete', onChangeEvent);
      SettingsDB.setInitComplete(true);
      window.dispatchEvent(new CustomEvent('settings-db-ready'));
      DebugHelper.init();
    });
  }
})(window);
