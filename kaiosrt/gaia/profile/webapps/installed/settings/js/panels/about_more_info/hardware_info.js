
define(['require'],function(require) { // eslint-disable-line
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
