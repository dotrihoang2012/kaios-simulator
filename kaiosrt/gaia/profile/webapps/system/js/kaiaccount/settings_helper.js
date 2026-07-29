/* global SettingsObserver */
'use strict';

(function (exports) {

  var KaiAccountSettingsHelper = function KaiAccountSettingsHelper() {
    const getValue = function (
      key, defaultValue = null, returnObject = false
    ) {
      const isUndefined = (value) => {
        return value === '' || value === undefined || value === null;
      };
      return SettingsObserver.getValue(key).then(value => {
        if (isUndefined(value) && defaultValue !== null) {
          value = defaultValue;
        }
        return returnObject ? { [key]: value } : value;
      });
    };

    const getValues = function (settingsObj) {
      let promises = [];

      for (let key in settingsObj) {
        let defaultValue = settingsObj[key];
        promises.push(getValue(key, defaultValue, true));
      }
      return Promise.all(promises).then(results => {
        return results.reduce((settings, obj) => {
          for (let key in obj) {
            settings[key] = obj[key];
          }
          return settings;
        }, {});
      }).catch(error => error);
    };

    return {
      'getValue': getValue,
      'getValues': getValues
    };
  }();

  exports.KaiAccountSettingsHelper = KaiAccountSettingsHelper;
}(window));
