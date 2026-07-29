/**
 * WifiWps is a module that can help you manipulate wps related stuffs easily.
 *
 * @module WifiWps
 */
/* global WifiHelper */

// eslint-disable-next-line
define(['require'],function(require) {
  const wifiManager = WifiHelper.getWifiManager();

  const WifiWps = () => {
    const wifiWps = {
      /**
       * A flag to make sure whether we are manipulating wps.
       *
       * @type {Boolean}
       * @default false
       */
      inProgress: false,
      /**
       * An array used to keep registered listeners for statusReset event.
       *
       * @type {Array}
       * @default []
       */
      statusResetEventListeners: [],
      /**
       * A method to trigger all registered handlers
       *
       * @type {Function}
       */
      statusReset() {
        this.statusResetEventListeners.forEach(handler => {
          handler();
        });
      },
      /**
       * Put necessary information about wps (ssid, method, pin) to connect
       * to specific wps.
       *
       * @param {Object} options
       */
      connect(options) {
        let req = null;

        const emptyFunc = () => {};
        const onSuccess = options.onSuccess || emptyFunc;
        const onError = options.onError || emptyFunc;

        const bssid = options.selectedAp;
        const method = options.selectedMethod;
        const { pin } = options;

        if (method === 'pbc') {
          req = wifiManager.wps({
            method: 'pbc'
          });
        } else if (method === 'myPin') {
          req = wifiManager.wps({
            method: 'pin',
            bssid
          });
        } else {
          req = wifiManager.wps({
            method: 'pin',
            bssid,
            pin
          });
        }

        req.onsuccess = () => {
          if (method === 'myPin') {
            this.showAlertDialog('wpsPinInput', { pin: req.result });
          }
          this.inProgress = true;
          onSuccess();
        };

        req.onerror = () => {
          onError(req.error);
        };
      },
      showAlertDialog(l10n, args) {
        const dialogConfig = {
          title: { id: 'settings', args: {} },
          body: { id: l10n, args },
          accept: {
            l10nId: 'ok',
            priority: 2,
            callback: () => {
              DialogHelper.destroy();
            }
          }
        };
        DialogHelper.show(dialogConfig);
      },
      /**
       * Cancel current wps operation and will call your onSuccess / onError
       * callback when operation is done.
       *
       * @memberOf WifiWps
       * @param {Object} options
       */
      cancel(options) {
        const emptyFunc = () => {};
        const onError = options.onError || emptyFunc;
        const onSuccess = options.onSuccess || emptyFunc;

        const req = wifiManager.wps({
          method: 'cancel'
        });

        req.onsuccess = () => {
          this.inProgress = false;
          this.statusReset();
          onSuccess();
        };

        req.onerror = () => {
          onError(req.error);
        };
      },
      /**
       * You can add your listeners when `statusreset` event is triggered.
       *
       * @memberOf WifiWps
       * @param {String} eventName
       * @param {Function} callback
       */
      addEventListener(eventName, callback) {
        if (eventName === 'statusreset') {
          this.statusResetEventListeners.push(callback);
        }
      },
      /**
       * Remove catched listener about `statusreset` event.
       *
       * @memberOf WifiWps
       * @param {String} eventName
       * @param {Function} callback
       */
      removeEventListener(eventName, callback) {
        if (eventName === 'statusreset') {
          const index = this.statusResetEventListeners.indexOf(callback);
          if (index >= 0) {
            this.statusResetEventListeners.splice(index, 1);
          }
        }
      }
    };
    return wifiWps;
  };

  return WifiWps;
});
