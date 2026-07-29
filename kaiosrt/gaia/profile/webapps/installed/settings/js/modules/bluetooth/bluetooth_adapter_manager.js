/**
 * BluetoothAdapterManager:
 *   - BluetoothAdapterManager is an Observable that wraps the platform
 *     Bluetooth object for construct default adapter.
 *   - It has only one observable properties: defaultAdapter
 * BluetoothAdapterManager only update state and does not involve in any UI
 *   logic.
 *
 * @module BluetoothAdapterManager
 */


define(['require','modules/mvvm/observable'],function(require) { //eslint-disable-line
  const Observable = require('modules/mvvm/observable');
  const NavigatorBluetooth = navigator.b2g.bluetooth;

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [BluetoothAdapterManager]: ${msg}`);
    }
  }

  /**
   * @alias module:modules/bluetooth/BluetoothAdapterManager
   * @requires module:modules/mvvm/observable
   * @return {BluetoothAdapterManager}
   */
  const BluetoothAdapterManager = {
    /**
     * The default adapter used to connect to the remote bluetooth devices.
     *
     * @readonly
     * @memberOf BluetoothAdapterManager
     * @type {Object}
     */
    defaultAdapter: null,

    /**
     * Init Bluetooth module.
     *
     * @access private
     * @memberOf BluetoothAdapterManager
     */
    init() {
      // Early return while there is no navigator.b2g.bluetooth module.
      if (!NavigatorBluetooth) {
        return;
      }

      // Watch BluetoothManager event
      this.watchMozBluetoothAttributechanged();

      // Init default adapter
      this.initDefaultAdapter();
    },

    /**
     * Watch 'attributechanged' event from mozBluetooth for updating default
     * adapter information.
     *
     * 'attributechanged' event description:
     * A handler to trigger when bluetooth manager's only property
     * defaultAdapter has changed.
     *
     * @access private
     * @memberOf BluetoothAdapterManager
     */
    watchMozBluetoothAttributechanged() {
      NavigatorBluetooth.addEventListener('attributechanged', evt => {
        // eslint-disable-next-line guard-for-in
        for (const i in evt.attrs) {
          switch (evt.attrs[i]) {
            case 'defaultAdapter':
              /*
               * Default adapter attribute change.
               * Usually, it means that we reach new default adapter.
               */
              this.defaultAdapter = NavigatorBluetooth.defaultAdapter;
              debug(
                `${'watchMozBluetoothAttributechanged(): ' +
                  'this.defaultAdapter = '}${this.defaultAdapter}`
              );
              break;
            default:
              break;
          }
        }
      });
    },

    /*
     * Reach default adapter from platform Bluetooth.
     *
     * If the property is accessed on platform in the first time, it will
     * trigger Gecko::Bluetooth to get default adapter from the chipset.
     * So the value would be null.
     * Then we will receive 'attributechanged' event later.
     *
     * @access private
     * @memberOf BluetoothAdapterManager
     */
    initDefaultAdapter() {
      this.defaultAdapter = NavigatorBluetooth.defaultAdapter;
    }
  };

  // Create the observable object using the prototype.
  const bluetoothAdapterManager = Observable(BluetoothAdapterManager);
  bluetoothAdapterManager.init();
  return bluetoothAdapterManager;
});
