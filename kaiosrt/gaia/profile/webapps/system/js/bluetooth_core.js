/* exported BluetoothCore */
/* global BaseModule, LazyLoader, Bluetooth2 */
'use strict';

(function() {
  var BluetoothCore = function() {
    this.bluetooth = navigator.b2g.bluetooth;
  };

  /**
   * BluetoothCore handle bluetooth related function and bootstrap modules for v2 API.
   *
   * @class BluetoothCore
   */
  BaseModule.create(BluetoothCore, {
    name: 'BluetoothCore',

    start: function() {
      // init Bluetooth module
      return LazyLoader.load(['js/bluetooth.js']).then(function() {
        window.Bluetooth = new Bluetooth2();
        return window.Bluetooth.init();
      });
    }
  });
}());
