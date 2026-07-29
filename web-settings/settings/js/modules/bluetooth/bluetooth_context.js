/**
 * BluetoothContext:
 *   - BluetoothContext is an Observable that wraps the platform Bluetooth
 *     object.
 *   - BluetoothContext is a singleton that you can easily use it to fetch some
 *     shared data across different panels.
 *   - It has some observable properties: state, enabled, address, name,
 *     discoverable, discovering, numberOfPairedDevices, firstPairedDeviceName,
 *     hasPairedDevice.
 *   - It has two observable array: _pairedDevices, _remoteDevices.
 * BluetoothContext only update state and does not involve in any UI logic.
 *
 * @module BluetoothContext
 */

define(['require','modules/bluetooth/bluetooth_adapter_manager','modules/bluetooth/bluetooth_device','modules/bluetooth/bluetooth_connection_manager','modules/mvvm/observable','modules/mvvm/observable_array'],function(require) { //eslint-disable-line


  const AdapterManager = require('modules/bluetooth/bluetooth_adapter_manager');
  const BtDevice = require('modules/bluetooth/bluetooth_device');
  const ConnectionManager = require('modules/bluetooth/bluetooth_connection_manager');
  const Observable = require('modules/mvvm/observable');
  const ObservableArray = require('modules/mvvm/observable_array');

  const BLUETOOTH_PBAP = 'bluetooth.pbap';
  const BLUETOOTH_MAP = 'bluetooth.map';
  const SCANTIMEOUT = 40000;

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [Bluetooth Context]: ${msg}`);
    }
  }

  const BluetoothContext = {
    /**
     * State of Bluetooth default adapter.
     * This is an enum of BluetoothAdapterState.
     * State: 'disabled', 'disabling', 'enabled', 'enabling'
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    state: 'disabled',

    /**
     * State of Bluetooth.
     *
     * Set the default state as undefined in bug 1191104 Since Bluetooth
     * adapter API need sometime to respond for true Bluetooth state
     *
     * @readonly
     * @access private
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    enabled: null,

    /**
     * The address of the device's adapter on the bluetooth micro-network.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    address: null,

    /**
     * The human readable name of the device's adapter.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    name: '',

    /**
     * Indicates if the device is discoverable (true) or not (false)
     * by other bluetooth devices.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    discoverable: false,

    /**
     * Indicates if the device is in the process of discovering (true) or
     * not (false) surrounding bluetooth devices.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    discovering: false,

    /**
     * Number of Bluetooth paired devices.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Number}
     */
    numberOfPairedDevices: 0,

    /**
     * Device name of Bluetooth paired devices in the first sorting.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    firstPairedDeviceName: '',

    /**
     * Indicates if the paired device is in the paired devices list (true) or
     * not (false).
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    hasPairedDevice: false,
    hasFoundDevice: false,

    paired: false,

    /**
     * Default adapter of Bluetooth.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {BluetoothAdapter}
     */
    defaultAdapter: null,

    scanTimeoutId: null,

    /**
     * Init BluetoothContext module.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    init() {
      // Observe 'defaultAdapter' property for reaching default adapter.
      AdapterManager.observe(
        'defaultAdapter',
        this.onDefaultAdapterChanged.bind(this)
      );
      this.onDefaultAdapterChanged(AdapterManager.defaultAdapter);

      // Watch 'connecting' event for reaching connecting device.
      ConnectionManager.addEventListener(
        'connecting',
        this.updateDeviceConnectionInfo.bind(this)
      );

      // Watch 'connected' event for reaching connected device.
      ConnectionManager.addEventListener(
        'connected',
        this.updateDeviceConnectionInfo.bind(this)
      );

      // Watch 'disconnected' event for reaching disconnected device.
      ConnectionManager.addEventListener(
        'disconnected',
        this.updateDeviceConnectionInfo.bind(this)
      );

      // Watch 'profileChange' event for reaching device connection profile.
      ConnectionManager.addEventListener(
        'profileChanged',
        this.updateDeviceConnectionInfo.bind(this)
      );
    },

    /**
     * Init properties from default adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    initProperties(adapter) {
      // Init observable properties
      this.updateStatus(adapter.state);
      this.address = adapter.address;
      this.name = adapter.name;
      this.discoverable = adapter.discoverable;
      this.discovering = adapter.discovering;
    },

    /**
     * Only reset properties since there is no available default adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    resetProperties() {
      this.address = '';
      this.name = '';
      this.discoverable = false;
      this.discovering = false;
      this.paired = false;
    },

    /**
     * Watch 'attributechanged' event from default adapter for updating
     * enabled/disabled status immediately.
     *
     * Description of 'attributechanged' event:
     * A handler to trigger when one of the local bluetooth adapter's properties
     * has changed. Note access to the changed property in this event handler
     * would get the updated value.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    watchDefaultAdapterAttributechanged(adapter) {
      adapter.addEventListener(
        'attributechanged',
        this.onAdapterAttributeChanged.bind(this, adapter)
      );
    },

    /**
     * Unwatch 'attributechanged' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    unwatchDefaultAdapterAttributechanged(adapter) {
      adapter.removeEventListener(
        'attributechanged',
        this.onAdapterAttributeChanged
      );
    },

    /**
     * Watch 'ondevicepaired' event from default adapter for updating paired
     * device immediately.
     *
     * Description of 'ondevicepaired' event:
     * A handler to trigger when a remote device gets paired with local
     * bluetooth adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    watchDefaultAdapterOndevicepaired(adapter) {
      adapter.ondevicepaired = this.onAdapterDevicepaired.bind(this, adapter);
    },

    /**
     * Unwatch 'ondevicepaired' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    unwatchDefaultAdapterOndevicepaired(adapter) {
      adapter.ondevicepaired = null;
    },

    /**
     * Watch 'ondeviceunpaired' event from default adapter for updating unpaired
     * device immediately.
     *
     * Description of 'ondeviceunpaired' event:
     * A handler to trigger when a remote device gets unpaired from local
     * bluetooth adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    watchDefaultAdapterOndeviceunpaired(adapter) {
      adapter.ondeviceunpaired = this.onAdapterDeviceunpaired.bind(
        this,
        adapter
      );
    },

    /**
     * Unwatch 'ondeviceunpaired' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    unwatchDefaultAdapterOndeviceunpaired(adapter) {
      adapter.ondeviceunpaired = null;
    },

    /**
     * 'attributechanged' event handler from default adapter for updating
     * latest BluetoothContext information.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     * @param {event} evt
     */
    onAdapterAttributeChanged(adapter, evt) {
      // eslint-disable-next-line guard-for-in
      for (const i in evt.attrs) {
        switch (evt.attrs[i]) {
          case 'state':
            this.updateStatus(adapter.state);
            if (adapter.state === 'enabled') {
              // Init paired device information while Bluetooth is enabled.
              this.refreshPairedDevicesInfo(adapter);
            }
            break;
          case 'address':
            this.address = adapter.address;
            break;
          case 'name':
            this.name = adapter.name;
            break;
          case 'discoverable':
            this.discoverable = adapter.discoverable;
            break;
          case 'discovering':
            this.discovering = adapter.discovering;
            if (!this.discovering && this.scanTimeoutId) {
              clearTimeout(this.scanTimeoutId);
              this.scanTimeoutId = null;
            }
            break;
          default:
            break;
        }
      }
    },

    /**
     * 'ondevicepaired' event handler from default adapter for updating paired
     * device in remote/paired devices list.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     * @param {event} evt
     */
    onAdapterDevicepaired(adapter, evt) {
      debug(`onAdapterDevicepaired evt = ${evt}`);
      this.paired = true;

      /*
       * Have to get device object in this event handler
       * Ex. evt.device --> device
       */

      /*
       * Instead of adding the paired device in paired devices list,
       * get paired devices from adapter directly.
       */
      this.refreshPairedDevicesInfo(adapter);
    },

    /**
     * 'ondeviceunpaired' event handler from default adapter for updating
     * unpaired device in remote/paired devices list.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     * @param {event} evt
     */
    onAdapterDeviceunpaired(adapter, evt) {
      debug(`onAdapterDeviceunpaired evt = ${evt}`);
      // Have to get the device address in this event handler Ex. evt -> address

      /*
       * Instead of removing the paired device from paired devices list,
       * get paired devices from adapter directly.
       */
      this.refreshPairedDevicesInfo(adapter);
    },

    /**
     * 'defaultAdapter' change event handler from adapter manager for
     * watch/unwatch default adapter relative event immediately.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} newAdapter
     * @param {BluetoothAdapter} oldAdapter
     */
    onDefaultAdapterChanged(newAdapter, oldAdapter) {
      debug(`onDefaultAdapterChanged(): newAdapter = ${newAdapter}`);
      debug(`onDefaultAdapterChanged(): oldAdapter = ${oldAdapter}`);

      // Save default adapter
      this.defaultAdapter = newAdapter;

      if (oldAdapter) {
        // Unwatch event since the old adapter is no longer usefull
        this.unwatchDefaultAdapterAttributechanged(oldAdapter);
        this.unwatchDefaultAdapterOndeviceunpaired(oldAdapter);
        this.unwatchDefaultAdapterOndevicepaired(oldAdapter);
      }

      if (newAdapter) {
        // Watch event since the new adapter is ready to access
        this.initProperties(newAdapter);
        this.watchDefaultAdapterAttributechanged(newAdapter);
        this.watchDefaultAdapterOndevicepaired(newAdapter);
        this.watchDefaultAdapterOndeviceunpaired(newAdapter);
        // Init paired device information while Bluetooth is enabled
        if (newAdapter.state === 'enabled') {
          this.refreshPairedDevicesInfo(newAdapter);
        }
      } else {
        console.error('Bluetooth error, the adatper is null');
        // Reset properties only
        this.resetProperties();
      }
    },

    /**
     * Refresh paired devices information.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothAdapter} adapter
     */
    refreshPairedDevicesInfo(adapter) {
      const pairedDevices = adapter.getPairedDevices();
      debug(`pairedDevices.length = ${pairedDevices.length}`);

      // Reset paired devices list
      this.pairedDevices.reset([]);

      // Refresh properties about paired devices
      if (pairedDevices.length === 0) {
        // Reset the name
        this.firstPairedDeviceName = '';
        // Update property 'hasPairedDevice'
        this.hasPairedDevice = false;
      } else {
        // Sort paired devices
        pairedDevices.sort((a, b) => a.name > b.name);
        // Save paired devices in list
        // eslint-disable-next-line guard-for-in
        for (const i in pairedDevices) {
          // Create observable BtDevice
          const observableBtDevice = BtDevice(pairedDevices[i]);
          // Push device in devices list with observable object
          this.pairedDevices.push(observableBtDevice);
        }
        // Set the name
        this.firstPairedDeviceName = this.pairedDevices.get(0).name;
        // Update property 'hasPairedDevice'
        this.hasPairedDevice = true;
        // Update connection status and profile for these paired devices.
        this.initConnectingDevices();
        this.initConnectedDevices();
      }

      this.numberOfPairedDevices = pairedDevices.length;
    },

    /**
     * Since we have three properties which are relative with hardware status,
     * update them via this method here.
     * Update status, enabled, settings key 'bluetooth.enabled'
     * The input state would be {'disabled', 'disabling', 'enabled', 'enabling'}
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {String} state
     */
    updateStatus(state) {
      // Wrapper state to enabled/disabled toggle state.
      let enabled = null;
      if (state === 'enabled' || state === 'disabling') {
        enabled = true;
      } else if (state === 'disabled' || state === 'enabling') {
        enabled = false;
      }

      // Update state
      this.state = state;
      debug(`updateStatus(): set state = ${state}`);

      // Update enabled
      this.enabled = enabled;
      debug(`updateStatus(): set enabled = ${enabled}`);

      // Sync with settings key
      this.syncWithSettingsKey(enabled);
    },

    /**
     * The function provides to set booleans to update the 'bluetooth.enabled'
     * settings key if the value is not sync.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Boolean} enabled
     */
    syncWithSettingsKey(enabled) {
      SettingsDBCache.getSetting('bluetooth.enabled').then(value => {
        const btEnabled = value;
        if (btEnabled !== enabled) {
          SettingsDBCache.saveSettings({ 'bluetooth.enabled': enabled });
        }
      });
    },

    /**
     * Set Bluetooth enable/disable.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {Boolean} enabled
     * @returns {Promise}
     */
    setEnabled(enabled) {
      debug(`setEnabled(): request set enabled = ${enabled}`);
      if (
        this.enabled === enabled ||
        this.state === 'enabling' ||
        this.state === 'disabling'
      ) {
        return Promise.reject(new Error('state transition!!'));
      }

      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      if (enabled) {
        return this.defaultAdapter.enable().then(
          () => {
            debug('setEnabled(): set enable successfully :)');
          },
          reason => {
            debug(`setEnabled(): set enable failed: reason = ${reason}`);
            return Promise.reject(reason);
          }
        );
      }
      return this.defaultAdapter.disable().then(
        () => {
          debug('setEnabled(): set disable successfully :)');
        },
        reason => {
          debug(`setEnabled(): set disable failed: reason = ${reason}`);
          return Promise.reject(reason);
        }
      );
    },

    /**
     * Set Bluetooth discoverable.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {Boolean} enabled
     * @returns {Promise}
     */
    setDiscoverable(enabled) {
      if (this.discoverable === enabled || this.state !== 'enabled') {
        return Promise.reject(
          new Error('same state or Bluetooth is disabled!!')
        );
      }

      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      return this.defaultAdapter.setDiscoverable(enabled).then(
        () => {
          debug(
            `setDiscoverable(): set discoverable ${enabled} successfully :)`
          );
        },
        reason => {
          debug(
            `${'setDiscoverable(): set discoverable failed: ' +
              'reason = '}${reason}`
          );
          return Promise.reject(reason);
        }
      );
    },

    /**
     * Set adapter name.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} name
     * @returns {Promise}
     */
    setName(name) {
      if (name === this.name) {
        return Promise.reject(new Error('same name!!'));
      }

      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      return this.defaultAdapter.setName(name).then(
        () => {
          debug(
            `setName(): set name successfully :) name = ${this.defaultAdapter.name}`
          );
        },
        reason => {
          debug(`setName(): set name failed: reason = ${reason}`);
          return Promise.reject(reason);
        }
      );
    },

    /**
     * Set adapter name by product model.
     *
     * @access public
     * @memberOf BluetoothContext
     */
    setNameByProductModel() {
      /*
       * Bug 847459: Default name of the bluetooth device is set by bluetoothd
       * to the value of the Android ro.product.model property upon first
       * start. In case the user gives an empty bluetooth device name, we want
       * to revert to the original ro.product.model. Gecko exposes it under
       * the deviceinfo.product_model setting.
       */
      SettingsDBCache.getSetting('deviceinfo.product_model').then(value => {
        const productModel = value;
        debug(`setNameByProductModel(): productModel = ${productModel}`);
        this.setName(productModel);
      });
    },

    /**
     * An observable array to maintain paired devices which are just found out.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {ObservableArray}
     */
    pairedDevices: ObservableArray([]),

    /**
     * An observable array to maintain remote devices which are just found out.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {ObservableArray}
     */
    remoteDevices: ObservableArray([]),

    /**
     * An handler to handle 'ondevicefound' event. Then, we can save and update
     * found device in the remote devices array.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {Function}
     */
    discoveryHandler: null,

    /**
     * The method makes the device's adapter start seeking for remote devices.
     * The discovery process may be terminated after discovering a period of
     * time. If the startDiscovery operation succeeds, an onattributechanged
     * event would be triggered before the Promise is resolved to indicate
     * property discovering becomes true.
     *
     * @access public
     * @memberOf BluetoothContext
     * @type {Function}
     * @returns {Promise}
     */
    startDiscovery() {
      if (this.discovering === true || this.state !== 'enabled') {
        return Promise.reject(
          new Error('same state or Bluetooth is disabled!!')
        );
      }

      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      this.scanTimeoutId = setTimeout(() => {
        this.stopDiscovery();
      }, SCANTIMEOUT);

      return this.defaultAdapter.startDiscovery().then(
        handle => {
          debug('startDiscovery(): startDiscovery successfully :)');
          // Clean up found devices list
          this.remoteDevices.reset([]);

          /*
           * Keep reference to handle in order to listen to
           * ondevicefound event handler
           */
          this.hasFoundDevice = false;
          this.setDiscoveryHandler(handle);
        },
        reason => {
          debug(
            `${'startDiscovery(): startDiscovery failed: ' +
              'reason = '}${reason}`
          );
          return Promise.reject(reason);
        }
      );
    },

    /**
     * The method makes the device's adapter stop seeking for remote devices.
     * This is an asynchronous method and its result is returned via a Promise.
     * If the stopDiscovery operation succeeds, an onattributechanged would be
     * triggered before the Promise is resolved to indicate property discovering
     * becomes false. Note adapter may still receive
     * BluetoothDiscoveryHandle.ondevicefound event until the Promise is
     * resolved.
     *
     * @access public
     * @memberOf BluetoothContext
     * @type {Function}
     * @returns {Promise}
     */
    stopDiscovery() {
      if (this.discovering === false) {
        debug('stopDiscovery(): stopDiscovery successfully in same state :)');
        return Promise.resolve('same state');
      }

      if (this.state !== 'enabled') {
        return Promise.reject(new Error('Bluetooth is disabled!!'));
      }

      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      if (this.scanTimeoutId) {
        clearTimeout(this.scanTimeoutId);
        this.scanTimeoutId = null;
      }

      return this.defaultAdapter.stopDiscovery().then(
        () => {
          debug('stopDiscovery(): stopDiscovery successfully :)');
          return Promise.resolve();
        },
        reason => {
          debug(`stopDiscovery(): stopDiscovery failed: reason = ${reason}`);
          return Promise.reject(reason);
        }
      );
    },

    /**
     * A function to receive BluetoothDiscoveryHandle. And set a function to
     * handle 'ondevicefound' event.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {BluetoothDiscoveryHandle} handle
     */
    setDiscoveryHandler(handle) {
      debug(`setDiscoveryHandler(): handle = ${handle}`);
      // Make the code base easy to do unit test
      this.discoveryHandler = handle;
      this.discoveryHandler.ondevicefound = this.onDeviceFound.bind(this);
    },

    /**
     * Handle 'ondevicefound' event to access remote device in list with
     * observable object.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} evt
     */
    onDeviceFound(evt) {
      // Save device
      this.hasFoundDevice = true;
      this.saveDevice(evt.device);
    },

    /**
     * To distinguish between paired and unpaired.
     * Then, save/update the device in list corresponding to the state of
     * property paired.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Observable} device
     */
    saveDevice(device) {
      // Find the device is existed in devices list or not.
      const existedDevice = this.findDeviceByAddress({
        paired: device.paired,
        address: device.address
      });

      /*
       * If the device is not existed yet, create observable object
       * for saving this device.
       */
      if (!existedDevice) {
        // Create observable BtDevice
        const observableBtDevice = BtDevice(device);
        // Push device in devices list with observable object
        const operatingDevices = device.paired
          ? this.getPairedDevices()
          : this.getRemoteDevices();
        operatingDevices.push(observableBtDevice);
      }
    },

    /**
     * Given an observable arrry and item address. The function will remove it,
     * if it's existed in the array.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {ObservableArray} list
     * @param {String} address
     */
    removeItemFromList(list, address) {
      // Check the device is existed or not in remote/paired devices array
      const index = list.array.findIndex(
        this.matchDeviceByAddress.bind(this, address)
      );
      if (index > -1) {
        // The device is existed, remove it from observable list.
        list.splice(index, 1);
        debug(`removeItemFromList(): index = ${index}`);
      } else {
        // The device is not existed, no need to do any thing here.
      }
    },

    /**
     * Given paired, address properties to find out device element
     * from remote/paired devices list.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} options
     * @param {String} options.paired - is paired or not
     * @param {String} options.address - the address of the device
     * @return {Object} device
     */
    findDeviceByAddress(options) {
      // Distinguish to find the specific device in remote/paired devices list.
      const operatingDevices = options.paired
        ? this.getPairedDevices()
        : this.getRemoteDevices();
      // Check the device is existed or not in remote/paired devices array.
      const index = operatingDevices.array.findIndex(
        this.matchDeviceByAddress.bind(this, options.address)
      );

      if (index > -1) {
        return operatingDevices.get(index);
      }
      return null;
    },

    /**
     * Given address to find out device element from array.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {String} address
     * @param {BluetoothDevice} btDevice
     * @return {Boolean}
     */
    matchDeviceByAddress(address, btDevice) {
      return btDevice.address && btDevice.address === address;
    },

    /**
     * Return paired devices list which is maintained in BluetoothContext.
     *
     * @access public
     * @memberOf BluetoothContext
     * @return {ObservableArray}
     */
    getPairedDevices() {
      return this.pairedDevices;
    },

    /**
     * Return remote devices list which is maintained in BluetoothContext.
     *
     * @access public
     * @memberOf BluetoothContext
     * @return {ObservableArray}
     */
    getRemoteDevices() {
      return this.remoteDevices;
    },

    /**
     * The method starts pairing a remote device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} address
     * @returns {Promise}
     */
    pair(address) {
      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      /*
       * Note on Bluedroid stack, discovery has to be stopped before pairing
       * (i.e., call stopDiscovery() before pair()) otherwise stack callbacks
       * with pairing failure.
       */
      return this.stopDiscovery().then(
        () =>
          this.defaultAdapter.pair(address).then(
            () => {
              debug('pair(): Resolved with void value');
            },
            reason => {
              debug(`pair(): Reject with this reason: ${reason}`);
              return Promise.reject(reason);
            }
          ),
        reason => Promise.reject(reason)
      );
    },

    /**
     * The method starts unpairs a remote device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} address
     * @returns {Promise}
     */
    unpair(address) {
      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      this.resetPbmapSetting(address);

      return this.defaultAdapter.unpair(address).then(
        () => {
          debug('unpair(): Resolved with void value');
        },
        reason => {
          debug(`unpair(): Reject with this reason: ${reason}`);
          return Promise.reject(reason);
        }
      );
    },

    resetPbmapSetting(address) {
      SettingsDBCache.getSetting(BLUETOOTH_PBAP).then(value => {
        if (value && value === address) {
          const obj = {};
          obj[BLUETOOTH_PBAP] = null;
          SettingsDBCache.saveSettings(obj);
        }
      });
      SettingsDBCache.getSetting(BLUETOOTH_MAP).then(value => {
        if (value && value === address) {
          const obj = {};
          obj[BLUETOOTH_MAP] = null;
          SettingsDBCache.saveSettings(obj);
        }
      });
    },

    /**
     * The method starts sending file to a remote device with the device's
     * adapter.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} address - address of target device
     * @param {Object} blob - blob(file) to send
     * @returns {Promise}
     */
    sendFile(address, blob) {
      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      return this.defaultAdapter.sendFile(address, blob).then(
        () => {
          debug('sendFile(): Resolved with void value');
        },
        reason => {
          debug(`sendFile(): Reject with this reason: ${reason}`);
          return Promise.reject(reason);
        }
      );
    },

    /**
     * Init the connecting device which is browsed in paired devices list.
     * Get connection info from ConnectionManager.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    initConnectingDevices() {
      // Init the paired device connection status for connecting device.
      if (!ConnectionManager.connectingAddress) {
        return;
      }

      const existedDevice = this.findDeviceByAddress({
        paired: true,
        address: ConnectionManager.connectingAddress
      });
      if (existedDevice) {
        // The connecting device is existed. Init connection status for it.
        const options = {
          connectionStatus: 'connecting'
        };
        debug(`initConnectingDevices(): options = ${JSON.stringify(options)}`);
        existedDevice.updateConnectionInfo(options);
      }
    },

    /**
     * Init the connected device which is browsed in paired devices list.
     * Get connection info from ConnectionManager.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    initConnectedDevices() {
      // Init the connection status of paired device for connected device.
      ConnectionManager.getConnectedDevices().then(
        connectedDevices => {
          // eslint-disable-next-line guard-for-in
          for (const address in connectedDevices) {
            const existedDevice = this.findDeviceByAddress({
              paired: true,
              address
            });

            if (existedDevice) {
              /*
               * The connected device is existed.
               * Init connection status/profiles for it.
               */
              const options = {
                connectionStatus: 'connected',
                profiles: connectedDevices[address].connectedProfiles
              };
              debug(
                `initConnectedDevices(): address = ${address}, options = ${JSON.stringify(
                  options
                )}`
              );
              existedDevice.updateConnectionInfo(options);
            }
          }
        },
        reason => {
          debug(
            `${'initConnectedDevices(): getConnectedDevices(): failed, ' +
              'reason = '}${reason}`
          );
        }
      );
    },

    /**
     * Device 'connecting', 'connected', 'disconnected', and 'profiles'
     * properties are changed from ConnectionManager operation.
     * Update device properties of connection info via event 'type', 'detail'.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} event
     * @param {String} event.type - type of event name
     * @param {Object} event.detail - device info in this object
     * @param {Object} event.detail.address - address of device
     * @param {Object} event.detail.profiles - connection profiles of device
     */
    updateDeviceConnectionInfo(event) {
      debug(`updateDeviceConnectionInfo(): event = ${JSON.stringify(event)}`);
      const existedDevice = this.findDeviceByAddress({
        paired: true,
        address: event.detail.address
      });
      if (existedDevice) {
        // The device is existed, update device info by event type.
        let options = {};
        switch (event.type) {
          case 'connecting':
          case 'connected':
          case 'disconnected':
            options = {
              connectionStatus: event.type
            };
            break;
          case 'profileChanged':
            options = {
              profiles: event.detail.profiles
            };
            break;
          default:
            break;
        }
        debug(
          `updateDeviceConnectionInfo(): options = ${JSON.stringify(options)}`
        );
        existedDevice.updateConnectionInfo(options);
      } else {
        // If the device is not existed yet, do nothing here.
      }
    }
  };

  // Create the observable object using the prototype.
  const bluetoothContext = Observable(BluetoothContext);
  bluetoothContext.init();
  return bluetoothContext;
});
