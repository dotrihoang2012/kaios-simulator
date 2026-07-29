/**
 * BluetoothConnectionManager:
 * BluetoothConnectionManager only update state and does not involve in any UI
 *   logic.
 *
 * @module BluetoothConnectionManager
 */

define(['require','modules/bluetooth/bluetooth_adapter_manager'],function(require) { //eslint-disable-line

  const AdapterManager = require('modules/bluetooth/bluetooth_adapter_manager');
  const DEVICE_CONNECTED_KEY = 'bluetooth.device.connected';

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [BluetoothConnectionManager]: ${msg}`);
    }
  }

  /**
   * @alias module:modules/bluetooth/BluetoothConnectionManager
   * @requires module:modules/bluetooth/bluetooth_adapter_manager
   * @return {BluetoothConnectionManager}
   */
  const BluetoothConnectionManager = {
    /**
     * The profiles of connected device that we are defined here.
     *
     * @public
     * @memberOf BluetoothConnectionManager
     * @type {Object}
     */
    Profiles: {
      hfp: 0x111e, // Handsfree
      a2dp: 0x110d, // Advanced Audio Distribution Devices
      hid: 0x1124 // Keyboard device
    },

    /**
     * The address of device that we are trying to connect.
     *
     * @public
     * @memberOf BluetoothConnectionManager
     * @type {String}
     */
    connectingAddress: null,

    /**
     * A object that we cache the connected devices information(address, device,
     * connectedProfiles). It will be inited while default adapter is ready.
     * And these information is coming from profile events.
     * Each connected device is hashed by device address.
     *
     * EX:
     * connectedDevicesInfo = {
     *   'AA:BB:CC:00:11:22': {
     *     'device': DeviceObject,
     *     'connectedProfiles': {
     *       'hfp': true,
     *       'a2dp': false
     *     }
     *   }
     * };
     *
     * @private
     * @memberOf BluetoothConnectionManager
     * @type {Object}
     */
    connectedDevicesInfo: {},

    /**
     * An instance to maintain that we have created a promise to get connected
     * devices.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @return {Promise}
     */
    getConnectedDevicesPromise: null,

    /**
     * The object maintains listeners' callback per property name.
     * Each listener would be called as following definition.
     * 'connecting' - be called when device is connecting.
     * 'connected': - be called when device is connected.
     * 'disconnected': - be called when device is disconnected.
     * 'profileChanged': - be called when profile is changed.
     *
     * @memberOf BluetoothConnectionManager
     * @type {Object}
     */
    listeners: {
      connecting: [],
      connected: [],
      disconnected: [],
      profileChanged: []
    },

    /**
     * Default adapter of Bluetooth.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @type {BluetoothAdapter}
     */
    defaultAdapter: null,

    /**
     * Manual connection flag.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @type {Boolean}
     */

    manualConnection: false,

    /**
     * Init BluetoothConnectionManager module.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     */
    init() {
      // Observe 'defaultAdapter' property for reaching default adapter.
      AdapterManager.observe(
        'defaultAdapter',
        this.onDefaultAdapterChanged.bind(this)
      );
      this.onDefaultAdapterChanged(AdapterManager.defaultAdapter);
    },

    /**
     * 'defaultAdapter' change event handler from adapter manager for
     * updating adapter immediately.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
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
        this.unwatchProfilesStatuschanged(oldAdapter);
        this.unwatchDefaultAdapterOnattributechanged(oldAdapter);
      }

      if (newAdapter) {
        // Watch event since the new adapter is ready to access
        this.watchProfilesStatuschanged(newAdapter);
        this.watchDefaultAdapterOnattributechanged(newAdapter);
      } else {
        // Reset properties only
        this.resetConnectionInfo();
      }
    },

    /**
     * Return the cache of connected devices in ConnectionManager.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @return {Promise}
     */
    getConnectedDevices() {
      if (!this.getConnectedDevicesPromise) {
        this.getConnectedDevicesPromise = this.initConnectedDevicesInfo().then(
          () => {
            debug(
              `getConnectedDevices(): resolved with latest cache = ${JSON.stringify(
                this.connectedDevicesInfo
              )}`
            );
            return this.connectedDevicesInfo;
          },
          reason => {
            debug(`getConnectedDevices(): rejected with reason = ${reason}`);
            this.getConnectedDevicesPromise = null;
          }
        );
      }
      return this.getConnectedDevicesPromise;
    },

    /**
     * Init cache of connected device and save it in cache.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @return {Promise}
     */
    initConnectedDevicesInfo() {
      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      /*
       * Init connection status and profile from platform.
       * Then, save these connected device information in cache.
       */
      return this.getConnectedDevicesFromPlatform().then(
        connectedDevicesByProfile => {
          this.constructDeviceItemsMap(connectedDevicesByProfile);
        },
        reason => {
          debug(
            'initConnectedDevicesInfo(): rejected in ' +
              'getConnectedDevicesFromPlatform'
          );
          return Promise.reject(reason);
        }
      );
    },

    /**
     * The method will update each device item in maintaining map.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} connectedDevices
     */
    constructDeviceItemsMap(connectedDevices) {
      debug(
        `constructDeviceItemsMap(): connectedDevices = ${JSON.stringify(
          connectedDevices
        )}`
      );
      if (!connectedDevices) {
        // Return empty object while there is no any connected devices.
        debug('constructDeviceItemsMap(): early return with empty object');
        return;
      }

      Object.keys(this.Profiles).map(profileID =>
        connectedDevices[profileID].forEach(connectedDevice => {
          const connectionDeviceInfo = {
            address: connectedDevice.address,
            connected: true,
            profileID,
            device: connectedDevice
          };
          debug(
            `constructDeviceItemsMap(): connectionDeviceInfo = ${JSON.stringify(
              connectionDeviceInfo
            )}`
          );
          this.initConnectedDevicesCache(connectionDeviceInfo);
        })
      );
    },

    /**
     * Init the cache which is maintained for connection devices.
     * And the input is gotten from platform API adapter.getConnectedDevices().
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.address - address of the device
     * @param {Boolean} options.connected - is connected or not
     * @param {Object} options.profileID - profile ID of the connection type
     * @param {Object} options.device - connect device, Bluetooth Object
     */
    initConnectedDevicesCache(options) {
      debug(
        `initConnectedDevicesCache(): options = ${JSON.stringify(options)}`
      );
      // Hash by device address
      let info = this.connectedDevicesInfo[options.address];
      if (info) {
        // Already have profiles, update it for other profile.
        info.connectedProfiles[options.profileID] = options.connected;
      } else {
        /*
         * Not have profiles yet, create for it.
         * If options.device is existed, save the connected device.
         * Otherwise, given null in this property.
         */
        const connectedDevice = options.device ? options.device : null;
        info = {
          device: connectedDevice,
          connectedProfiles: {}
        };
        info.connectedProfiles[options.profileID] = options.connected;
      }
      // Save the device/profile in map.
      this.connectedDevicesInfo[options.address] = info;

      /*
       * If there is no profile connected,
       * remove the device item from cache since it is already disconnected.
       */
      const dataToCheckConnectedProfile = {
        address: options.address,
        connectedDevices: this.connectedDevicesInfo
      };
      if (!this.hasConnectedProfileByAddress(dataToCheckConnectedProfile)) {
        delete this.connectedDevicesInfo[options.address];
      }
      // Return the latest cache which is just updated here.
      debug(
        `initConnectedDevicesCache(): this.connectedDevicesInfo = ${JSON.stringify(
          this.connectedDevicesInfo
        )}`
      );
      return this.connectedDevicesInfo;
    },

    /**
     * Update the cache which is maintained for connection devices.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.address - address of the device
     * @param {Boolean} options.connected - is connected or not
     * @param {Object} options.profileID - profile ID of the connection type
     * @param {Object} options.device - connect device, Bluetooth Object
     */
    updateConnectedDevices(options) {
      return this.getConnectedDevices().then(
        connectedDevicesInfo => {
          debug(
            `updateConnectedDevices(): connectedDevicesInfo = ${JSON.stringify(
              connectedDevicesInfo
            )}`
          );

          // Hash by device address
          let info = connectedDevicesInfo
            ? connectedDevicesInfo[options.address]
            : null;
          if (info) {
            // Already have profiles, update it for other profile.
            info.connectedProfiles[options.profileID] = options.connected;
          } else {
            /*
             * Not have profiles yet, create for it.
             * If options.device is existed, save the connected device.
             * Otherwise, given null in this property.
             */
            const connectedDevice = options.device ? options.device : null;
            info = {
              device: connectedDevice,
              connectedProfiles: {}
            };
            info.connectedProfiles[options.profileID] = options.connected;
          }
          // Save the device/profile in map.
          this.connectedDevicesInfo[options.address] = info;

          /*
           * If there is no profile connected,
           * remove the device item from cache since it is already disconnected.
           */
          const dataToCheckConnectedProfile = {
            address: options.address,
            connectedDevices: this.connectedDevicesInfo
          };
          if (!this.hasConnectedProfileByAddress(dataToCheckConnectedProfile)) {
            delete this.connectedDevicesInfo[options.address];
          }
          // Return the latest cache which is just updated here.
          debug(
            `updateConnectedDevices(): this.connectedDevicesInfo = ${JSON.stringify(
              this.connectedDevicesInfo
            )}`
          );
          return Promise.resolve(this.connectedDevicesInfo);
        },
        () => {
          debug('updateConnectedDevices(): rejected with some exception');
          return Promise.reject(new Error('rejected with some exception'));
        }
      );
    },

    /**
     * Only reset properties since there is no available default adapter.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     */
    resetConnectionInfo() {
      // Reset connection status.
      this.connectingAddress = null;

      /*
       * Clean up the instance to get connected devices
       * while new adapter is ready.
       */
      this.getConnectedDevicesPromise = null;
    },

    /**
     * Watch 'onattributechanged' event from default adapter for watching
     * adapter enabled/disabled status.
     *
     * Description of 'onattributechanged' event:
     * A handler to trigger when one of the local bluetooth adapter's properties
     * has changed. Note access to the changed property in this event handler
     * would get the updated value.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    watchDefaultAdapterOnattributechanged(adapter) {
      adapter.addEventListener(
        'attributechanged',
        this.onAdapterAttributeChanged.bind(this, adapter)
      );
    },

    /**
     * Unwatch 'onattributechanged' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    unwatchDefaultAdapterOnattributechanged(adapter) {
      adapter.removeEventListener(
        'attributechanged',
        this.onAdapterAttributeChanged
      );
    },

    /**
     * 'onattributechanged' event handler from default adapter for reaching
     * adapter enabled/disabled status.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     * @param {event} evt
     */
    onAdapterAttributeChanged(adapter, evt) {
      // eslint-disable-next-line guard-for-in
      for (const i in evt.attrs) {
        debug(`onAdapterAttributeChanged(): ${evt.attrs[i]}`);
        switch (evt.attrs[i]) {
          case 'state':
            break;
          default:
            break;
        }
      }
    },

    /**
     * Watch every of profile events('onhfpstatuschanged','ona2dpstatuschanged')
     * from default adapter for updating device connected status immediately.
     *
     * Description of 'onhfpstatuschanged' event:
     * Specifies an event listener to receive hfpstatuschanged events.
     * Those events occur when an HFP connection status changes.
     *
     * Description of 'ona2dpstatuschanged' event:
     * Specifies an event listener to receive a2dpstatuschanged events.
     * Those events occur when an A2DP connection status changes.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    watchProfilesStatuschanged(adapter) {
      let eventName = null;
      // eslint-disable-next-line guard-for-in
      for (const profileID in this.Profiles) {
        eventName = `on${profileID}statuschanged`;
        adapter[eventName] = this.onProfileStatuschangeHandler.bind(
          this,
          profileID
        );
      }
    },

    /**
     * Unwatch every of profile events('onhfpstatuschanged',
     * 'ona2dpstatuschanged') from default adapter since adapter is removed.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    unwatchProfilesStatuschanged(adapter) {
      let eventName = null;
      // eslint-disable-next-line guard-for-in
      for (const profileID in this.Profiles) {
        eventName = `on${profileID}statuschanged`;
        adapter[eventName] = null;
      }
    },

    /**
     * 'onhfpstatuschanged', 'ona2dpstatuschanged' events handler from
     * default adapter for updating device connected status.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} profileID
     * @param {event} evt
     */
    onProfileStatuschangeHandler(profileID, evt) {
      debug(
        `onProfileStatuschangeHandler(): profileID = ${profileID}, evt.address = ${evt.address}, evt.status = ${evt.status}`
      );
      const options = {
        address: evt.address,
        connected: evt.status,
        profileID
      };
      // Update connection status.
      this.updateConnectionStatus(options);
    },

    /**
     * Record connected device so if Bluetooth is turned off and then on
     * we can restore the connection.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} action - to set or remove item for recording connection
     * @param {String} address - the address of connected device
     */
    recordConnection(action, address) {
      const obj = {};
      if (action === 'set') {
        /*
         * Record connected device so if Bluetooth is turned off and then on
         * we can restore the connection
         */
        obj[DEVICE_CONNECTED_KEY] = address;
        SettingsDBCache.saveSettings(obj);
        debug('_recordConnection(): set item');
      } else if (
        action === 'remove' &&
        this.defaultAdapter.state === 'enabled'
      ) {
        /*
         * Set the connected device to null
         * Only do this while Bluetooth state is enabled.
         * Because the request also comes while Bluetooth is turned off.
         */
        obj[DEVICE_CONNECTED_KEY] = null;
        SettingsDBCache.saveSettings(obj);
        debug('_recordConnection(): remove item');
      }
    },

    /**
     * Update connection status.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.address - address of the device
     * @param {Boolean} options.connected - is connected or not
     * @param {Object} options.profileID - profile ID of the connection type
     */
    updateConnectionStatus(options) {
      debug(
        `updateConnectionStatus(): address = ${options.address}, connected = ${options.connected}, profileID = ${options.profileID}`
      );
      this.connectingAddress = null;

      // Update the profile in the cache of connected device info.
      this.updateConnectedDevices(options).then(
        connectedDevicesInfo => {
          debug(
            `${'updateConnectionStatus(): updateConnectedDevices() ' +
              'resolved with connectedDevicesInfo = '}${JSON.stringify(
              connectedDevicesInfo
            )}`
          );
          // Prepare latest data to check connected profile.
          const dataToCheckConnectedProfile = {
            address: options.address,
            connectedDevices: connectedDevicesInfo
          };

          /*
           * Fire 'connected'/'disconnected' event according to
           * the connection profile. Then, record connection.
           */
          let event = null;
          if (options.connected) {
            // Fire 'connected' event.
            event = {
              type: 'connected',
              detail: {
                address: options.address
              }
            };
            this.emitEvent(event);
            // Record connection.
            this.recordConnection('set', options.address);
          } else if (!this.manualConnection) {
            /*
             * If there is no profile connected,
             * we have to remove the record connection.
             * And fire 'disconnected' event for outer modules.
             */
            if (
              !this.hasConnectedProfileByAddress(dataToCheckConnectedProfile)
            ) {
              // Fire 'disconnected' event.
              event = {
                type: 'disconnected',
                detail: {
                  address: options.address
                }
              };
              this.emitEvent(event);
            }
          }

          // Fire 'profileChanged' event.
          let newProfiles = null;
          if (this.hasConnectedProfileByAddress(dataToCheckConnectedProfile)) {
            newProfiles =
              connectedDevicesInfo[options.address].connectedProfiles;
          }

          event = {
            type: 'profileChanged',
            detail: {
              address: options.address,
              profiles: newProfiles
            }
          };
          this.emitEvent(event);
        },
        reason => {
          debug(
            `${'updateConnectionStatus(): miss to update in rejected case, ' +
              'reason = '}${reason}`
          );
        }
      );
    },

    /**
     * It provides a convenient function for panel to connect with a device.
     * And the panel no need to care about connected device currently.
     * The method will disconnect current connected device first.
     * Then, it will start connecting a paired device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothDevice} device
     * @return {Promise}
     */
    connect(device) {
      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      // Disconnect current connected device first.
      debug(
        `connect(): Want to connect device address = ${device.address}, name = ${device.name}`
      );

      const connectedDevices = [];
      return this.getConnectedDevices().then(connectedDevicesInfo => {
        for (const address in connectedDevicesInfo) {
          if (connectedDevicesInfo[address].device === null) {
            const regetPairedDevice = this.getPairedDeviceByAddress(address);
            connectedDevices.push(regetPairedDevice);
            debug(
              `connect(): push getPairedDeviceByAddress in queue = ${JSON.stringify(
                regetPairedDevice
              )}`
            );
          } else {
            connectedDevices.push(connectedDevicesInfo[address].device);
            debug(
              `connect(): push device cache in queue = ${JSON.stringify(
                connectedDevices
              )}`
            );
          }
        }

        debug(
          `connect(): Will disconnect these connected devices = ${JSON.stringify(
            connectedDevices
          )}`
        );

        /*
         * Disconnect these connected device before
         * service to connect with new device.
         */
        return Promise.all(
          connectedDevices.map(connectedDevice =>
            this.disconnect(connectedDevice)
          )
        ).then(() => {
          /*
           * All connected devices is disconnected.
           * We can start to connect the new request.
           */
          debug(
            `connect(): Start to connect with wanted device address = ${device.address}`
          );
          return this.connectDevice(device).then(
            () => {
              debug('connect(): Resolved');
            },
            reason => {
              debug(`connect(): reason = ${reason}`);
              return Promise.reject(reason);
            }
          );
        });
      });
    },

    /**
     * The method will connect the input device with the device's adapter.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothDevice} device
     * @returns {Promise}
     */
    connectDevice(device) {
      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      // Save the connecting address
      this.connectingAddress = device.address;
      this.manualConnection = true;
      // Fire 'connecting' event.
      let event = {
        type: 'connecting',
        detail: {
          address: device.address
        }
      };
      this.emitEvent(event);
      debug('connect(): before start to connect, stop discovery first');

      /*
       * Note on Bluedroid stack, discovery has to be stopped before connect
       * (i.e., call stopDiscovery() before connect())
       * otherwise stack callbacks with connect failure.
       */
      return this.defaultAdapter.stopDiscovery().then(
        () => {
          debug(
            `${'connect(): start connecting device, address = '}${
              device.address
            }`
          );
          return this.defaultAdapter.connect(device).then(
            () => {
              debug(
                `connect(): resolve, already connected with address = ${device.address}`
              );
              this.manualConnection = false;
            },
            () => {
              // No available profiles are connected. Reset connecting address.
              this.connectingAddress = null;
              this.manualConnection = false;
              // Fire 'disconnected' event.
              event = {
                type: 'disconnected',
                detail: {
                  address: device.address
                }
              };
              this.emitEvent(event);
              debug('connect(): reject with connection failed');
              return Promise.reject(new Error('connection failed'));
            }
          );
        },
        () => {
          // Cannot connect with the device since stopDiscovery failed.
          this.connectingAddress = null;
          this.manualConnection = false;
          // Fire 'disconnected' event.
          event = {
            type: 'disconnected',
            detail: {
              address: device.address
            }
          };
          this.emitEvent(event);
          debug('connect(): reject with stop discovery failed');
          return Promise.reject(new Error('stop discovery failed'));
        }
      );
    },

    /**
     * The method will disconnect the input device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothDevice} device
     * @returns {Promise}
     */
    disconnect(device) {
      if (!this.defaultAdapter) {
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      return this.defaultAdapter.disconnect(device).then(
        () => {
          /*
           * Disconnect the audio device, we should not to auto connect
           * So remove the record of audio connection device
           */
          this.recordConnection('remove');
          debug('disconnect(): onsuccess(): resolve');
        },
        () => {
          debug('disconnect(): onerror(): reject with disconnect failed');
          return Promise.reject(new Error('disconnect failed'));
        }
      );
    },

    /**
     * The method will get all connected devices profiles
     * which we are interested in. Profile: HFP, A2DP.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @returns {Promise} resolve: connectedDevices
     * @returns {Promise} reject: reason
     */
    getConnectedDevicesFromPlatform() {
      // Get connected device via profiles HFP, A2DP
      return Promise.all(
        Object.keys(this.Profiles).map(profile =>
          this.getConnectedDevicesByProfile(this.Profiles[profile])
        )
      ).then(connectedDevices => {
        // Update each connected devices in map.
        const collectedConnectedDevicesByProfile = {};
        Object.keys(this.Profiles).forEach((profile, index) => {
          collectedConnectedDevicesByProfile[profile] = connectedDevices[index];
        });
        debug(
          `${'getConnectedDevicesFromPlatform(): ' +
            'collectedConnectedDevicesByProfile = '}${JSON.stringify(
            collectedConnectedDevicesByProfile
          )}`
        );
        return Promise.resolve(collectedConnectedDevicesByProfile);
      });
    },

    /**
     * The method will get connected device by inputed profile.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} profileID
     * @returns {Promise} resolve: the connected devices in array
     * @returns {Promise} reject: reason
     */
    getConnectedDevicesByProfile(profileID) {
      if (!this.defaultAdapter) {
        debug('getConnectedDevicesByProfile(): reject with no adapter');
        return Promise.reject(new Error('default adapter is not existed!!'));
      }

      if (this.defaultAdapter.state === 'disabled') {
        debug(
          'getConnectedDevicesByProfile(): resolve with empty array ' +
            'since it is impossible to connect with any device'
        );
        return Promise.reject(
          new Error('getConnectedDevices in disabled state')
        );
      }

      return this.defaultAdapter.getConnectedDevices(profileID).then(
        connectedDevice => {
          debug(
            `${'getConnectedDevicesByProfile(): resolved with ' +
              'connectedDevice = '}${JSON.stringify(connectedDevice)}`
          );
          return Promise.resolve(connectedDevice || []);
        },
        reason => {
          debug(
            `${'getConnectedDevicesByProfile(): rejected with ' +
              'reason = '}${reason}`
          );
          return Promise.reject(reason);
        }
      );
    },

    /**
     * Get device from paired devices by address.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} address
     */
    getPairedDeviceByAddress(address) {
      if (!this.defaultAdapter) {
        return null;
      }

      const pairedDevices = this.defaultAdapter.getPairedDevices();
      if (pairedDevices.length === 0) {
        return null;
      }
      for (const i in pairedDevices) {
        if (pairedDevices[i].address === address) {
          return pairedDevices[i];
        }
      }
      return null;
    },

    /**
     * Find out there is any profile still connected.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.connectedDevices - connected devices info
     * @param {String} options.address - the address of device
     */
    hasConnectedProfileByAddress(options) {
      if (!options.connectedDevices[options.address]) {
        return false;
      }

      let hasConnectedProfile = false;
      // eslint-disable-next-line guard-for-in
      for (const profileID in this.Profiles) {
        // eslint-disable-next-line prefer-destructuring
        const connectedProfiles =
          options.connectedDevices[options.address].connectedProfiles;
        if (connectedProfiles && connectedProfiles[profileID] === true) {
          hasConnectedProfile = true;
        }
      }
      return hasConnectedProfile;
    },

    /**
     * A function to emit event to each registered listener by the input type.
     *
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.type - type of event name
     * @param {Object} options.detail - the object pass to the listener
     */
    emitEvent(options) {
      this.listeners[options.type].forEach(listener => {
        listener(options);
      });
    },

    /**
     * The method will provide event listener for outer modules to regist.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {String} eventName
     * @param {Function} callback
     */
    addEventListener(eventName, callback) {
      // eslint-disable-next-line no-prototype-builtins
      if (
        callback &&
        Object.prototype.hasOwnProperty.call(this.listeners, eventName)
      ) {
        this.listeners[eventName].push(callback);
      }
    },

    /**
     * The method will provide event listener for outer modules to un-regist.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {String} eventName
     * @param {Function} callback
     */
    removeEventListener(eventName, callback) {
      if (
        callback &&
        Object.prototype.hasOwnProperty.call(this.listeners, eventName)
      ) {
        const index = this.listeners[eventName].indexOf(callback);
        if (index >= 0) {
          this.listeners[eventName].splice(index, 1);
        }
      }
    }
  };

  BluetoothConnectionManager.init();
  return BluetoothConnectionManager;
});
