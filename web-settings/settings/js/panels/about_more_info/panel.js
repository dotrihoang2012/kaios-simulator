/* global SimCardHelper */

define('panels/about_more_info/device_info',[],function() { // eslint-disable-line
  const DeviceInfo = function DeviceInfo() {
    this.deviceInfoElements = {};
  };

  DeviceInfo.prototype = {
    init: function init(elements) {
      this.deviceInfoElements = elements;

      this.loadImei();
      if (DeviceFeature.getValue('cdmaApn') === 'true') {
        this.loadMeid();
        this.deviceInfoElements.listMeids.hidden = false;
      }
      this.loadIccId();
    },

    getImeiCode: function getImeiCode(simSlotIndex) {
      const deviceInfo = ApiManager.connections[
        simSlotIndex
      ].getDeviceIdentities();

      return Promise.resolve(deviceInfo.imei);
    },

    createImeiField: function createImeiField(imeis) {
      while (this.deviceInfoElements.deviceInfoImeis.hasChildNodes()) {
        this.deviceInfoElements.deviceInfoImeis.removeChild(
          this.deviceInfoElements.deviceInfoImeis.lastChild
        );
      }

      if (!imeis || imeis.length === 0) {
        const span = document.createElement('span');

        span.setAttribute('data-l10n-id', 'unavailable');
        this.deviceInfoElements.deviceInfoImeis.appendChild(span);
      } else {
        imeis.forEach((imei, index) => {
          const span = document.createElement('span');

          if (imeis.length > 1) {
            l10n.setAttributes(span, 'deviceInfo-IMEI-with-index', {
              index: index + 1,
              imei
            });
          } else {
            span.textContent = imei;
          }

          span.dataset.slot = index;
          this.deviceInfoElements.deviceInfoImeis.appendChild(span);
        });
      }
    },

    loadImei: function loadImei() {
      if (!SimCardHelper.hasValidCard()) {
        this.deviceInfoElements.listImeis.hidden = true;
        return;
      }

      const conns = ApiManager.connections;
      // Retrieve all IMEI codes.
      const promises = [];
      for (let i = 0; i < conns.length; i++) {
        promises.push(this.getImeiCode(i));
      }

      Promise.all(promises).then(
        imeis => {
          this.createImeiField(imeis);
        },
        () => {
          this.createImeiField(null);
        }
      );
    },

    getMeidCode: function getMeidCode(simSlotIndex) {
      const deviceInfo = ApiManager.connections[
        simSlotIndex
      ].getDeviceIdentities();

      return Promise.resolve(deviceInfo.meid);
    },

    createMeidField: function createMeidField(meids) {
      while (this.deviceInfoElements.deviceInfoMeids.hasChildNodes()) {
        this.deviceInfoElements.deviceInfoMeids.removeChild(
          this.deviceInfoElements.deviceInfoMeids.lastChild
        );
      }

      let count = 0;
      meids.forEach((meid, index) => {
        /*
         * XXX, meid may be returned a string 'undefined' here which is
         * not correcet, until there's any fix in gecko, use this judge
         * as a workaround.
         */
        if (meid && meid !== 'undefined') {
          count++;
          const span = document.createElement('span');
          if (meids.length > 1) {
            l10n.setAttributes(span, 'deviceInfo-MEID-with-index', {
              index: index + 1,
              meid
            });
          } else {
            span.textContent = meid;
          }

          span.dataset.slot = index;
          this.deviceInfoElements.deviceInfoMeids.appendChild(span);
        }
      });

      if (count === 0) {
        this.deviceInfoElements.listMeids.hidden = true;
      }
    },

    loadMeid: function loadMeid() {
      if (!SimCardHelper.hasValidCard()) {
        this.deviceInfoElements.listMeids.hidden = true;
        return;
      }

      const conns = ApiManager.connections;
      // Retrieve all MEID codes.
      const promises = [];
      for (let i = 0; i < conns.length; i++) {
        promises.push(this.getMeidCode(i));
      }

      Promise.all(promises).then(
        meids => {
          this.createMeidField(meids);
        },
        () => {
          this.createMeidField(null);
        }
      );
    },

    /**
     * Show icc id.
     *
     * @access private
     * @memberOf DeviceInfo.prototype
     */
    loadIccId: function loadIccId() {
      if (!SimCardHelper.hasValidCard() || !ApiManager.telephony) {
        this.deviceInfoElements.listIccIds.hidden = true;
        return;
      }

      const conns = ApiManager.connections;
      const multiSim = conns.length > 1;

      // Update iccids
      while (this.deviceInfoElements.deviceInfoIccIds.hasChildNodes()) {
        this.deviceInfoElements.deviceInfoIccIds.removeChild(
          this.deviceInfoElements.deviceInfoIccIds.lastChild
        );
      }
      Array.prototype.forEach.call(conns, (conn, index) => {
        const span = document.createElement('span');
        if (conn.iccId) {
          if (multiSim) {
            l10n.setAttributes(span, 'deviceInfo-ICCID-with-index', {
              index: index + 1,
              iccid: conn.iccId
            });
          } else {
            span.textContent = conn.iccId;
          }
        } else if (multiSim) {
          l10n.setAttributes(span, 'noSim-with-index-and-colon', {
            index: index + 1
          });
        } else {
          span.setAttribute('data-l10n-id', 'noSimCard');
        }
        this.deviceInfoElements.deviceInfoIccIds.appendChild(span);
      });
    }
  };

  return function deviceInfo() {
    return new DeviceInfo();
  };
});


define('panels/about_more_info/hardware_info',['require'],function(require) { // eslint-disable-line
  const HardwareInfo = function HardwareInfo() {
    this.hardwareElements = {};
  };

  HardwareInfo.prototype = {
    init: function init(elements) {
      this.hardwareElements = elements;

      this.loadMacAddress();
      DeviceFeature.ready(() => {
        this.checkWifiAvaliable();
      });
    },

    /**
     * Observe and show MacAddress.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    loadMacAddress: function loadMacAddress() {
      SettingsDBCache.observe(
        'deviceinfo.mac',
        '',
        macAddress =>
          (this.hardwareElements.deviceInfoMac.textContent = macAddress)
      );
    },

    /**
     * Refreshing the address field only.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     * @param  {String} address Bluetooth address
     */
    refreshBluetoothAddress: function refreshBluetoothAddress(address) {
      // Update UI fields
      for (let i = 0, len = this.hardwareElements.fields.length; i < len; i++) {
        this.hardwareElements.fields[i].textContent = address;
      }
    },

    /**
     * Load Bluetooth address.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    loadBluetoothAddress: function loadBluetoothAddress() {
      SettingsDBCache.getSetting('bluetooth.settings.ui').then(value => {
        if (
          DeviceFeature.getValue('bt') !== 'true' ||
          !navigator.b2g.bluetooth ||
          value === Constants.SIM_CUSTOMIZATION.HIDE
        ) {
          document.querySelector('.list-bluetooth').hidden = true;
          window.dispatchEvent(new CustomEvent('refresh'));
          return;
        }
        document.querySelector('.list-bluetooth').hidden = false;

        if (navigator.b2g.bluetooth.defaultAdapter) {
          this.refreshBluetoothAddress(
            navigator.b2g.bluetooth.defaultAdapter.address
          );
        }
      });
    },

    checkWifiAvaliable: function checkWifiAvaliable() {
      SettingsDBCache.getSetting('wifi.settings.ui').then(value => {
        if (DeviceFeature.getValue('wifi') !== 'true') {
          document.querySelector('.list-mac').hidden = true;
          window.dispatchEvent(new CustomEvent('refresh'));
          return;
        }
        if (value === Constants.SIM_CUSTOMIZATION.HIDE) {
          document.querySelector('.list-mac').hidden = true;
        } else if (value === Constants.SIM_CUSTOMIZATION.SHOW) {
          document.querySelector('.list-mac').hidden = false;
        } else if (value === Constants.SIM_CUSTOMIZATION.GRAY) {
          document.querySelector('.list-mac').hidden = false;
        }
        window.dispatchEvent(new CustomEvent('refresh'));
      });
    }
  };

  return function hardwareInfo() {
    return new HardwareInfo();
  };
});

/* eslint no-unused-vars: "off" */

define('panels/about_more_info/panel',['require','modules/settings_panel','panels/about_more_info/device_info','panels/about_more_info/hardware_info'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const DeviceInfo = require('panels/about_more_info/device_info');
  const HardwareInfo = require('panels/about_more_info/hardware_info');

  const SOFTWARE_TAG = 'deviceinfo.software_tag';
  const FIRMWARE_REVISION = 'deviceinfo.firmware_revision';
  const BASE_VERSION = 'deviceinfo.base_version';
  let keyArray = [];
  let elements = null;

  function keyDwnHandler(evt) {
    switch (evt.key) {
      case 'SoftLeft':
      case 'SoftRight':
        keyArray.push(evt.key);
        checkDeveloperMode();
        break;
      default:
        cleanKeyArray();
        break;
    }
  }

  function checkDeveloperMode() {
    const string = keyArray.join(' ');
    if (
      string.indexOf(
        'SoftLeft SoftLeft SoftRight SoftLeft SoftRight SoftRight'
      ) > -1
    ) {
      cleanKeyArray();
      SettingsDBCache.getSetting('developer.menu.enabled').then(value => {
        SettingsDBCache.saveSettings({ 'developer.menu.enabled': !value });
        if (!value) {
          SettingsDBCache.saveSettings({
            'debugger.remote-mode': 'adb-devtools'
          });
          ToastHelper.showToast('developer-mode-on');
        } else {
          SettingsDBCache.saveSettings({
            'debugger.remote-mode': 'disabled'
          });
          ToastHelper.showToast('developer-mode-off');
        }
      });
    }
  }

  function cleanKeyArray() {
    keyArray = [];
  }

  function updateDeveloperMode(enabled) {
    if (!enabled) {
      DeviceFeature.ready(() => {
        if (DeviceFeature.getValue('buildType') === 'user') {
          elements.osVersion.addEventListener('keydown', keyDwnHandler);
          elements.osVersion.addEventListener('blur', cleanKeyArray);
        }
      });
    }
  }

  function updateSmallItem(element, value) {
    if (value === '') {
      element.classList.add('hidden');
    } else {
      element.querySelector('small').textContent = value;
    }
  }

  return function createAboutMoreInfoPanel() {
    const hardwareInfo = HardwareInfo();
    const deviceInfo = DeviceInfo();

    return SettingsPanel({
      onInit(panel) {
        deviceInfo.init({
          listImeis: panel.querySelector('.list-imeis'),
          listMeids: panel.querySelector('.list-meids'),
          listIccIds: panel.querySelector('.list-iccids'),
          deviceInfoImeis: panel.querySelector('.deviceInfo-imeis'),
          deviceInfoMeids: panel.querySelector('.deviceInfo-meids'),
          deviceInfoIccIds: panel.querySelector('.deviceInfo-iccids')
        });
        hardwareInfo.init({
          deviceInfoMac: panel.querySelector('[data-name="deviceinfo.mac"]'),
          fields: panel.querySelectorAll('[data-name="deviceinfo.bt_address"]')
        });
        elements = {
          osVersion: panel.querySelector('#os-version-li'),
          softTag: panel.querySelector('#soft-tag-li'),
          firmwareRevision: panel.querySelector('#firmware-revision-li'),
          baseVersion: panel.querySelector('#base-version-li')
        };
      },

      onBeforeShow() {
        SettingsSoftkey.hide();
        SettingsDBCache.getSettings(
          [SOFTWARE_TAG, FIRMWARE_REVISION, BASE_VERSION],
          results => {
            updateSmallItem(elements.softTag, results[SOFTWARE_TAG]);
            updateSmallItem(
              elements.firmwareRevision,
              results[FIRMWARE_REVISION]
            );
            updateSmallItem(elements.baseVersion, results[BASE_VERSION]);
          }
        );
        /*
         * SettingsDBCache.observe(
         *   'developer.ciphertext.disabled',
         *   false,
         *   updateDeveloperMode
         * );
         */

        hardwareInfo.loadBluetoothAddress();
      },

      onBeforeHide() {
        /*
         * SettingsDBCache.unobserve(
         *   'developer.ciphertext.disabled',
         *   updateDeveloperMode
         * );
         * elements.osVersion.removeEventListener('keydown', keyDwnHandler);
         * elements.osVersion.removeEventListener('blur', cleanKeyArray);
         */
      }
    });
  };
});

