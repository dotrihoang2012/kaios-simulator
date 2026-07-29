/* global DeviceCapabilityManager, SettingsObserver */
'use strict';

(function (exports) {

  var KaiAccountDeviceInfoHelper = function KaiAccountDeviceInfoHelper() {
    const DEVICE_TYPE_MAP = {
      default: 1000,
      feature_phone: 1000,
      phone: 2000,
      tablet: 3000,
      watch: 4000
    };
    // XXX: Using mock default values before Gecko-side is ready.
    const deviceInfoKeys = {
      'app.update.custom': 'e150504f-456a-4fac-8548-9d9eaf7c20d2',
      'deviceinfo.cu': '4044O-2BAQUS1-R',
      'deviceinfo.build_number': '58',
      'deviceinfo.platform_build_id': '20200819223308',
      'deviceinfo.software': 'B2GOS 3.0',
    };
    // XXX: Using real IMEI when we can write IMEI into next devices.
    const mockIMEI = '365882355764838';
    let deviceInfoPromise = null;
    let DEBUG = true;

    const debug = function(...args) {
      DEBUG && console.log('[KaiAccountDeviceInfoHelper]', ...args);
    };

    const getSettingsValue = function (
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

    const getDeviceInfoFromSettings = function () {
      let promises = [];

      for (let key in deviceInfoKeys) {
        let defaultValue = deviceInfoKeys[key];
        promises.push(getSettingsValue(key, defaultValue, true));
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

    const getIMEI = function (slotId = 0) {
      const { mobileConnections } = navigator.b2g;

      if (mobileConnections) {
        return mobileConnections[slotId].getDeviceIdentities().imei || mockIMEI;
      }
      // XXX: There is no mobileConnections on simulator, just mock it for now.
      return mockIMEI;
    };

    const getDeviceType = function () {
      const preferenceKey = 'ro.build.characteristics';

      return DeviceCapabilityManager.get(preferenceKey).then(value => {
        return value.split(',').map(item => item.trim())
          .find(item => (item in DEVICE_TYPE_MAP));
      });
    };

    const getDeviceInfo = function() {
      let infos = {
        uuid: '',
        device_id: getIMEI(),
        os: '',
        os_version: '',
        build_id: '',
        reference: '',
        device_type: '',
        brand: '',
        model: '',
        lang: navigator.language
      };

      if (deviceInfoPromise) {
        return deviceInfoPromise;
      }

      deviceInfoPromise = Promise.all([
        getDeviceType(),
        DeviceCapabilityManager.get('ro.product.brand'),
        DeviceCapabilityManager.get('ro.product.name'),
        getDeviceInfoFromSettings()
      ]).then(values => {
        const characteristics = values[0];
        const brand = values[1];
        const model = values[2];
        const settings = values[3];
        const softwareInfos = settings['deviceinfo.software'].split(' ');

        infos.device_type = DEVICE_TYPE_MAP[characteristics];
        infos.brand = brand;
        infos.model = model;
        infos.uuid = settings['app.update.custom'];
        infos.reference = settings['deviceinfo.cu'];
        infos.os = softwareInfos[0];
        infos.os_version = softwareInfos[1];
        infos.build_id = settings['deviceinfo.platform_build_id'];

        debug('deviceInfos: ', infos);
        return infos;
      });

      return deviceInfoPromise;
    };

    const formatedTime = function(time) {
      return time.toString().padStart(2, '0');
    };

    const getTimeZoneOffset = function() {
      const t = new Date();
      const tzo = t.getTimezoneOffset();

      return tzo === 0 ? tzo : -(tzo / 60);
    };

    const getTimeStamp = function() {
      const t = new Date();
      const tzo = -t.getTimezoneOffset();
      const dif = tzo >= 0 ? '+' : '-';

      return (
        `${t.getFullYear()}-` +
        `${formatedTime(t.getMonth() + 1)}-` +
        `${formatedTime(t.getDate())}T` +
        `${formatedTime(t.getHours())}:` +
        `${formatedTime(t.getMinutes())}:` +
        `${formatedTime(t.getSeconds())}:` +
        `${dif}` +
        `${formatedTime(Math.abs(tzo / 60))}:` +
        `${formatedTime(Math.abs(tzo % 60))}`
      );
    }

    const getConnectionType = function() {
      return navigator.connection.type === 'wifi' ? 'wifi' : 'mobile'
    };

    return {
      'getConnectionType': getConnectionType,
      'getDeviceInfo': getDeviceInfo,
      'getIMEI': getIMEI,
      'getSettingsValue': getSettingsValue,
      'getTimeStamp': getTimeStamp,
      'getTimeZoneOffset': getTimeZoneOffset,
    };
  }();

  exports.KaiAccountDeviceInfoHelper = KaiAccountDeviceInfoHelper;
}(window));
