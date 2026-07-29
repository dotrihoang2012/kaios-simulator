/* global ApnHelper */
/**
 * The apn utilities
 */

define(['require','modules/apn/apn_const','modules/apn/apn_item'],function(require) { //eslint-disable-line
  const ApnConst = require('modules/apn/apn_const');
  const ApnItem = require('modules/apn/apn_item');

  const { CP_APN_KEY } = ApnConst;
  const { DEFAULT_APN_KEY } = ApnConst;
  const { MCC_SETTINGS_KEY } = ApnConst;
  const { MNC_SETTINGS_KEY } = ApnConst;
  const { MVNO_SETTINGS_KEY } = ApnConst;
  const { APN_PROPS } = ApnConst;
  const { EU_ROAMING_FILE_PATH } = ApnConst;

  function getOperatorCode(serviceId, type) {
    let value = '';
    let key = '';

    if (type === 'mcc') {
      value = '000';
      key = MCC_SETTINGS_KEY;
    } else if (type === 'mnc') {
      value = '00';
      key = MNC_SETTINGS_KEY;
    } else if (type === 'mvno') {
      value = [];
      key = MVNO_SETTINGS_KEY;
    } else {
      const error = 'invalid type';
      return Promise.reject(error);
    }

    return new Promise(resolve => {
      SettingsDBCache.getSetting(key).then(results => {
        if (results && Array.isArray(results) && results[serviceId]) {
          value = results[serviceId];
        }
        resolve(value);
      });
    });
  }

  /**
   * Helper function. Filter APNs by apn type.
   *
   * @param {String} type
   *                 The apn type we would like to include.
   * @param {ApnItem} apnItem
   */
  function apnTypeFilter(type, apnItem) {
    if (!type || !apnItem || !apnItem.apn.types) {
      return false;
    } else if (type === '*') {
      return true;
    }
    return apnItem.apn.types.indexOf(type) !== -1;
  }

  /**
   * Query <apn> elements matching the mcc/mnc arguments in the apn.json
   * database
   *
   * @param {String} mcc
   * @param {String} mnc
   * @param {String} networkType
   *                 The network type which the APN must be compatible with.
   */
  function getDefaultApns(Obj, serviceId) {
    // Should fallback to the JSON file if we don't get the apns
    return new Promise(resolve => {
      SettingsDBCache.getSetting(DEFAULT_APN_KEY).then(value => {
        const { mcc, mnc, networkType } = Obj;
        const result = value[serviceId] || {};
        const apns = {};
        apns[mcc] = {};
        apns[mcc][mnc] = result || {};
        resolve(ApnHelper.getCompatible(apns, mcc, mnc, networkType)); // eslint-disable-line
      });
    });
  }

  /**
   * Query <apn> elements matching the mcc/mnc arguments in the database
   * received through client provisioning messages.
   *
   * @param {String} mcc
   * @param {String} mnc
   * @param {String} networkType
   *                 The network type which the APN must be compatible with.
   */
  function getCpApns(Obj, serviceId) {
    return new Promise(resolve => {
      SettingsDBCache.getSetting(CP_APN_KEY).then(value => {
        const { mcc, mnc, networkType } = Obj;
        const apns = value || {};
        resolve(
          ApnHelper.getCompatible(apns[serviceId], mcc, mnc, networkType)
        ); // eslint-disable-line
      });
    });
  }

  let euApnChecked = false;
  let euApns = null;

  /**
   * Return the EU apns for roaming.
   */
  function getEuApns() {
    if (euApnChecked) {
      return Promise.resolve(euApns);
    }
    return LazyLoader.getJSON(EU_ROAMING_FILE_PATH)
      .then(result => {
        euApnChecked = true;

        /*
         * Only return eu apns when both home and foreign operators are
         * Specified.
         */
        if (
          result.home &&
          result.foreign &&
          Object.keys(result.home).length > 0 &&
          Object.keys(result.foreign).length > 0
        ) {
          euApns = result.defaultApns;
        }
        return euApns;
      })
      .catch(() => {
        euApnChecked = true;
        return null;
      });
  }

  function generateId() {
    // Should refine this
    return Math.random()
      .toString(36)
      .substr(2, 9);
  }

  function cloneApn(apn) {
    const newApn = {};
    for (let p in apn) { // eslint-disable-line
      newApn[p] = apn[p];
    }
    return newApn;
  }

  function separateApnsByType(apns) {
    if (!apns) {
      return [];
    }
    return apns.reduce((result, apn) => {
      // Separate the apn by type
      apn.types.forEach(type => {
        const newApn = cloneApn(apn);
        newApn.types = [type];
        result.push(newApn);
      });
      return result;
    }, []);
  }

  function isMatchedApn(apn1, apn2) {
    if (!apn1 || !apn2) {
      return false;
    }

    // Check if the type of apn1 is the subset of apn2
    if (!apn1.types.every(type => apn2.types.indexOf(type) !== -1)) {
      return false;
    }

    return APN_PROPS.every(prop => {
      if (prop === 'types') {
        // We've already check this property
        return true;
      }
      return apn1[prop] === apn2[prop];
    });
  }

  function sortByCategory(apn1, apn2) {
    if (apn1.category === ApnItem.APN_CATEGORY.PRESET) {
      return true;
    } else if (apn2.category === ApnItem.APN_CATEGORY.PRESET) {
      return false;
    }
    return true;
  }

  function clone(apn) {
    return JSON.parse(JSON.stringify(apn));
  }

  return {
    getOperatorCode,
    apnTypeFilter,
    getDefaultApns,
    getCpApns,
    getEuApns,
    generateId,
    separateApnsByType,
    isMatchedApn,
    sortByCategory,
    clone
  };
});
