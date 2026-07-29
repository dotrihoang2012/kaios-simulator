'use strict';
/* global SettingsObserver, SIMSlotManager, Service, DUMP */

(function(exports) {

  /**
   * Internet Sharing module responsible for checking the availability of
   * internet sharing based on the status of airplane mode.
   * @requires ModalDialog
   * @class InternetSharing
   */
  function InternetSharing() {}

  InternetSharing.prototype = {
    autoTurnoffHandle: null,
    autoTurnoffInterval: 0,
    startTimestamp: 0,
    lastConnectedClients: 0,
    tetheringWifiEnabled: false,
    taskScheduler: null,

    _taskScheduler: function() {
      return {
        _isLocked: false,
        _tasks: [],
        _lock: function() {
          this._isLocked = true;
        },
        _unlock: function() {
          this._isLocked = false;
          this._executeNextTask();
        },
        _executeNextTask: function() {
          if (this._isLocked) {
            console.log('[InternetSharing] waiting for the last task to end');
            return;
          }
          var nextTask = this._tasks.shift();
          if (nextTask) {
            this._lock();
            navigator.b2g.tetheringManager.setTetheringEnabled(nextTask.value,
              nextTask.type).then(() => {
              this._unlock();
            }, () => {
              this._unlock();
            });
          }
        },
        enqueue: function(value, type) {
          this._tasks.push({
            value,
            type
          });
          this._executeNextTask();
        }
      };
    },
    /**
     * Called whenever there is a setting change in wifi tethering.
     * Validates that we can turn internet sharing on, and saves state to
     * @memberof InternetSharing.prototype
     */
    wifiInternetSharingSettingsChangeHandler: function(value) {
      DUMP('WifiTethering set to ' + value);
      this.tetheringWifiEnabled = value;
      this.resetAutoTimeoutHandle();
      if (!value) {
        this.taskScheduler.enqueue(false, 'wifi');
      } else if (Service.query('AirplaneMode.isActive') && value) {
        var title = 'apmActivated';
        var buttonText = 'ok';
        var message ='noHotspotWhenAPMisOnWifiHotspot';
        if (!Service.query('isWifiCertified')) {
          message = 'noHotspotWhenAPMisOnWlanHotspot';
        }
        Service.request('DialogService:show', {
          id: 'apm-activated-alert',
          header: title,
          content: message,
          ok: buttonText,
          type: 'alert',
          noClose: true,
          onOk: () => {
            Service.request('DialogService:hide', 'apm-activated-alert');
          }
        });
        SettingsObserver.setValue([{
          name: 'tethering.wifi.enabled',
          value: false
        }]);
      }
    },

    usbInternetSharingSettingsChangeHandler: function(value) {
      DUMP('UsbTethering set to ' + value);
      this.taskScheduler.enqueue(!!value, 'usb');
    },

    clearAutoTimeoutHandle: function() {
      if (this.autoTurnoffHandle) {
        window.clearTimeout(this.autoTurnoffHandle);
        this.autoTurnoffHandle = null;
      }
    },

    wifiTetheringTimeoutChanged: function(value) {
      this.autoTurnoffInterval = value;
      this.resetAutoTimeoutHandle();
    },

    resetAutoTimeoutHandle: function() {
      this.clearAutoTimeoutHandle();
      if (!this.lastConnectedClients && this.tetheringWifiEnabled &&
        this.autoTurnoffInterval) {
        this.autoTurnoffHandle = window.setTimeout(() => {
          SettingsObserver.setValue([{
            name: 'tethering.wifi.enabled',
            value: false
          }]);
        }, this.autoTurnoffInterval * 1000);
      }
    },

    wifiStationchange: function() {
      let connectedClients = Service.query('Wifi.connectedClients');
      if (this.lastConnectedClients !== connectedClients) {
        this.lastConnectedClients = connectedClients;
        this.resetAutoTimeoutHandle();
      }
    },

    turnOffInternetSharing: function(value) {
      if (!value || SIMSlotManager.noSIMCardOnDevice()) {
        SettingsObserver.setValue([{
          name: 'tethering.wifi.enabled',
          value: false
        }, {
          name: 'tethering.usb.enabled',
          value: false
        }]);
      }
    },

    turnOffInternetSharingByWifi: function(value) {
      if (value || SIMSlotManager.noSIMCardOnDevice()) {
        SettingsObserver.setValue([{
          name: 'tethering.wifi.enabled',
          value: false
        }, {
          name: 'tethering.usb.enabled',
          value: false
        }]);
      }
    },

    turnOffUsbTethering: function() {
      SettingsObserver.setValue([{
        name: 'tethering.usb.enabled',
        value: false
      }]);
    },

    /**
     * Starts the InternetSharing class.
     * @memberof InternetSharing.prototype
     */
    start: function() {
      this.taskScheduler = this._taskScheduler();
      // listen changes after value is restored.
      SettingsObserver.observe('tethering.wifi.enabled', false,
        this.wifiInternetSharingSettingsChangeHandler.bind(this), true);
      SettingsObserver.observe('tethering.usb.enabled', false,
        this.usbInternetSharingSettingsChangeHandler.bind(this));
      SettingsObserver.observe('ril.data.enabled', false,
        this.turnOffInternetSharing);
      SettingsObserver.observe('tethering.wifi.timeout', 0,
        this.wifiTetheringTimeoutChanged.bind(this));
      SettingsObserver.observe('wifi.enabled', true,
        this.turnOffInternetSharingByWifi);
      window.addEventListener('wifi-stationchange',
        this.wifiStationchange.bind(this));
      if (!window.navigator.b2g.powerSupplyManager.powerSupplyOnline ||
        window.navigator.b2g.powerSupplyManager.powerSupplyType !== 'USB') {
        this.turnOffUsbTethering();
      }
      if (navigator.b2g.usbManager) {
        navigator.b2g.usbManager.onusbstatuschange = (evt) => {
          if (!evt.deviceAttached) {
            this.turnOffUsbTethering();
          }
        };
      }
      SettingsObserver.setValue([{
        name: 'tethering.wifi.enabled',
        value: false
      }]);
    }
  };

  exports.InternetSharing = InternetSharing;

}(window));
