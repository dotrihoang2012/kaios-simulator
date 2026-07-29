/* global BaseModule, Service, SettingsObserver, DeviceCapabilityManager */
'use strict';

(function(exports) {
  var AirplaneModeServiceHelper = function() {};
  var hasWifiMode;
  let supportDualLte = Service.query('supportDualLte');
  /**
   * AirplaneModeServiceHelper should be deprecated in the future.
   * We should let each API handler to observe airplane mode
   * status change to turn on/off each API on their own.
   */
  AirplaneModeServiceHelper.SETTINGS = [
    'ril.ims.enabled',
    'ril.ims.suspended',
    'ril.dsds.ims.enabled',
    'ril.dsds.ims.suspended',
    'bluetooth.enabled',
    'bluetooth.suspended',
    'wifi.enabled',
    'wifi.suspended',
    'nfc.enabled',
    'nfc.suspended'
  ];
  DeviceCapabilityManager.get('device.wifi').then(function(enabled) {
    hasWifiMode = enabled;
  });
  BaseModule.create(AirplaneModeServiceHelper, {
    name: 'AirplaneModeServiceHelper',
    '_observe_ril.ims.enabled': function(value) {
      if (value) {
        this._unsuspend('ril.ims.suspended');
      }
    },
    '_observe_ril.dsds.ims.enabled': function(values) {
      let suspended = this._settings['ril.dsds.ims.suspended'];

      // clear the 'suspended' state
      if (typeof suspended !== 'undefined') {
        let obj = [];
        for (let i = 0; i < values.length; i++) {
          if (values[i]) {
            obj[i] = false;
          } else {
            obj[i] = suspended[i];
          }
        }
        let sset = {};
        sset['ril.dsds.ims.suspended'] = obj;
        this.writeSetting(sset);
      }
    },
    '_observe_bluetooth.enabled': function(value) {
      if (value) {
        this._unsuspend('bluetooth.suspended');
      }
    },
    '_observe_wifi.enabled': function(value) {
      if (value) {
        this._unsuspend('wifi.suspended');
      }
    },
    '_observe_nfc.enabled': function(value) {
      if (value) {
        this._unsuspend('nfc.suspended');
      }
    },
    // turn off the Setting corresponding to `key'
    // and remember its initial state by storing it in another setting
    _suspend: function(key) {
      this.debug('suspending: ' + key);
      var enabled = this._settings[key + '.enabled'];
      var suspended = this._settings[key + '.suspended'];

      if ('ril.dsds.ims' === key) {
        // remember the state before switching it to false
        let sset = {};
        sset[key + '.suspended'] = enabled;
        this.writeSetting(sset);
        // switch the state to false
        let eset = {};
        eset[key + '.enabled'] = [false, false];
        this.writeSetting(eset);
      } else {
        if (suspended) {
          this.debug('already suspended.');
          return;
        }

        // remember the state before switching it to false
        var sset = {};
        sset[key + '.suspended'] = enabled;
        this.writeSetting(sset);

        // switch the state to false if necessary
        if (enabled) {
          // make sure both BT API and settings key are handled
          if ('bluetooth' === key) {
            window.dispatchEvent(new CustomEvent('request-disable-bluetooth'));
          } else {
            var eset = {};
            eset[key + '.enabled'] = false;
            this.writeSetting(eset);
          }
        }
      }
    },
    // turn on the Setting corresponding to `key'
    // if it has been suspended by the airplane mode
    _restore: function(key) {
      this.debug('restoring: ' + key);
      var suspended = this._settings[key + '.suspended'];

      if ('ril.dsds.ims' === key) {
        let enabled = this._settings[key + '.enabled'];
        // clear the 'suspended' state
        let sset = {};
        sset[key + '.suspended'] = [false, false];
        this.writeSetting(sset);
        if (typeof suspended !== 'undefined') {
          // switch the state to true if it was suspended
          let obj = [];
          let isNeedRestore = false;
          for (let i = 0; i < suspended.length; i++) {
            obj[i] = enabled[i];
            if (suspended[i]) {
              obj[i] = true;
              isNeedRestore = true;
            }
          }
          if (isNeedRestore) {
            // Need reset ims preferredProfile for Unisoc platform volte/vowifi
            SettingsObserver.getValue('ril.dsds.ims.preferredProfile')
              .then((value) => {
              SettingsObserver.setValue([{
                name: 'ril.dsds.ims.preferredProfile',
                value
              }]);
            });
            let rset = {};
            rset[key + '.enabled'] = obj;
            this.writeSetting(rset);
          }
        }
      } else {
        // clear the 'suspended' state
        var sset = {};
        sset[key + '.suspended'] = false;
        this.writeSetting(sset);

        // switch the state to true if it was suspended
        if (suspended) {
          // make sure both BT API and settings key are handled
          if ('bluetooth' === key) {
            window.dispatchEvent(new CustomEvent('request-enable-bluetooth'));
          } else {
            if ('ril.ims' === key) {
              SettingsObserver.getValue('ril.ims.preferredProfile')
                .then((value) => {
                SettingsObserver.setValue([{
                  name: 'ril.ims.preferredProfile',
                  value
                }]);
              });
            }
            var rset = {};
            rset[key + '.enabled'] = true;
            this.writeSetting(rset);
          }
        }
      }
    },
    _unsuspend: function(settingSuspendedID) {
      this.debug('unsuspending: ' + settingSuspendedID);
      // clear the 'suspended' state
      var sset = {};
      sset[settingSuspendedID] = false;
      this.writeSetting(sset);
    },
    isEnabled: function(key) {
      return this._settings[key + '.enabled'];
    },
    isSuspended: function(key) {
      return this._settings[key + '.suspended'];
    },
    updateStatus: function(value, isFirstCheck) {
      this.debug('updating status.');
      // FM Radio will be turned off in Gecko, more detailed about why we do
      // this in Gecko instead, please check bug 997064.
      let bluetooth = window.navigator.b2g.bluetooth;
      const wifiManager = navigator.b2g.wifiManager;
      const nfc = navigator.b2g.nfc;

      this.publish(value ? 'airplanemode-enabled' : 'airplanemode-disabled');
      // After boot device, should not suspend or restore data/ims/bt/wifi/...
      // settings by APM value when first call updateStatus,
      // just keep old value.
      if (isFirstCheck) {
        return;
      }
      if (value) {
        // Turn off VoLTE and VoWiFi:
        if (supportDualLte) {
          this._suspend('ril.dsds.ims');
        } else {
          this._suspend('ril.ims');
        }

        // Turn off Bluetooth.
        if (bluetooth) {
          this._suspend('bluetooth');
        }

        // Turn off Wifi and Wifi tethering.
        if (wifiManager || !hasWifiMode) {
          this._suspend('wifi');
          this.writeSetting({
            'tethering.wifi.enabled': false
          });
        }

        // Turn off NFC
        if (nfc) {
          this._suspend('nfc');
        }
      } else {
        // Note that we don't restore Wifi tethering when leaving airplane mode
        // because Wifi tethering can't be switched on before data connection is
        // established.
        if (supportDualLte) {
          this._restore('ril.dsds.ims');
        } else {
          // Don't attempt to turn on ims if it's already on
          if (!this._settings['ril.ims.enabled']) {
            this._restore('ril.ims');
          }

        }

        // Don't attempt to turn on Bluetooth if it's already on
        if (bluetooth && !this._settings['bluetooth.enabled']) {
          this._restore('bluetooth');
        }

        // Don't attempt to turn on Wifi if it's already on
        if (!hasWifiMode || (wifiManager && !this._settings['wifi.enabled'])) {
          this._restore('wifi');
        }

        // Don't attempt to turn on NFC if it's already on
        if (nfc && !this._settings['nfc.enabled']) {
          this._restore('nfc');
        }
      }
    }
  });
  exports.AirplaneModeServiceHelper = AirplaneModeServiceHelper;
}(window));
