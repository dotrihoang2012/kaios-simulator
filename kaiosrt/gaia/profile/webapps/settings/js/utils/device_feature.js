/* global ServiceManager */
/*
 * (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */
(function(exports) { // eslint-disable-line

  const STORAGE_MAP = {
    version: 'featureVersion',
    wifi: 'isSupportWifiDevice',
    bt: 'isSupportBtDevice',
    gps: 'isSupportGpsDevice',
    voWifi: 'isSupportVowifiDevice',
    voLte: 'isSupportVolteDevice',
    primarySim: 'isSupportPrimarysimSwitch',
    rtt: 'isSupportRtt',
    lowMemory: 'isLowMemoryDevice',
    totalSize: 'deviceStorageSize',
    sdCardStatus: 'sdcardStatus',
    firstHotspot: 'isFirstTimeUseHotspot',
    firstTethering: 'isFirstTimeUseTethering',
    vilte: 'isSupportVilte',
    readout: 'isSupportReadout',
    deviceFinancing: 'isSupportdeviceFinancing',
    buildType: 'buildType',
    cdmaApn: 'cdmaApn',
    flipDevice: 'flipDevice',
    dualLte: 'isSupportDualLte',
    wifiCertified: 'isWifiCertified'
  };
  const DEVICE_FEATURE_VERSION = '1.0.1';
  const FEATURE_EVENT_NAME = 'featureInited';
  const TOTAL_SIZE = 4 * 1024 * 1024 * 1024;
  const DELAY_TIME = 10000;

  const KEY_MAP = {
    version: null,
    wifi: null,
    bt: null,
    gps: null,
    voWifi: null,
    voLte: null,
    primarySim: null,
    rtt: null,
    lowMemory: null,
    totalSize: null,
    sdCardStatus: null,
    firstHotspot: null,
    firstTethering: null,
    vilte: null,
    readout: null,
    deviceFinancing: null,
    buildType: null,
    cdmaApn: null,
    flipDevice: null,
    dualLte: null,
    wifiCertified: null
  };

  const deviceFeature = {
    ready(cbFunc) {
      if (this.getValue('version') === null) {
        window.addEventListener(FEATURE_EVENT_NAME, function onChangeEvent() {
          window.removeEventListener(FEATURE_EVENT_NAME, onChangeEvent);
          cbFunc();
        });
      } else {
        cbFunc();
      }
    },

    init() {
      if (this.getValue('version') === DEVICE_FEATURE_VERSION) {
        setTimeout(() => {
          this.initFeature();
        }, DELAY_TIME);
      } else {
        this.initFeature();
      }
    },

    getValue: function getValue(key) {
      return KEY_MAP[key] || localStorage.getItem(STORAGE_MAP[key]);
    },

    initFeature: function initFeature() {
      const promiseList = this.createFeaturePromise();
      Promise.all(promiseList).then(values => {
        this.setLocalStorageItem('wifi', values[0] ? values[0] : true);
        this.setLocalStorageItem('bt', values[1] ? values[1] : true);
        this.setLocalStorageItem('gps', values[2] ? values[2] : true);
        this.setLocalStorageItem('voWifi', values[3]);
        this.setLocalStorageItem('voLte', values[4]);
        this.setLocalStorageItem('primarySim', values[5]);
        this.setLocalStorageItem('rtt', values[6]);
        this.setLocalStorageItem('vilte', values[7]);
        this.setLocalStorageItem('readout', values[8]);
        this.setLocalStorageItem('deviceFinancing', values[9]);
        this.setLocalStorageItem('dualLte', values[10]);
        this.setLocalStorageItem('wifiCertified', values[11]);
        if (values[12] <= 256) {
          this.setLocalStorageItem('lowMemory', true);
        } else {
          this.setLocalStorageItem('lowMemory', false);
        }
        if (values[13]) {
          const deviceTotalSize = values[13] * 1024 * 1024;
          this.setLocalStorageItem('totalSize', deviceTotalSize);
        } else {
          const deviceTotalSize = TOTAL_SIZE;
          this.setLocalStorageItem('totalSize', deviceTotalSize);
        }
        this.setLocalStorageItem('buildType', values[14]);
        this.setLocalStorageItem('cdmaApn', values[15]);
        this.setLocalStorageItem('flipDevice', values[16]);

        this.setLocalStorageItem('version', DEVICE_FEATURE_VERSION);
        window.dispatchEvent(new CustomEvent(FEATURE_EVENT_NAME));
      });
    },

    setLocalStorageItem: function setLocalStorageItem(key, value) {
      try {
        localStorage.setItem(STORAGE_MAP[key], value);
      } catch (e) {
        console.error(`Failed to save localStorage: ${e}`);
      }
      KEY_MAP[key] = `${value}`;
    },

    createFeaturePromise: function createFeaturePromise() {
      const getFeatureList = [
        'device.wifi',
        'device.bt',
        'device.gps',
        'device.vowifi',
        'device.volte',
        'ril.support.primarysim.switch',
        'device.rtt',
        'device.vilte',
        'device.readout',
        'device.dfc',
        'device.dual-lte',
        'device.wifi.certified',
        'hardware.memory',
        'device.storage.size',
        'ro.build.type',
        'device.cdma-apn',
        'device.flip'
      ];

      const promiseList = [];
      getFeatureList.forEach(key => {
        promiseList.push(ApiManager.capabilities.get(key));
      });
      return promiseList;
    }
  };
  exports.DeviceFeature = deviceFeature;
  if (ServiceManager.isComplete) {
    deviceFeature.init();
  } else {
    window.addEventListener('services-init-complete', function onChangeEvent() {
      window.removeEventListener('services-init-complete', onChangeEvent);
      deviceFeature.init();
    });
  }
})(window);
